const EventEmitter = require('events')

const { FirewallProxy } = require('./firewall-proxy')
const { HandshakeProxy } = require('./handshake-proxy')
const { SigneeProxy } = require('./signee-proxy')
const { SocketProxy } = require('./socket-proxy')

const crypto = require('./crypto')
const { nextId } = require('./id')

class ServerProxy extends EventEmitter {
  constructor (node, socket, protocol, alias, remoteAlias, keyPair) {
    super()

    this._node = node
    this._socket = socket
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

async function onConnection (socket) {
  const alias = nextId()

  this._node._connecting.set(alias, socket)

  const onError = async (err) => {
    this.emit('error', err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._node._connecting.delete(alias, socket)

    await this._protocol.destroy({ alias })
  }

  const onData = async (data) => {
    await this._protocol.data({ alias, data: [data] })
  }

  socket
    .on('error', onError)
    .on('close', onClose)
    .on('data', onData)
    .pause()

  await this._protocol.connection({
    alias,
    serverAlias: this._alias,
    remotePublicKey: socket.remotePublicKey,
    handshakeHash: socket.handshakeHash,
    handshakeId: socket.handshakeId
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
  return new SocketProxy(
    this._protocol,
    null,
    null,
    isInitiator,
    rawStream,
    options
  )
}
