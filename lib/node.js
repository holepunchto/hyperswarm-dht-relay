const EventEmitter = require('events')
const Trie = require('turbo-hash-map')
const SecretStream = require('@hyperswarm/secret-stream')

const { Handshake } = require('./handshake')
const { Protocol } = require('./protocol')
const { Query } = require('./query')
const { Server } = require('./server')
const { Socket } = require('./socket')

const m = require('./messages')
const crypto = require('./crypto')

class Node extends EventEmitter {
  constructor (socket, protocol, options = {}) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._custodial = options.custodial !== false

    this.defaultKeyPair = options.keyPair || crypto.keyPair()

    this._servers = new Trie()
    this._queries = new Trie()
    this._connections = new Trie()
    this._handshakes = new Trie()

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onOpen = onOpen.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)
    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)
    this._onSignAnnounce = onSignAnnounce.bind(this)
    this._onSignUnannounce = onSignUnannounce.bind(this)
    this._onNoiseRequest = onNoiseRequest.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('listening', this._onListening)
      .on('closed', this._onClosed)
      .on('connection', this._onConnection)
      .on('open', this._onOpen)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
      .on('result', this._onResult)
      .on('finished', this._onFinished)
      .on('signAnnounce', this._onSignAnnounce)
      .on('signUnannounce', this._onSignUnannounce)
      .on('noiseRequest', this._onNoiseRequest)
      .alive()
      .handshake({
        publicKey: this.defaultKeyPair.publicKey,
        secretKey: this._custodial ? this.defaultKeyPair.secretKey : null
      })

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

    this._connections.set(id, socket)

    socket.once('close', () => this._connections.delete(id))

    this._protocol.connect({
      socket: id,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null,
      remotePublicKey
    })

    if (this._custodial) return socket

    const encryptedSocket = new SecretStream(true, null, {
      publicKey: keyPair.publicKey,
      remotePublicKey,
      autoStart: false
    })

    const handshake = new Handshake(this._protocol, id, true, keyPair, remotePublicKey)

    this._handshakes.set(id, handshake)

    handshake.once('complete', () => {
      this._handshakes.delete(id)

      encryptedSocket.start(socket, {
        handshake: {
          publicKey: socket.publicKey,
          remotePublicKey: socket.remotePublicKey,
          hash: handshake.hash,
          tx: handshake.tx,
          rx: handshake.rx
        }
      })
    })

    return encryptedSocket
  }

  createServer (options = {}, listener) {
    if (typeof options === 'function') {
      listener = options
      options = {}
    }

    options = { ...options, custodial: this._custodial }

    const server = new Server(this, this._socket, this._protocol, options)

    server.once('close', () => this._servers.delete(server.publicKey))

    if (listener) server.on('connection', listener)

    return server
  }

  lookup (topic) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    query.once('close', () => this._queries.delete(query.id))

    this._protocol.lookup({ id: query.id, topic })

    return query
  }

  announce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    query.once('close', () => this._queries.delete(query.id))

    this._protocol.announce({
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    return query
  }

  unannounce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    query.once('close', () => this._queries.delete(query.id))

    this._protocol.unannounce({
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    return query.finished()
  }

  async destroy () {
    await this._socket.destroy()
  }

  static fromTransport ({ Socket }, socket, options) {
    return new Node(new Socket(socket), null, options)
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
    .off('listening', this._onListening)
    .off('closed', this._onClosed)
    .off('connection', this._onConnection)
    .off('destroy', this._onDestroy)
    .off('data', this._onData)
    .off('result', this._onResult)
    .off('finished', this._onFinished)

  for (const server of this._servers.values()) await server.close()
  for (const query of this._queries.values()) query.destroy()
  for (const socket of this._connections.values()) socket.destroy()

  this.emit('close')
}

function onListening (message) {
  const server = this._servers.get(message.publicKey)

  if (server) server._onListening(message)
}

function onClosed (message) {
  const server = this._servers.get(message.publicKey)

  if (server) server._onClosed(message)
}

function onConnection (message) {
  const server = this._servers.get(message.publicKey)

  if (server) server._onConnection(message)
}

function onOpen (message) {
  const socket = this._connections.get(message.socket)

  if (socket) {
    if (message.handshakeHash) {
      socket.handshakeHash = message.handshakeHash
    }

    socket.resume()
  }
}

function onDestroy (message) {
  const socket = this._connections.get(message.socket)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket)

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}

function onResult (message) {
  const query = this._queries.get(message.id)

  if (query) query._onResult(message)
}

function onFinished (message) {
  const query = this._queries.get(message.id)

  if (query) query._onFinished(message)
}

function onSignAnnounce (message) {
  const server = this._servers.get(message.publicKey)

  if (server && server._signing) server._signing._onSignAnnounce(message)
}

function onSignUnannounce (message) {
  const server = this._servers.get(message.publicKey)

  if (server && server._signing) server._signing._onSignUnannounce(message)
}

function onNoiseRequest (message) {
  const handshake = this._handshakes.get(message.socket)

  if (handshake) return handshake._onNoiseRequest(message)

  const server = this._servers.get(message.publicKey)

  if (server) {
    const handshake = new Handshake(this._protocol, message.socket, false, server._keyPair, message.publicKey)

    this._handshakes.set(message.socket, handshake)

    handshake._onNoiseRequest(message)
  }
}
