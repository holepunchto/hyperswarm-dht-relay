const { EventEmitter } = require('./events')
const { PeerProxy } = require('./peer-proxy')

class Relay extends EventEmitter {
  constructor (socket, options = {}) {
    super()

    this._options = options
    this._connections = new Set()
    this._socket = socket

    this._socket
      .on('error', (err) => this._onError(err))
      .on('close', () => this._onClose())
      .on('listening', () => this._onListening())
      .on('connection', (socket) => this._onConnection(socket))

    const listening = new Promise((resolve, reject) => {
      const onListening = () => {
        this._socket.off('error', onError)
        resolve()
      }

      const onError = (err) => {
        this._socket.off('listening', onListening)
        reject(err)
      }

      this._socket
        .once('listening', onListening)
        .once('error', onError)
    })

    const closing = new Promise((resolve) => this.once('close', () => resolve()))

    this.ready = () => listening.then(() => this)
    this.closed = () => closing
  }

  _onError (err) {
    this.emit('error', err)
  }

  async _onClose () {
    for (const connection of this._connections) await connection.close()
    this.emit('close')
  }

  _onListening () {
    this.emit('listening')
  }

  _onConnection (socket) {
    const peer = new PeerProxy(socket, this._options)
    this._connections.add(peer)
    peer.on('close', () => this._connections.delete(peer))
  }

  async close () {
    await this._socket.close()
    await this.closed()
  }
}

module.exports = {
  Relay
}
