const EventEmitter = require('events')

const { NodeProxy } = require('./node-proxy')

class Relay extends EventEmitter {
  constructor (dht, socket) {
    super()

    this._dht = dht
    this._socket = socket

    this._connections = new Set()

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

    this.ready = async function ready () {
      await listening
    }
  }

  _onError (err) {
    this.emit('error', err)
  }

  async _onClose () {
    for (const connection of this._connections) await connection.destroy()
    this.emit('close')
  }

  _onListening () {
    this.emit('listening')
  }

  _onConnection (socket) {
    const node = new NodeProxy(this._dht, socket)
    this._connections.add(node)
    node.on('close', () => this._connections.delete(node))
  }

  async close () {
    await this._socket.close()
  }

  static fromTransport ({ Server }, dht, socket) {
    return new Relay(dht, new Server(socket))
  }
}

module.exports = {
  Relay
}
