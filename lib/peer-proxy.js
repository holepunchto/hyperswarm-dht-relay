const EventEmitter = require('events')
const Hyperswarm = require('hyperswarm')

const { Protocol } = require('./protocol')

class PeerProxy extends EventEmitter {
  constructor (socket, options) {
    super()

    this._options = options
    this._swarm = null
    this._connections = new Map()
    this._topics = new Map()
    this._isAlive = true
    this._heartbeat = setInterval(() => this._onPing(), 15 * 1000)
    this._protocol = new Protocol(socket)

    this._protocol
      .on('error', (err) => this._onError(err))
      .on('close', () => this._onClose())
      .on('pong', () => { this._isAlive = true })
      .on('listen', (message) => this._onListen(message))
      .on('connect', (message) => this._onConnect(message))
      .on('destroy', (message) => this._onDestroy(message))
      .on('join', (message) => this._onJoin(message))
      .on('data', (message) => this._onData(message))
      .on('flush', (message) => this._onFlush(message))
      .on('refresh', (message) => this._onRefresh(message))

    const closing = new Promise((resolve) => this.once('close', () => resolve()))

    this.closed = function closed () {
      return closing
    }
  }

  _onError (err) {
    this.emit('error', err)
  }

  async _onClose () {
    clearInterval(this._heartbeat)
    for (const socket of this._connections.values()) socket.destroy()
    for (const topic of this._topics.values()) await topic.destroy()
    if (this._swarm) await this._swarm.destroy()
    this.emit('close')
  }

  _onPing () {
    if (this._isAlive) {
      this._isAlive = false
      this._protocol.ping()
    } else {
      this._protocol.close()
    }
  }

  _onListen () {
    if (this._swarm) return

    this._swarm = new Hyperswarm(this._options.swarm)
    this._swarm
      .on('connection', (socket, peer) => this._onConnection(socket, peer))
      .listen()
  }

  async _onConnection (socket, peer) {
    const key = peer.publicKey.toString('hex')

    if (this._connections.has(key)) return socket.destroy()

    this._connections.set(key, socket)

    await this._protocol.connection(socket)

    socket
      .on('error', (err) => this._protocol.error(err))
      .on('close', () => {
        this._connections.delete(key)
        this._protocol.destroy(socket)
      })
      .on('data', (data) => this._protocol.data({ remotePublicKey: socket.remotePublicKey, data }))
  }

  _onConnect (message) {
    if (!this._swarm) return

    const key = message.remotePublicKey.toString('hex')

    if (this._connections.has(key)) return

    const socket = this._swarm.dht.connect(message.remotePublicKey)

    this._connections.set(key, socket)

    socket
      .on('open', () => this._protocol.connected(socket))
      .on('error', (err) => this._protocol.error(err))
      .on('close', () => {
        this._connections.delete(key)
        this._protocol.destroy(socket)
      })
      .on('data', (data) => this._protocol.data({ remotePublicKey: socket.remotePublicKey, data }))
  }

  _onDestroy (message) {
    if (!this._swarm) return

    const key = message.remotePublicKey.toString('hex')

    if (!this._connections.has(key)) return

    const socket = this._connections.get(key)

    socket.destroy()
  }

  _onJoin (message) {
    if (!this._swarm) return

    const key = message.topic.toString('hex')

    if (this._topics.has(key)) return

    const discovery = this._swarm.join(message.topic, message.options)
    this._topics.set(key, discovery)
  }

  _onLeave (message) {
    if (!this._swarm) return

    const key = message.topic.toString('hex')

    if (!this._topics.has(key)) return

    this._topics.delete(key)
    this._swarm.leave(message.topic)
  }

  _onData (message) {
    const key = message.remotePublicKey.toString('hex')

    if (!this._connections.has(key)) return

    const socket = this._connections.get(key)

    socket.write(message.data)
  }

  async _onFlush (message) {
    if (this._swarm) {
      if (message.topic) {
        const key = message.topic.toString('hex')

        if (this._topics.has(key)) {
          const discovery = this._topics.get(key)
          await discovery.flushed()
        }
      } else {
        await this._swarm.flush()
      }
    }

    await this._protocol.flushed(message)
  }

  async _onRefresh (message) {
    if (!this._swarm) return

    const key = message.topic.toString('hex')

    if (!this._topics.has(key)) return

    const discovery = this._topics.get(key)
    await discovery.refresh(message)
  }

  async close () {
    await this._protocol.close()
    await this.closed()
  }
}

module.exports = {
  PeerProxy
}
