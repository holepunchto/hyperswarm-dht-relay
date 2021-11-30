const EventEmitter = require('events')
const buffer = require('b4a')

class Socket extends EventEmitter {
  constructor (socket) {
    super()

    this._socket = socket
    this._socket.binaryType = 'arraybuffer'

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onOpen = onOpen.bind(this)
    this._onMessage = onMessage.bind(this)

    this._socket.addEventListener('error', this._onError)
    this._socket.addEventListener('close', this._onClose)
    this._socket.addEventListener('open', this._onOpen)
    this._socket.addEventListener('message', this._onMessage)
  }

  get readyState () {
    switch (this._socket.readyState) {
      case 0: return 'opening'
      case 1: return 'open'
      case 2: return 'closing'
      case 3: return 'closed'
    }
  }

  destroy () {
    this._socket.close()
  }

  write (data, cb) {
    this._socket.send(data)
    cb(null)
  }
}

module.exports = {
  Socket
}

function onError (err) {
  this.emit('error', err)
}

function onClose () {
  this._socket.removeEventListener('error', this._onError)
  this._socket.removeEventListener('close', this._onClose)
  this._socket.removeEventListener('open', this._onOpen)
  this._socket.removeEventListener('message', this._onMessage)

  this.emit('close')
}

function onOpen () {
  this.emit('ready')
}

function onMessage (event) {
  this.emit('message', buffer.from(event.data))
}
