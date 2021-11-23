const EventEmitter = require('events')
const buffer = require('b4a')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')

const crypto = require('./crypto')

class Server extends EventEmitter {
  constructor (socket, protocol) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._keyPair = null
    this._connections = new Map()
    this._address = null
    this._listening = null
    this._closing = null

    this._onClose = onClose.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)

    this._socket
      .on('close', this._onClose)

    this._protocol
      .on('connection', this._onConnection)
      .on('destroy', this._onDestroy)
      .on('close', this._onClose)
      .on('data', this._onData)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get publicKey () {
    return this._keyPair && this._keyPair.publicKey
  }

  async listen (keyPair) {
    if (this._listening) return this._listening

    this._keyPair = keyPair || crypto.keyPair()

    await this._protocol.listen(this._keyPair)

    this._listening = new Promise((resolve) => {
      const onListening = (message) => {
        if (buffer.equals(message.publicKey, this._keyPair.publicKey)) {
          this._protocol.off('listening', onListening)
          this._address = message
          this.emit('listening')
          resolve()
        }
      }

      this._protocol.on('listening', onListening)
    })

    return this._listening
  }

  address () {
    return this._address
  }

  async close () {
    if (this._closing) return this._closing

    await this._protocol.close(this._keyPair)

    this._closing = new Promise((resolve) => {
      const onClosed = (message) => {
        if (buffer.equals(message.publicKey, this._keyPair.publicKey)) {
          this._protocol.off('close', onClosed)
          this.emit('close')
          resolve()
        }
      }

      this._protocol.on('closed', onClosed)
    })

    return this._closing
  }

  async fromTransport ({ Socket }, socket) {
    return new Server(new Socket(socket))
  }
}

module.exports = {
  Server
}

function onClose () {
  this._socket
    .off('close', this._onClose)

  this._protocol
    .off('connection', this._onConnection)
    .off('destroy', this._onDestroy)
    .off('close', this._onClose)
    .off('data', this._onData)

  this.emit('close')
}

function onConnection (message) {
  const key = buffer.toString(message.publicKey, 'hex')

  if (this._connections.has(key)) return

  const socket = new Socket(this._protocol, message)
  this._connections.set(key, socket)

  socket.once('close', () => this._connections.delete(key))

  this.emit('connection', socket)
}

function onDestroy (message) {
  const socket = this._connections.get(
    buffer.toString(message.publicKey, 'hex')
  )

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(
    buffer.toString(message.publicKey, 'hex')
  )

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}
