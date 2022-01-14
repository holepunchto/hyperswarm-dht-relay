const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')
const { SocketSet } = require('./socket-set')

class Server extends EventEmitter {
  constructor (node, socket, protocol, options = {}) {
    super()

    this._node = node
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)
    this._firewall = options.firewall || allowAll
    this._custodial = options.custodial !== false

    this._keyPair = null
    this._connections = new SocketSet()
    this._address = null
    this._listening = null
    this._closing = null

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)

    this._socket
      .on('close', this._onClose)

    this._protocol
      .on('destroy', this._onDestroy)
      .on('data', this._onData)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get publicKey () {
    return this._keyPair && this._keyPair.publicKey
  }

  async listen (keyPair = this._node.defaultKeyPair) {
    if (this._listening) return this._listening

    this._keyPair = keyPair

    this._node._servers.add(this._keyPair.publicKey, this)

    await this._protocol.listen({
      publicKey: this._keyPair.publicKey,
      secretKey: this._custodial ? this._keyPair.secretKey : null
    })

    this._listening = new Promise((resolve) => {
      this.once('listening', () => resolve())
    })

    return this._listening
  }

  address () {
    return this._address
  }

  async close () {
    if (this._closing) return this._closing

    if (this._listening) await this._listening
    else return

    await this._protocol.close(this._keyPair)

    this._closing = new Promise((resolve) => {
      this.once('close', () => resolve())
    })

    return this._closing
  }
}

module.exports = {
  Server
}

function onClose () {
  this._socket
    .off('close', this._onClose)

  this._protocol
    .off('destroy', this._onDestroy)
    .off('data', this._onData)

  this.emit('close')
}

function onListening (message) {
  this._address = message
  this.emit('listening')
}

function onClosed () {
  this._onClose()
}

function onConnection (message) {
  const id = message.socket

  const socket = new Socket(this._protocol, id, message)
  this._connections.add(id, socket.publicKey, socket)

  socket.once('close', () => this._connections.delete(id, socket.publicKey))

  this.emit('connection', socket)
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

function allowAll () {
  return false
}
