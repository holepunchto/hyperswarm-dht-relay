const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { ServerProxy } = require('./server-proxy')

class NodeProxy extends EventEmitter {
  constructor (dht, socket, protocol) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._servers = new Set()
    this._connections = new Map()

    this._socket
      .on('error', (err) => this._onError(err))
      .on('close', () => this._onClose())

    this._protocol
      .on('connect', (message) => this._onConnect(message))
      .on('listen', (message) => this._onListen(message))
      .on('destroy', (message) => this._onDestroy(message))
      .on('data', (message) => this._onData(message))
  }

  _onError (err) {
    this.emit('error', err)
  }

  async _onClose () {
    this._protocol.removeAllListeners()
    for (const server of this._servers) await server.close()
    for (const socket of this._connections.values()) socket.destroy()
    this.emit('close')
  }

  _onConnect (message) {
    const key = message.remotePublicKey.toString('hex')

    if (this._connections.has(key)) return

    const socket = this._dht.connect(message.remotePublicKey)

    this._connections.set(key, socket)

    socket
      .on('open', () => this._protocol.connection(socket))
      .on('error', (err) => this._protocol.error(err))
      .on('close', () => {
        this._connections.delete(key)
        this._protocol.destroy(socket)
      })
      .on('data', (data) => this._protocol.data({ remotePublicKey: socket.remotePublicKey, data }))
  }

  async _onListen () {
    const server = new ServerProxy(this._dht, this._socket, this._protocol)
    this._servers.add(server)
    server.on('close', () => this._servers.delete(server))
  }

  _onDestroy (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) return socket.destroy()
  }

  _onData (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) socket.write(message.data)
  }

  async destroy () {
    await this._protocol.close()
  }
}

module.exports = {
  NodeProxy
}
