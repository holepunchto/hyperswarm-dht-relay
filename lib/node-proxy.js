const EventEmitter = require('events')
const { encode } = require('compact-encoding')

const { HandshakeProxy } = require('./handshake-proxy')
const { Protocol } = require('./protocol')
const { ServerProxy } = require('./server-proxy')
const { SigneeProxy } = require('./signee-proxy')
const { SocketProxy } = require('./socket-proxy')

const m = require('./messages')
const { nextId } = require('./id')

class NodeProxy extends EventEmitter {
  constructor (dht, socket, protocol, defaultKeyPair) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._defaultKeyPair = defaultKeyPair

    this._servers = new Map()
    this._queries = new Map()
    this._connections = new Map()
    this._handshakes = new Map()
    this._signatures = new Map()

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onConnect = onConnect.bind(this)
    this._onConnected = onConnected.bind(this)
    this._onDeny = onDeny.bind(this)
    this._onAccept = onAccept.bind(this)
    this._onListen = onListen.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)
    this._onQuery = onQuery.bind(this)
    this._onLookup = onLookup.bind(this)
    this._onAnnounce = onAnnounce.bind(this)
    this._onUnannounce = onUnannounce.bind(this)
    this._onServerClose = onServerClose.bind(this)
    this._onSignature = onSignature.bind(this)
    this._onNoiseReply = onNoiseReply.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('connect', this._onConnect)
      .on('connected', this._onConnected)
      .on('deny', this._onDeny)
      .on('accept', this._onAccept)
      .on('listen', this._onListen)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
      .on('lookup', this._onLookup)
      .on('announce', this._onAnnounce)
      .on('unannounce', this._onUnannounce)
      .on('close', this._onServerClose)
      .on('signature', this._onSignature)
      .on('noiseReply', this._onNoiseReply)
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

  for (const server of this._servers.values()) await server.close()
  for (const query of this._queries.values()) query.destroy()
  for (const socket of this._connections.values()) socket.destroy()

  this.emit('close')
}

function onConnect (message) {
  const remoteAlias = message.alias
  const alias = nextId()

  const custodial = message.secretKey !== null

  const socket = this._dht.connect(message.remotePublicKey, {
    keyPair: {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    },
    createHandshake: custodial
      ? null
      : createHandshake.bind(this, remoteAlias),
    createSecretStream: custodial
      ? null
      : createSecretStream.bind(this, alias, remoteAlias)
  })

  this._connections.set(remoteAlias, socket)

  const onError = async (err) => {
    this.emit('error', err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('open', onOpen)
      .off('data', onData)

    this._connections.delete(remoteAlias)

    await this._protocol.destroy({ alias })
  }

  const onOpen = async () => {
    await this._protocol.connected({
      alias,
      remoteAlias,
      handshakeHash: socket.handshakeHash,
      handshakeId: socket.handshakeId
    })
  }

  const onData = async (data) => {
    await this._protocol.data({ alias, data: [data] })
  }

  socket
    .on('error', onError)
    .on('close', onClose)
    .on('open', onOpen)
    .on('data', onData)
}

function onConnected (message) {
  for (const server of this._servers.values()) {
    const socket = server._connecting.get(message.remoteAlias)

    if (socket) return server._onConnected(message)
  }
}

function onDeny (message) {
  for (const server of this._servers.values()) {
    const request = server._firewall._requests.get(message.id)

    if (request) return server._firewall._onDeny(message)
  }
}

function onAccept (message) {
  for (const server of this._servers.values()) {
    const request = server._firewall._requests.get(message.id)

    if (request) return server._firewall._onAccept(message)
  }
}

function onListen (message) {
  const remoteAlias = message.alias
  const alias = nextId()

  const server = new ServerProxy(this, this._socket, this._protocol, alias, remoteAlias, message)

  this._servers.set(remoteAlias, server)

  server.once('close', () => this._servers.delete(remoteAlias))
}

function onDestroy (message) {
  let socket = this._connections.get(message.alias)

  if (socket === undefined) {
    for (const server of this._servers.values()) {
      socket = server._connections.get(message.alias)

      if (socket) {
        break
      }
    }
  }

  if (socket) {
    socket.destroy(message.error && new Error(message.error))
  }
}

function onData (message) {
  let socket = this._connections.get(message.alias)

  if (socket === undefined) {
    for (const server of this._servers.values()) {
      socket = server._connections.get(message.alias)

      if (socket) {
        break
      }
    }
  }

  if (socket) {
    for (const chunk of message.data) socket.write(chunk)
  }
}

function onQuery (message, query, encoding) {
  this._queries.set(message.id, query)

  const onError = async (err) => {
    this.emit('error', err)
  }

  const onClose = async () => {
    query
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._queries.delete(message.id)

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
  const custodial = message.secretKey !== null

  const signee = new SigneeProxy(
    this._protocol,
    this._signatures,
    message.topic,
    message.id
  )

  this._onQuery(
    message,
    this._dht.announce(message.topic, {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    }, [], {
      signAnnounce: custodial ? null : signee.signAnnounce,
      signUnannounce: custodial ? null : signee.signUnannounce
    }),
    m.announcers
  )
}

function onUnannounce (message) {
  const custodial = message.secretKey !== null

  const signee = new SigneeProxy(
    this._protocol,
    this._signatures,
    message.topic,
    message.id
  )

  this._onQuery(
    message,
    this._dht.lookupAndUnannounce(message.topic, {
      publicKey: message.publicKey,
      secretKey: message.secretKey
    }, {
      signAnnounce: custodial ? null : signee.signAnnounce,
      signUnannounce: custodial ? null : signee.signUnannounce
    }),
    m.announcers
  )
}

function onServerClose (message) {
  const server = this._servers.get(message.alias)

  if (server) server.close()
}

function onSignature (message) {
  const signature = this._signatures.get(message.id)

  if (signature) signature.resolve(message.signature)
}

function onNoiseReply (message) {
  const handshake = this._handshakes.get(message.id)

  if (handshake) handshake._onNoiseReply(message)
}

function createHandshake (remoteSocketAlias, keyPair, remotePublicKey) {
  const isInitiator = !!remotePublicKey

  const id = nextId()

  const handshake = new HandshakeProxy(
    this._protocol,
    id,
    remoteSocketAlias,
    null,
    isInitiator,
    keyPair,
    remotePublicKey
  )

  this._handshakes.set(id, handshake)

  return handshake
}

function createSecretStream (alias, remoteAlias, isInitiator, rawStream, options) {
  return new SocketProxy(
    this._protocol,
    alias,
    remoteAlias,
    isInitiator,
    rawStream,
    options
  )
}
