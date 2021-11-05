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

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('connection', this._onConnection)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  connect (remotePublicKey) {
    const key = remotePublicKey.toString('hex')

    if (this._connections.has(key)) return this._connections.get(key)

    const socket = new Socket(this._protocol, { remotePublicKey })

    this._connections.set(key, socket)

    socket.once('close', () => this._connections.delete(key))

    this._protocol.connect({ remotePublicKey })

    return socket
  }

  createServer () {
    const server = new Server(this._socket, this._protocol)
    this._servers.add(server)

    server.once('close', () => this._servers.delete(server))

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

function onError (err) {
  this.emit('error', err)
}

function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)

  this._protocol
    .off('connection', this._onConnection)
    .off('destroy', this._onDestroy)
    .off('data', this._onData)

  this.emit('close')
}

function onConnection (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) {
    socket.publicKey = message.publicKey
    socket.remotePublicKey = message.remotePublicKey
    socket.handshakeHash = message.handshakeHash
    socket.resume()
  }
}

function onDestroy (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) socket.push(message.data)
}
