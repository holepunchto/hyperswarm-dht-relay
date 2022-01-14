const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { SocketSet } = require('./socket-set')

const crypto = require('./crypto')

class ServerProxy extends EventEmitter {
  constructor (node, socket, protocol, keyPair) {
    super()

    this._node = node
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._keyPair = keyPair

    this._server = node._dht.createServer()
    this._connections = new SocketSet()

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)

    this._server
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)
      .listen(this._keyPair)
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

  for (const socket of this._connections) socket.destroy()

  this.emit('close')
}

async function onListening () {
  await this._protocol.listening(this._server.address())
}

async function onConnection (socket) {
  const id = crypto.randomId()

  this._node._connections.add(id, socket.publicKey, socket)

  const onError = async (err) => {
    await this._protocol.error(err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('data', onData)

    this._node._connections.delete(id, socket.publicKey, socket)

    await this._protocol.destroy({
      socket: id,
      publicKey: socket.publicKey
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
    .on('data', onData)

  await this._protocol.connection({
    socket: id,
    publicKey: socket.publicKey,
    remotePublicKey: socket.remotePublicKey,
    handshakeHash: socket.handshakeHash
  })
}
