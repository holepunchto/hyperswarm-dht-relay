const EventEmitter = require('events')
const Protomux = require('protomux')

const m = require('./messages')

const heartbeatFrequency = 15 * 1e3

const messages = Object.values(m)

const events = Object.keys(m)

const types = Object.fromEntries(events.map((m, i) => [m, i]))

class Protocol extends EventEmitter {
  constructor (stream) {
    super()

    this._stream = stream

    const mux = new Protomux(stream)

    this._protocol = mux.addProtocol({
      name: '@hyperswarm/dht-relay',
      version: {
        major: 0,
        minor: 1
      },
      messages,
      onmessage: onMessage.bind(this)
    })

    this._heartbeat = null
    this._failsafe = null

    this._onClose = onClose.bind(this)
    this._onPing = onPing.bind(this)
    this._onPong = onPong.bind(this)

    this._stream
      .on('close', this._onClose)

    const opening = new Promise((resolve, reject) => {
      const onOpen = () => {
        this._stream.off('error', onError)
        resolve()
      }

      const onError = (error) => {
        this._stream.off('open', onOpen)
        reject(error)
      }

      this._stream
        .once('open', onOpen)
        .once('error', onError)
    })

    this.ready = async function ready () {
      await opening
    }
  }

  send (type, message) {
    this._protocol.send(type, message)
  }

  heartbeat () {
    if (!this._heartbeat) {
      this._heartbeat = setInterval(() => this.ping(), heartbeatFrequency)
    }
    return this
  }

  alive () {
    if (this._failsafe) clearTimeout(this._failsafe)
    this._failsafe = setTimeout(() => this._stream.destroy(), heartbeatFrequency * 3)
    return this
  }

  handshake (message) {
    this.send(types.handshake, message)
  }

  ping () {
    this.send(types.ping)
  }

  pong () {
    this.send(types.pong)
  }

  connect (message) {
    this.send(types.connect, message)
  }

  connection (message) {
    this.send(types.connection, message)
  }

  connected (message) {
    this.send(types.connected, message)
  }

  incoming (message) {
    this.send(types.incoming, message)
  }

  deny (message) {
    this.send(types.deny, message)
  }

  accept (message) {
    this.send(types.accept, message)
  }

  destroy (message) {
    this.send(types.destroy, message)
  }

  listen (message) {
    this.send(types.listen, message)
  }

  listening (message) {
    this.send(types.listening, message)
  }

  close (message) {
    this.send(types.close, message)
  }

  closed (message) {
    this.send(types.closed, message)
  }

  open (message) {
    this.send(types.open, message)
  }

  end (message) {
    this.send(types.end, message)
  }

  data (message) {
    this.send(types.data, message)
  }

  result (message) {
    this.send(types.result, message)
  }

  finished (message) {
    this.send(types.finished, message)
  }

  lookup (message) {
    this.send(types.lookup, message)
  }

  announce (message) {
    this.send(types.announce, message)
  }

  unannounce (message) {
    this.send(types.unannounce, message)
  }

  signAnnounce (message) {
    this.send(types.signAnnounce, message)
  }

  signUnannounce (message) {
    this.send(types.signUnannounce, message)
  }

  signature (message) {
    this.send(types.signature, message)
  }

  noiseSend (message) {
    this.send(types.noiseSend, message)
  }

  noiseReceive (message) {
    this.send(types.noiseReceive, message)
  }

  noiseReply (message) {
    this.send(types.noiseReply, message)
  }
}

module.exports = {
  Protocol
}

function onClose () {
  this._stream
    .off('close', this._onClose)

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

async function onMessage (type, message) {
  switch (type) {
    case types.ping: return this._onPing()
    case types.pong: return this._onPong()
  }

  this.emit(events[type], message)
}
