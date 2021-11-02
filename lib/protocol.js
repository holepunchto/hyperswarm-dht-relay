const EventEmitter = require('events')
const { uint } = require('compact-encoding')

const messages = require('./messages')

class Protocol extends EventEmitter {
  constructor (socket) {
    super()

    this._socket = socket

    this._socket.addEventListener('error', (event) => this._onError(event))
    this._socket.addEventListener('close', () => this._onClose())
    this._socket.addEventListener('message', (event) => this._onMessage(event.data))

    const opening = new Promise((resolve, reject) => {
      if (socket.readyState === /* OPEN */ 1) return resolve()

      const onOpen = () => {
        socket.removeEventListener('error', onError)
        resolve()
      }

      const onError = (event) => {
        socket.removeEventListener('open', onOpen)
        reject(event.data)
      }

      socket.addEventListener('open', onOpen, { once: true })
      socket.addEventListener('error', onError, { once: true })
    })

    const closing = new Promise((resolve) => this.once('close', () => resolve()))

    this.ready = () => opening.then(() => this)
    this.closed = () => closing
  }

  _onError (err) {
    this.emit('error', err)
  }

  _onClose () {
    this.emit('close')
  }

  async _onMessage (buffer) {
    if (typeof buffer.arrayBuffer === 'function') {
      buffer = new Uint8Array(await buffer.arrayBuffer())
    }

    const state = { start: 0, end: buffer.byteLength, buffer }
    const type = uint.decode(state)

    switch (type) {
      case 1: return this.emit('error', messages.error.decode(state))
      case 2: return this.emit('ping', messages.ping.decode(state))
      case 3: return this.emit('pong', messages.pong.decode(state))
      case 4: return this.emit('listen', messages.listen.decode(state))
      case 5: return this.emit('join', messages.join.decode(state))
      case 6: return this.emit('leave', messages.leave.decode(state))
      case 7: return this.emit('connection', messages.connection.decode(state))
      case 8: return this.emit('data', messages.data.decode(state))
      case 9: return this.emit('flush', messages.flush.decode(state))
      case 10: return this.emit('flushed', messages.flushed.decode(state))
    }
  }

  async send (type, encoding, message) {
    if (this._socket.readyState > /* OPEN */ 1) return

    const state = { start: 0, end: 0, buffer: null }

    uint.preencode(state, type)
    encoding.preencode(state, message)

    state.buffer = new Uint8Array(state.end)

    uint.encode(state, type)
    encoding.encode(state, message)

    await this.ready()

    await new Promise((resolve, reject) =>
      this._socket.send(state.buffer, (err) => {
        if (err) reject(err)
        else resolve()
      })
    )
  }

  async error (message) {
    await this.send(1, messages.error, message)
  }

  async ping (message) {
    await this.send(2, messages.ping, message)
  }

  async pong (message) {
    await this.send(3, messages.ping, message)
  }

  async listen (message) {
    await this.send(4, messages.listen, message)
  }

  async join (message) {
    await this.send(5, messages.join, message)
  }

  async leave (message) {
    await this.send(6, messages.leave, message)
  }

  async connection (message) {
    await this.send(7, messages.connection, message)
  }

  async data (message) {
    await this.send(8, messages.data, message)
  }

  async flush (message) {
    await this.send(9, messages.flush, message)
  }

  async flushed (message) {
    await this.send(10, messages.flushed, message)
  }

  async close () {
    await this._socket.close()
    await this.closed()
  }
}

module.exports = {
  Protocol
}
