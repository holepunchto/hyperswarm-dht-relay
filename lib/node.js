const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')
const { Server } = require('./server')

class Node extends EventEmitter {
  constructor (socket, protocol) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._servers = new Set()
    this._connections = new Map()

    this._socket
      .on('error', (err) => this._onError(err))
      .on('close', () => this._onClose())

    this._protocol
      .on('connection', (message) => this._onConnection(message))
      .on('destroy', (message) => this._onDestroy(message))
      .on('data', (message) => this._onData(message))

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  _onError (err) {
    this.emit('error', err)
  }

  _onClose () {
    this._protocol.removeAllListeners()
    this.emit('close')
  }

  _onConnection (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) {
      socket.publicKey = message.publicKey
      socket.remotePublicKey = message.remotePublicKey
      socket.handshakeHash = message.handshakeHash
      socket.resume()
    }
  }

  _onDestroy (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) socket.destroy()
  }

  _onData (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) socket.push(message.data)
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

  createServer () {
    const server = new Server(this._socket, this._protocol)
    this._servers.add(server)
    server.on('close', () => this._servers.delete(server))
    return server
  }

  async destroy () {
    await this._socket.destroy()
  }

  static fromTransport ({ Socket }, socket) {
    return new Node(new Socket(socket))
  }
}

module.exports = {
  Node
}
