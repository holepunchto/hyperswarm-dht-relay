const EventEmitter = require('events')
const { uint } = require('compact-encoding')

const messages = require('./messages')

const heartbeatFrequency = 15 * 1e3

class Protocol extends EventEmitter {
  constructor (socket) {
    super()

    this._socket = socket

    this._onClose = onClose.bind(this)
    this._onData = onData.bind(this)
    this._onPing = onPing.bind(this)
    this._onPong = onPong.bind(this)

    this._socket
      .on('close', this._onClose)
      .on('data', this._onData)

    const opening = new Promise((resolve, reject) => {
      if (this._socket.readyState === 'open') return resolve()

      const onReady = () => {
        this._socket.off('error', onError)
        resolve()
      }

      const onError = (event) => {
        this._socket.off('ready', onReady)
        reject(event.data)
      }

      this._socket
        .once('ready', onReady)
        .once('error', onError)
    })

    this.ready = async function ready () {
      await opening
    }

    this._heartbeat = setInterval(() => this.ping(), heartbeatFrequency)
    this._failsafe = null

    this
      .on('ping', this._onPing)
      .on('pong', this._onPong)
      ._onPong()
  }

  async send (type, encoding, message) {
    if (this._socket.readyState !== 'opening' && this._socket.readyState !== 'open') return

    const state = { start: 0, end: 0, buffer: null }

    uint.preencode(state, type)
    encoding.preencode(state, message)

    state.buffer = new Uint8Array(state.end)

    uint.encode(state, type)
    encoding.encode(state, message)

    await this.ready()

    await new Promise((resolve, reject) =>
      this._socket.write(state.buffer, (err) => {
        if (err) reject(err)
        else resolve()
      })
    )
  }

  async handshake (message) {
    await this.send(0, messages.handshake, message)
  }

  async error (message) {
    await this.send(1, messages.error, message)
  }

  async ping () {
    await this.send(2, messages.ping)
  }

  async pong () {
    await this.send(3, messages.ping)
  }

  async connect (message) {
    await this.send(4, messages.connect, message)
  }

  async connection (message) {
    await this.send(5, messages.connection, message)
  }

  async destroy (message) {
    await this.send(6, messages.destroy, message)
  }

  async listen (message) {
    await this.send(7, messages.listen, message)
  }

  async listening (message) {
    await this.send(8, messages.listening, message)
  }

  async close (message) {
    await this.send(9, messages.close, message)
  }

  async closed (message) {
    await this.send(10, messages.close, message)
  }

  async data (message) {
    await this.send(11, messages.data, message)
  }

  async lookup (message) {
    await this.send(12, messages.lookup, message)
  }

  async announce (message) {
    await this.send(13, messages.announce, message)
  }

  async unannounce (message) {
    await this.send(14, messages.unannounce, message)
  }
}

module.exports = {
  Protocol
}

function onClose () {
  this._socket
    .off('close', this._onClose)
    .off('data', this._onData)

  clearInterval(this._heartbeat)

  if (this._failsafe) clearTimeout(this._failsafe)
}

function onPing () {
  this.pong()
}

function onPong () {
  if (this._failsafe) clearTimeout(this._failsafe)
  this._failsafe = setTimeout(() => this.close(), heartbeatFrequency * 3)
}

async function onData (buffer) {
  if (typeof buffer.arrayBuffer === 'function') {
    buffer = new Uint8Array(await buffer.arrayBuffer())
  }

  const state = { start: 0, end: buffer.byteLength, buffer }
  const type = uint.decode(state)

  switch (type) {
    case 0: return this.emit('handshake', messages.handshake.decode(state))
    case 1: return this.emit('error', messages.error.decode(state))
    case 2: return this.emit('ping', messages.ping.decode(state))
    case 3: return this.emit('pong', messages.pong.decode(state))
    case 4: return this.emit('connect', messages.connect.decode(state))
    case 5: return this.emit('connection', messages.connection.decode(state))
    case 6: return this.emit('destroy', messages.destroy.decode(state))
    case 7: return this.emit('listen', messages.listen.decode(state))
    case 8: return this.emit('listening', messages.listening.decode(state))
    case 9: return this.emit('close', messages.close.decode(state))
    case 10: return this.emit('closed', messages.closed.decode(state))
    case 11: return this.emit('data', messages.data.decode(state))
    case 12: return this.emit('lookup', messages.lookup.decode(state))
    case 13: return this.emit('announce', messages.announce.decode(state))
    case 14: return this.emit('unannounce', messages.unannounce.decode(state))
  }
}
