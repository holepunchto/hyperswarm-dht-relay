const EventEmitter = require('events')

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

    this._socket
      .on('close', () => this._onClose())

    this._protocol
      .on('connection', (message) => this._onConnection(message))
      .on('close', () => this._onClose())
      .on('data', (message) => this._onData(message))

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  _onClose () {
    this._protocol.removeAllListeners()
    this.emit('close')
  }

  _onConnection (message) {
    const key = message.remotePublicKey.toString('hex')

    if (this._connections.has(key)) return

    const socket = new Socket(this._protocol, message)

    this._connections.set(key, socket)

    socket.on('close', () => this._connections.delete(key))

    this.emit('connection', socket)
  }

  _onData (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) socket.push(message.data)
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
    await this._protocol.close()
  }

  async fromTransport ({ Socket }, socket) {
    return new Server(new Socket(socket))
  }
}

module.exports = {
  Server
}
