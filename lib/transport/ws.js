const { Duplex } = require('streamx')
const buffer = require('b4a')

class Stream extends Duplex {
  constructor (isInitiator, socket) {
    super()

    this._socket = socket
    this._socket.binaryType = 'arraybuffer'

    this._opening = null

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onOpen = onOpen.bind(this)
    this._onMessage = onMessage.bind(this)

    this._socket.addEventListener('error', this._onError)
    this._socket.addEventListener('close', this._onClose)
    this._socket.addEventListener('open', this._onOpen)
    this._socket.addEventListener('message', this._onMessage)
  }

  _open (cb) {
    if (this._socket.readyState > 1) cb(new Error('Socket is closed'))
    else if (this._socket.readyState < 1) this._opening = cb
    else cb(null)
  }

  _continueOpen (err) {
    if (err) this.destroy(err)

    const cb = this._opening

    if (cb) {
      this._opening = null
      this._open(cb)
    }
  }

  _write (data, cb) {
    this._socket.send(data)
    cb(null)
  }

  _predestroy () {
    this._continueOpen(new Error('Socket was destroyed'))
  }

  _destroy (cb) {
    this._socket.close()
    cb(null)
  }
}

module.exports = Stream

function onError (err) {
  this.destroy(err)
}

function onClose () {
  this._socket.removeEventListener('error', this._onError)
  this._socket.removeEventListener('close', this._onClose)
  this._socket.removeEventListener('open', this._onOpen)
  this._socket.removeEventListener('message', this._onMessage)

  this.destroy()
}

function onOpen () {
  this._continueOpen()
}

function onMessage (event) {
  this.push(buffer.from(event.data))
}
