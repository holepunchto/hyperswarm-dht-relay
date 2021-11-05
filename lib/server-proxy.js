const EventEmitter = require('events')

const { Protocol } = require('./protocol')

class ServerProxy extends EventEmitter {
  constructor (dht, socket, protocol) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._server = dht.createServer()
    this._connections = new Map()

    this._server
      .on('close', () => this._onClose())
      .on('listening', () => this._onListening())
      .on('connection', (socket) => this._onConnection(socket))
      .listen()

    this._protocol
      .on('data', (message) => this._onData(message))
  }

  _onClose () {
    this._protocol.removeAllListeners()
  }

  _onListening () {
    this._protocol.listening(this._server.address())
  }

  async _onConnection (socket) {
    const key = socket.remotePublicKey.toString('hex')

    if (this._connections.has(key)) return socket.destroy()

    this._connections.set(key, socket)

    await this._protocol.connection(socket)

    socket
      .on('error', (err) => this._protocol.error(err))
      .on('close', () => {
        this._connections.delete(key)
        this._protocol.destroy(socket)
      })
      .on('data', (data) => this._protocol.data({ remotePublicKey: socket.remotePublicKey, data }))
  }

  _onData (message) {
    const socket = this._connections.get(message.remotePublicKey.toString('hex'))
    if (socket) socket.write(message.data)
  }

  async close () {
    await this._server.close()
  }
}

module.exports = {
  ServerProxy
}
