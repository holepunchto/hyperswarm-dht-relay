const EventEmitter = require('events')
const { encode } = require('compact-encoding')

const { NoiseProxy } = require('./noise-proxy')
const { Protocol } = require('./protocol')
const { ServerProxy } = require('./server-proxy')
const { ServerSet } = require('./server-set')
const { SocketSet } = require('./socket-set')

const m = require('./messages')

class NodeProxy extends EventEmitter {
  constructor (dht, socket, protocol, defaultKeyPair) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._defaultKeyPair = defaultKeyPair

    this._servers = new ServerSet()
    this._queries = new Set()
    this._connections = new SocketSet()
    this._noise = new NoiseProxy(this._protocol)

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onConnect = onConnect.bind(this)
    this._onListen = onListen.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)
    this._onQuery = onQuery.bind(this)
    this._onLookup = onLookup.bind(this)
    this._onAnnounce = onAnnounce.bind(this)
    this._onUnannounce = onUnannounce.bind(this)
    this._onServerClose = onServerClose.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('connect', this._onConnect)
      .on('listen', this._onListen)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
      .on('lookup', this._onLookup)
      .on('announce', this._onAnnounce)
      .on('unannounce', this._onUnannounce)
      .on('close', this._onServerClose)
  }

  destroy () {
    this._socket.destroy()
  }
}

module.exports = {
  NodeProxy
}

function onError (err) {
  this.emit('error', err)
}

async function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)

  this._protocol
    .off('connect', this._onConnect)
    .off('listen', this._onListen)
    .off('destroy', this._onDestroy)
    .off('data', this._onData)
    .off('lookup', this._onLookup)
    .off('announce', this._onAnnounce)
    .off('unannounce', this._onUnannounce)
    .off('close', this._onServerClose)

  for (const server of this._servers) await server.close()
  for (const query of this._queries) query.destroy()
  for (const socket of this._connections) socket.destroy()

  this.emit('close')
}

function onConnect (message) {
  const id = message.socket
  const custodial = message.secretKey !== null

  const socket = this._dht.connect(message.remotePublicKey, {
    keyPair: {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    },
    createHandshake: custodial ? null : this._noise.createHandshake(id),
    createSecretStream: custodial ? null : this._noise.createSecretStream(id)
  })

  this._connections.add(id, socket.publicKey, socket)

  const onError = async (err) => {
    await this._protocol.error(err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('open', onOpen)
      .off('data', onData)

    this._connections.delete(id, socket.publicKey)

    await this._protocol.destroy({
      socket: id,
      publicKey: socket.publicKey
    })
  }

  const onOpen = async () => {
    await this._protocol.connection({
      socket: id,
      publicKey: socket.publicKey,
      remotePublicKey: socket.remotePublicKey,
      handshakeHash: socket.handshakeHash
    })
  }

  const onData = async (data) => {
    await this._protocol.data({
      socket: id,
      publicKey: socket.publicKey,
      data: [data]
    })
  }

  socket
    .on('error', onError)
    .on('close', onClose)
    .on('open', onOpen)
    .on('data', onData)
}

function onListen (message) {
  const server = new ServerProxy(this._dht, this._socket, this._protocol, message)

  this._servers.add(server.publicKey, server)

  server.once('close', () => this._servers.delete(server.publicKey))
}

function onDestroy (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) return socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) {
    for (const chunk of message.data) socket.write(chunk)
  }
}

function onQuery (message, query, encoding) {
  this._queries.add(query)

  const onError = async (err) => {
    await this._protocol.error(err)
  }

  const onClose = async () => {
    query
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._queries.delete(query)

    await this._protocol.finished(message)
  }

  const onData = async (data) => {
    await this._protocol.result({
      id: message.id,
      data: encode(encoding, data)
    })
  }

  query
    .on('error', onError)
    .on('close', onClose)
    .on('data', onData)
}

function onLookup (message) {
  this._onQuery(
    message,
    this._dht.lookup(message.topic),
    m.announcers
  )
}

function onAnnounce (message) {
  this._onQuery(
    message,
    this._dht.announce(message.topic, {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    }),
    m.announcers
  )
}

function onUnannounce (message) {
  this._onQuery(
    message,
    this._dht.lookupAndUnannounce(message.topic, {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    }),
    m.announcers
  )
}

function onServerClose (message) {
  const server = this._servers.get(message.publicKey)

  if (server) server.close()
}
