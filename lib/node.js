const EventEmitter = require('events')
const buffer = require('b4a')
const Handshake = require('noise-handshake')
const SecretStream = require('@hyperswarm/secret-stream')
const { NS } = require('@hyperswarm/dht/lib/constants')
const curve = require('noise-curve-ed')
const sodium = require('sodium-universal')

const { Protocol } = require('./protocol')
const { Query } = require('./query')
const { QuerySet } = require('./query-set')
const { Server } = require('./server')
const { ServerSet } = require('./server-set')
const { Socket } = require('./socket')
const { SocketSet } = require('./socket-set')

const m = require('./messages')
const crypto = require('./crypto')

const NOISE_PROLOUGE = NS.PEER_HANDSHAKE

class Node extends EventEmitter {
  constructor (socket, protocol, options = {}) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._custodial = options.custodial !== false

    this.defaultKeyPair = options.keyPair || crypto.keyPair()

    this._servers = new ServerSet()
    this._queries = new QuerySet()
    this._connections = new SocketSet()

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)
    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('listening', this._onListening)
      .on('closed', this._onClosed)
      .on('connection', this._onConnection)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
      .on('result', this._onResult)
      .on('finished', this._onFinished)
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

    this._connections.add(id, socket.publicKey, socket)

    socket.once('close', () => this._connections.delete(id, socket.publicKey))

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

    this._handshake(keyPair, socket, encryptedSocket)

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
    this._queries.add(query.id, query)

    query.once('close', () => this._queries.delete(query.id))

    this._protocol.lookup({ id: query.id, topic })

    return query
  }

  announce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)
    this._queries.add(query.id, query)

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
    this._queries.add(query.id, query)

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

  _handshake (keyPair, socket, encryptedSocket) {
    const handshake = new Handshake('IK', true, keyPair, { curve })

    handshake.initialise(NOISE_PROLOUGE, socket.remotePublicKey)

    const onNoiseRequest = async (message) => {
      if (
        buffer.equals(socket._id, message.socket) &&
          buffer.equals(socket.publicKey, message.publicKey)
      ) {
        switch (message.type) {
          case 0: { // send
            const data = handshake.send(message.data)

            await this._protocol.noiseResponse({
              socket: message.socket,
              publicKey: message.publicKey,
              data
            })
            break
          }

          case 1: { // recv
            const data = handshake.recv(message.data)

            const remoteId = SecretStream.id(handshake.hash, true)

            const holepunchSecret = buffer.allocUnsafe(32)

            sodium.crypto_generichash(holepunchSecret, handshake.hash, NS.PEER_HOLEPUNCH)

            await this._protocol.noiseResponse({
              socket: message.socket,
              publicKey: message.publicKey,
              data: buffer.concat([data, remoteId, holepunchSecret])
            })
            break
          }
        }

        if (handshake.complete) {
          this._protocol.off('noiseRequest', onNoiseRequest)

          encryptedSocket.start(socket, {
            handshake: {
              publicKey: socket.publicKey,
              remotePublicKey: socket.remotePublicKey,
              hash: handshake.hash,
              tx: handshake.tx,
              rx: handshake.rx
            }
          })
        }
      }
    }

    this._protocol.on('noiseRequest', onNoiseRequest)
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

  for (const server of this._servers) await server.close()
  for (const query of this._queries) query.destroy()
  for (const socket of this._connections) socket.destroy()

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
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) {
    if (message.handshakeHash) socket.handshakeHash = message.handshakeHash
    socket.resume()
  } else {
    const server = this._servers.get(message.publicKey)

    if (server) server._onConnection(message)
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

function onResult (message) {
  const query = this._queries.get(message.id)

  if (query) query._onResult(message)
}

function onFinished (message) {
  const query = this._queries.get(message.id)

  if (query) query._onFinished(message)
}
