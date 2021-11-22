const EventEmitter = require('events')

const { Socket } = require('./socket')

class Server extends EventEmitter {
  constructor (socket) {
    super()

    this._socket = socket

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onConnection = onConnection.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)
      .on('listening', this._onListening)
      .on('connection', this._onConnection)
  }

  address () {
    return this._socket.address()
  }

  close () {
    return this._socket.close()
  }
}

module.exports = {
  Server
}

function onError (err) {
  this.emit('error', err)
}

function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)
    .off('listening', this._onListening)
    .off('connection', this._onConnection)

  this.emit('close')
}

function onListening () {
  this.emit('listening')
}

function onConnection (socket) {
  this.emit('connection', new Socket(socket))
}
