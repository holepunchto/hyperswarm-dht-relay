const { FirewallProxy } = require('./firewall-proxy')
const { HandshakeProxy } = require('./handshake-proxy')
const { SigneeProxy } = require('./signee-proxy')
const { StreamProxy } = require('./stream-proxy')

const crypto = require('./crypto')
const { nextId } = require('./id')

class ServerProxy {
  constructor (node, protocol, alias, remoteAlias, keyPair) {
    this._node = node
    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias
    this._keyPair = keyPair
    this._custodial = keyPair.secretKey !== null

    this._firewall = new FirewallProxy(node, protocol, alias)
    this._signee = new SigneeProxy(
      node,
      protocol,
      crypto.hash(keyPair.publicKey),
      remoteAlias
    )

    this._server = node._dht.createServer({
      firewall: this._custodial ? this._firewall._deny : null,
      createHandshake: this._custodial ? null : createHandshake.bind(this),
      createSecretStream: this._custodial ? null : createSecretStream.bind(this)
    })

    this._onStreamClose = onStreamClose.bind(this)

    this._protocol._stream
      .once('close', this._onStreamClose)

    this._onServerClose = onServerClose.bind(this)
    this._onServerListening = onServerListening.bind(this)
    this._onServerConnection = onServerConnection.bind(this)

    this._server
      .once('close', this._onServerClose)
      .once('listening', this._onServerListening)
      .on('connection', this._onServerConnection)
      .listen({
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey
      }, {
        signAnnounce: this._custodial ? null : this._signee._signAnnounce,
        signUnannounce: this._custodial ? null : this._signee._signUnannounce
      })

    this._onClose = onClose.bind(this)
  }
}

module.exports = {
  ServerProxy
}

function onStreamClose () {
  this._server.close()
}

function onServerClose () {
  this._protocol.closed.send({ alias: this._alias })

  this._server
    .off('listening', this._onServerListening)
    .off('connection', this._onServerConnection)

  this._node._servers.delete(this._remoteAlias)
}

function onServerListening () {
  const address = this._server.address()

  this._protocol.listening.send({
    alias: this._alias,
    remoteAlias: this._remoteAlias,
    host: address.host,
    port: address.port
  })
}

function onServerConnection (stream) {
  const alias = nextId()

  this._node._connecting.set(alias, stream)

  const onError = (err) => {
    this._protocol.destroy.send({ alias, error: err.message })
  }

  const onClose = () => {
    stream
      .off('error', onError)
      .off('end', onEnd)
      .off('data', onData)

    this._node._connecting.delete(alias, stream)
  }

  const onEnd = () => {
    this._protocol.end.send({ alias })
  }

  const onData = (data) => {
    this._protocol.data.send({ alias, data: [data] })
  }

  stream
    .once('error', onError)
    .once('close', onClose)
    .once('end', onEnd)
    .on('data', onData)

  this._protocol.connection.send({
    custodial: this._custodial,
    alias,
    serverAlias: this._alias,
    remotePublicKey: stream.remotePublicKey,
    handshakeHash: stream.handshakeHash,
    handshakeId: stream.handshakeId
  })
}

function onClose () {
  this._server.close()
}

function createHandshake (keyPair, remotePublicKey) {
  const isInitiator = !!remotePublicKey

  const id = nextId()

  const handshake = new HandshakeProxy(
    this._node,
    this._protocol,
    id,
    null,
    this._alias,
    isInitiator,
    keyPair,
    remotePublicKey
  )

  this._node._handshakes.set(id, handshake)

  return handshake
}

function createSecretStream (isInitiator, rawStream, options) {
  return new StreamProxy(
    this._protocol,
    null,
    null,
    isInitiator,
    rawStream,
    options
  )
}
