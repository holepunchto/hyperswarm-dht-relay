const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { Query } = require('./query')
const { Server } = require('./server')
const { Socket } = require('./socket')
const { SocketSet } = require('./socket-set')

const m = require('./messages')
const crypto = require('./crypto')

class Node extends EventEmitter {
  constructor (socket, protocol, options = {}) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this.defaultKeyPair = options.keyPair || crypto.keyPair()

    this._servers = new Set()
    this._queries = new Set()
    this._connections = new SocketSet()

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
      .alive()
      .handshake(this.defaultKeyPair)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  connect (remotePublicKey, options = {}) {
    const { keyPair = this.defaultKeyPair } = options

    const id = crypto.randomId()

    const socket = new Socket(this._protocol, id, {
      publicKey: keyPair.publicKey,
      remotePublicKey
    })

    this._connections.add(id, socket.publicKey, socket)

    socket.once('close', () => this._connections.delete(id, socket.publicKey))

    this._protocol.connect({
      socket: id,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
      remotePublicKey
    })

    return socket
  }

  createServer (options = {}, listener) {
    if (typeof options === 'function') {
      listener = options
      options = {}
    }

    const server = new Server(this, this._socket, this._protocol, options)
    this._servers.add(server)

    server.once('close', () => this._servers.delete(server))

    if (listener) server.on('connection', listener)

    return server
  }

  lookup (topic) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)
    this._queries.add(query)

    query.once('close', () => this._queries.delete(query))

    this._protocol.lookup({ id: query.id, topic })

    return query
  }

  announce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)
    this._queries.add(query)

    query.once('close', () => this._queries.delete(query))

    this._protocol.announce({ id: query.id, topic, keyPair })

    return query
  }

  unannounce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)
    this._queries.add(query)

    query.once('close', () => this._queries.delete(query))

    this._protocol.unannounce({ id: query.id, topic, keyPair })

    return query.finished()
  }

  async destroy () {
    await this._socket.destroy()
  }

  static fromTransport ({ Socket }, socket, opts) {
    return new Node(new Socket(socket), null, opts)
  }

  static keyPair (seed) {
    return crypto.keyPair(seed)
  }
}

module.exports = {
  Node
}

function onError (err) {
  this.emit('error', err)
}

async function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)

  this._protocol
    .off('connection', this._onConnection)
    .off('destroy', this._onDestroy)
    .off('data', this._onData)

  for (const server of this._servers) await server.close()
  for (const query of this._queries) query.destroy()
  for (const socket of this._connections) socket.destroy()

  this.emit('close')
}

function onConnection (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) {
    socket.handshakeHash = message.handshakeHash
    socket.resume()
  }
}

function onDestroy (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}
