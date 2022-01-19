const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { SigningProxy } = require('./signing-proxy')

const crypto = require('./crypto')
const noise = require('./noise')

const { nextRelayId } = require('./id')

class ServerProxy extends EventEmitter {
  constructor (dht, socket, protocol, id, keyPair) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._keyPair = keyPair

    this.id = id

    this._connections = new Map()

    const custodial = keyPair.secretKey !== null

    this._server = dht.createServer({
      createHandshake: custodial
        ? null
        : noise.createHandshake(this._protocol, nextRelayId(), id),
      createSecretStream: custodial ? null : noise.createSecretStream(this._protocol)
    })

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onData = onData.bind(this)
    this._onDestroy = onDestroy.bind(this)

    const signing = new SigningProxy(this._protocol, crypto.hash(keyPair.publicKey), id)

    this._server
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)
      .listen({
        publicKey: keyPair.publicKey,
        secretKey: custodial ? keyPair.secretKey : null
      }, {
        signAnnounce: custodial ? null : signing.signAnnounce,
        signUnannounce: custodial ? null : signing.signUnannounce
      })

    this._protocol
      .on('data', this._onData)
      .on('destroy', this._onDestroy)
  }

  get publicKey () {
    return this._keyPair.publicKey
  }

  async close () {
    await this._server.close()
  }
}

module.exports = {
  ServerProxy
}

async function onClose () {
  await this._protocol.closed(this._keyPair)

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
    server: this.id,
    host: address.host,
    port: address.port
  })
}

async function onConnection (socket) {
  const id = socket.socketId || nextRelayId()

  this._connections.set(id, socket)

  const onError = async (err) => {
    await this._protocol.error(err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._connections.delete(id, socket)

    await this._protocol.destroy({
      socket: id
    })
  }

  const onData = async (data) => {
    await this._protocol.data({
      socket: id,
      data: [data]
    })
  }

  socket
    .on('error', onError)
    .on('close', onClose)
    .on('data', onData)

  await this._protocol.connection({
    socket: id,
    server: this.id,
    remotePublicKey: socket.remotePublicKey,
    handshakeHash: socket.handshakeHash
  })
}

function onDestroy (message) {
  const socket = this._connections.get(message.socket)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket)

  if (socket) {
    for (const chunk of message.data) socket.write(chunk)
  }
}
