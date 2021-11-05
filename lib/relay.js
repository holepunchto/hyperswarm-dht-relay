const EventEmitter = require('events')

const { NodeProxy } = require('./node-proxy')

class Relay extends EventEmitter {
  constructor (dht, socket) {
    super()

    this._dht = dht
    this._socket = socket

    this._connections = new Set()

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)

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

function onError (err) {
  this.emit('error', err)
}

async function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)
    .off('listening', this._onListening)
    .off('connection', this._onConnection)

  for (const connection of this._connections) await connection.destroy()

  this.emit('close')
}

function onListening () {
  this.emit('listening')
}

function onConnection (socket) {
  const node = new NodeProxy(this._dht, socket)
  this._connections.add(node)

  node.once('close', () => this._connections.delete(node))
}
