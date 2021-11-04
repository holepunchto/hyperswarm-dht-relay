const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')
const { PeerDiscovery } = require('./peer-discovery')
const { PeerInfo } = require('./peer-info')

class Peer extends EventEmitter {
  constructor (socket) {
    super()

    this._connections = new Map()
    this._heartbeat = null
    this._protocol = new Protocol(socket)

    this._protocol
      .on('error', (err) => this._onError(err))
      .on('close', () => this._onClose())
      .on('ping', () => this._onPing())
      .on('connected', (message) => this._onConnected(message))
      .on('destroy', (message) => this._onDestroy(message))
      .on('connection', (message) => this._onConnection(message))
      .on('data', (message) => this._onData(message))
      .listen()

    this.ready = async function ready () {
      await this._protocol.ready()
      return this
    }

    this.closed = async function closed () {
      await this._protocol.closed()
    }
  }

  _onError (err) {
    this.emit('error', err)
  }

  _onClose () {
    if (this._heartbeat) clearTimeout(this._heartbeat)
    this.emit('close')
  }

  _onPing () {
    this._protocol.pong()
    if (this._heartbeat) clearTimeout(this._heartbeat)
    this._heartbeat = setTimeout(
      () => this._protocol.close(),
      3 * 15 * 1000
    )
  }

  _onConnected (message) {
    const key = message.remotePublicKey.toString('hex')

    if (!this._connections.has(key)) return

    const socket = this._connections.get(key)

    socket.publicKey = message.publicKey
    socket.remotePublicKey = message.remotePublicKey
    socket.handshakeHash = message.handshakeHash
    socket.emit('open')
  }

  _onDestroy (message) {
    const key = message.remotePublicKey.toString('hex')

    if (!this._connections.has(key)) return

    const socket = this._connections.get(key)

    socket.destroy()
  }

  _onConnection (message) {
    const key = message.remotePublicKey.toString('hex')

    if (this._connections.has(key)) return

    const socket = new Socket(this._protocol, message)

    this._connections.set(key, socket)

    socket.on('close', () => this._connections.delete(key))

    this.emit('connection', socket, new PeerInfo(message.remotePublicKey))
  }

  _onData (message) {
    const key = message.remotePublicKey.toString('hex')

    if (!this._connections.has(key)) return

    const socket = this._connections.get(key)

    socket.push(message.data)
  }

  join (topic, options = {}) {
    const { server = true, client = true } = options

    this._protocol.join({ topic, options: { server, client } })

    return new PeerDiscovery(topic, this._protocol)
  }

  leave (topic) {
    this._protocol.leave({ topic })
  }

  async flush () {
    this._protocol.flush()

    await new Promise((resolve) => {
      const onFlushed = (message) => {
        if (!message.topic) {
          this._protocol.off('flushed', onFlushed)
          resolve()
        }
      }

      this._protocol.on('flushed', onFlushed)
    })
  }

  connect (remotePublicKey) {
    const key = remotePublicKey.toString('hex')

    if (this._connections.has(key)) return this._connections.get(key)

    const socket = new Socket(this._protocol, { remotePublicKey })

    this._connections.set(key, socket)

    socket.on('close', () => this._connections.delete(key))

    this._protocol.connect({ remotePublicKey })

    return socket
  }

  async close () {
    await this._protocol.close()
    await this.closed()
  }
}

module.exports = {
  Peer
}
