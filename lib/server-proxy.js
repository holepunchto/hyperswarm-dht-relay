const EventEmitter = require('events')

const { FirewallProxy } = require('./firewall-proxy')
const { HandshakeProxy } = require('./handshake-proxy')
const { SigneeProxy } = require('./signee-proxy')
const { StreamProxy } = require('./stream-proxy')

const crypto = require('./crypto')
const { nextId } = require('./id')

class ServerProxy extends EventEmitter {
  constructor (node, stream, protocol, alias, remoteAlias, keyPair) {
    super()

    this._node = node
    this._stream = stream
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
      firewall: this._custodial ? this._firewall.deny : null,
      createHandshake: this._custodial ? null : createHandshake.bind(this),
      createSecretStream: this._custodial ? null : createSecretStream.bind(this)
    })

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)

    this._server
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)
      .listen({
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey
      }, {
        signAnnounce: this._custodial ? null : this._signee.signAnnounce,
        signUnannounce: this._custodial ? null : this._signee.signUnannounce
      })
  }

  async close () {
    await this._server.close()
  }
}

module.exports = {
  ServerProxy
}

async function onClose () {
  await this._protocol.closed({ alias: this._alias })

  this._server
    .off('close', this._onClose)
    .off('listening', this._onListening)
    .off('connection', this._onConnection)

  this.emit('close')
}

async function onListening () {
  const address = this._server.address()

  await this._protocol.listening({
    alias: this._alias,
    remoteAlias: this._remoteAlias,
    host: address.host,
    port: address.port
  })
}

async function onConnection (stream) {
  const alias = nextId()

  this._node._connecting.set(alias, stream)

  const onError = async (err) => {
    await this._protocol.destroy({ alias, error: err ? err.message : null })
  }

  const onClose = async () => {
    stream
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._node._connecting.delete(alias, stream)

    await this._protocol.destroy({ alias })
  }

  const onEnd = async () => {
    await this._protocol.end({ alias })
  }

  const onData = async (data) => {
    await this._protocol.data({ alias, data: [data] })
  }

  stream
    .on('error', onError)
    .on('close', onClose)
    .on('end', onEnd)
    .on('data', onData)
    .pause()

  await this._protocol.connection({
    alias,
    serverAlias: this._alias,
    remotePublicKey: stream.remotePublicKey,
    handshakeHash: stream.handshakeHash,
    handshakeId: stream.handshakeId
  })
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
