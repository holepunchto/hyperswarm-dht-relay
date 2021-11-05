const EventEmitter = require('events')

class Server extends EventEmitter {
  constructor (socket) {
    super()
    this._socket = socket
    this._socket
      .on('error', (err) => this.emit('error', err))
      .on('close', () => this.emit('close'))
      .on('listening', () => this.emit('listening'))
      .on('connection', (socket) => this.emit('connection', new Socket(socket)))
  }

  address () {
    return this._socket.address()
  }

  close () {
    return this._socket.close()
  }
}

class Socket extends EventEmitter {
  constructor (socket) {
    super()
    this._socket = socket
    this._socket.addEventListener('error', (event) => this.emit('error', event))
    this._socket.addEventListener('close', () => this.emit('close'))
    this._socket.addEventListener('open', () => this.emit('open'))
    this._socket.addEventListener('message', (event) => this.emit('message', event.data))
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
    this._socket.send(data, cb)
  }
}

module.exports = {
  Server,
  Socket
}
