const EventEmitter = require('events')

const { SigningProxy } = require('./signing-proxy')

const crypto = require('./crypto')
const noise = require('./noise')
const { nextId } = require('./id')

class ServerProxy extends EventEmitter {
  constructor (dht, socket, protocol, alias, remoteAlias, keyPair) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias
    this._keyPair = keyPair

    this._connecting = new Map()
    this._connections = new Map()

    const custodial = keyPair.secretKey !== null

    this._server = dht.createServer({
      createHandshake: custodial ? null : noise.createHandshake(this._protocol),
      createSecretStream: custodial ? null : noise.createSecretStream(this._protocol)
    })

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onData = onData.bind(this)
    this._onAccept = onAccept.bind(this)
    this._onDestroy = onDestroy.bind(this)

    const signing = new SigningProxy(this._protocol, crypto.hash(keyPair.publicKey))

    this._server
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)
      .listen({
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey
      }, {
        signAnnounce: custodial ? null : signing.signAnnounce,
        signUnannounce: custodial ? null : signing.signUnannounce
      })

    this._protocol
      .on('data', this._onData)
      .on('accept', this._onAccept)
      .on('destroy', this._onDestroy)
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

  this._protocol
    .off('data', this._onData)
    .off('destroy', this._onDestroy)

  for (const socket of this._connections.values()) socket.destroy()

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

  this._connecting.set(alias, socket)

  const onError = async (err) => {
    this.emit('error', err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._connecting.delete(alias, socket)

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
    handshakeHash: socket.handshakeHash
  })
}

function onAccept (message) {
  const socket = this._connecting.get(message.remoteAlias)

  if (socket) {
    this._connecting.delete(message.remoteAlias)

    this._connections.set(message.alias, socket)

    socket.once('close', () => this._connections.delete(message.alias))

    socket.resume()
  }
}

function onDestroy (message) {
  const socket = this._connections.get(message.alias)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.alias)

  if (socket) {
    for (const chunk of message.data) socket.write(chunk)
  }
}
