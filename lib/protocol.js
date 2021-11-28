const EventEmitter = require('events')
const buffer = require('b4a')
const { uint, uint24 } = require('compact-encoding')

const m = require('./messages')

const heartbeatFrequency = 15 * 1e3

class Protocol extends EventEmitter {
  constructor (socket) {
    super()

    this._socket = socket

    this._heartbeat = null
    this._failsafe = null
    this._data = null

    this._onClose = onClose.bind(this)
    this._onData = onData.bind(this)
    this._onMessage = onMessage.bind(this)
    this._onPing = onPing.bind(this)
    this._onPong = onPong.bind(this)

    this._socket
      .on('close', this._onClose)
      .on('data', this._onData)
      .on('message', this._onMessage)

    const opening = new Promise((resolve, reject) => {
      if (this._socket.readyState === 'open') return resolve()

      const onReady = () => {
        this._socket.off('error', onError)
        resolve()
      }

      const onError = (error) => {
        this._socket.off('ready', onReady)
        reject(error)
      }

      this._socket
        .once('ready', onReady)
        .once('error', onError)
    })

    this.ready = async function ready () {
      await opening
    }
  }

  async send (encoding, message) {
    await this.ready()

    if (this._socket.readyState !== 'open') return

    await new Promise((resolve, reject) =>
      this._socket.write(encode(encoding, message), (err) => {
        if (err) reject(err)
        else resolve()
      })
    )
  }

  heartbeat () {
    if (!this._heartbeat) {
      this._heartbeat = setInterval(() => this.ping(), heartbeatFrequency)
    }
    return this
  }

  alive () {
    if (this._failsafe) clearTimeout(this._failsafe)
    this._failsafe = setTimeout(() => this._socket.destroy(), heartbeatFrequency * 3)
    return this
  }

  async handshake (message) {
    await this.send(m.handshake, message)
  }

  async error (message) {
    await this.send(m.error, message)
  }

  async ping () {
    await this.send(m.ping)
  }

  async pong () {
    await this.send(m.pong)
  }

  async connect (message) {
    await this.send(m.connect, message)
  }

  async connection (message) {
    await this.send(m.connection, message)
  }

  async destroy (message) {
    await this.send(m.destroy, message)
  }

  async listen (message) {
    await this.send(m.listen, message)
  }

  async listening (message) {
    await this.send(m.listening, message)
  }

  async close (message) {
    await this.send(m.close, message)
  }

  async closed (message) {
    await this.send(m.closed, message)
  }

  async data (message) {
    await this.send(m.data, message)
  }

  async result (message) {
    await this.send(m.result, message)
  }

  async finished (message) {
    await this.send(m.finished, message)
  }

  async lookup (message) {
    await this.send(m.lookup, message)
  }

  async announce (message) {
    await this.send(m.announce, message)
  }

  async unannounce (message) {
    await this.send(m.unannounce, message)
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
  this.alive()
}

function onPong () {
  this.alive()
}

function onData (data) {
  if (this._data) {
    data = buffer.concat([this._data, data])
    this._data = null
  }

  while (data.byteLength >= 3) {
    const length = uint24.decode({ start: 0, end: 3, buffer: data })

    if (data.byteLength < length) break

    this._onMessage(data.subarray(0, length))

    data = data.subarray(length)
  }

  if (data.byteLength !== 0) this._data = data
}

async function onMessage (data) {
  const [type, message] = decode(data)

  this.emit(type, message)

  switch (type) {
    case 'ping': return this._onPing()
    case 'pong': return this._onPong()
  }
}

function encode (encoding, message) {
  const state = { start: 0, end: 3, buffer: null }

  uint.preencode(state, encoding.type)
  encoding.preencode(state, message)

  state.buffer = new Uint8Array(state.end)

  uint24.encode(state, state.end)
  uint.encode(state, encoding.type)
  encoding.encode(state, message)

  return state.buffer
}

function decode (data) {
  const state = { start: 3, end: data.byteLength, buffer: data }
  const type = uint.decode(state)

  switch (type) {
    case m.handshake.type: return ['handshake', m.handshake.decode(state)]
    case m.error.type: return ['error', m.error.decode(state)]
    case m.ping.type: return ['ping', m.ping.decode(state)]
    case m.pong.type: return ['pong', m.pong.decode(state)]
    case m.connect.type: return ['connect', m.connect.decode(state)]
    case m.connection.type: return ['connection', m.connection.decode(state)]
    case m.destroy.type: return ['destroy', m.destroy.decode(state)]
    case m.listen.type: return ['listen', m.listen.decode(state)]
    case m.listening.type: return ['listening', m.listening.decode(state)]
    case m.close.type: return ['close', m.close.decode(state)]
    case m.closed.type: return ['closed', m.closed.decode(state)]
    case m.data.type: return ['data', m.data.decode(state)]
    case m.result.type: return ['result', m.result.decode(state)]
    case m.finished.type: return ['finished', m.finished.decode(state)]
    case m.lookup.type: return ['lookup', m.lookup.decode(state)]
    case m.announce.type: return ['announce', m.announce.decode(state)]
    case m.unannounce.type: return ['unannounce', m.unannounce.decode(state)]

    default: throw new Error(`unknown message type: ${type}`)
  }
}
