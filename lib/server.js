const EventEmitter = require('events')
const buffer = require('b4a')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')

class Server extends EventEmitter {
  constructor (socket, protocol) {
    super()

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._connections = new Map()
    this._listening = null
    this._address = null

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

  async listen () {
    if (!this._listening) {
      await this._protocol.listen()

      this._listening = new Promise((resolve) =>
        this._protocol.once('listening', (message) => {
          this._address = message
          this.emit('listening')
          resolve()
        })
      )
    }

    return this._listening
  }

  address () {
    return this._address
  }

  async close () {
    await this._protocol.close(this._address)

    await new Promise((resolve) => {
      const onClosed = (message) => {
        if (buffer.equals(this._address.publicKey, message.publicKey)) {
          this._protocol.off('close', onClosed)
          resolve()
        }
      }

      this._protocol.on('closed', onClosed)
    })
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
  const key = message.remotePublicKey.toString('hex')

  if (this._connections.has(key)) return

  const socket = new Socket(this._protocol, message)
  this._connections.set(key, socket)

  socket.once('close', () => this._connections.delete(key))

  this.emit('connection', socket)
}

function onDestroy (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) socket.push(message.data)
}
