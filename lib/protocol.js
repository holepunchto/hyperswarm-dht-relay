const EventEmitter = require('events')
const Protomux = require('protomux')

const m = require('./messages')

const heartbeatFrequency = 15 * 1e3

class Protocol extends EventEmitter {
  constructor (stream) {
    super()

    const muxer = Protomux.from(stream)

    this._stream = muxer.stream

    this._heartbeat = null
    this._failsafe = null

    this._onStreamClose = onStreamClose.bind(this)

    this._stream
      .once('close', this._onStreamClose)

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

    const protocol = muxer.addProtocol({
      name: '@hyperswarm/dht-relay',
      version: {
        major: 0,
        minor: 1
      },
      messages: 28
    })

    this.handshake = protocol.addMessage({
      type: 0,
      encoding: m.handshake,
      onmessage: this.emit.bind(this, 'handshake')
    })

    this.ping = protocol.addMessage({
      type: 1,
      encoding: m.ping,
      onmessage: () => {
        this.pong.send()
        this.alive()
      }
    })

    this.pong = protocol.addMessage({
      type: 2,
      encoding: m.pong,
      onmessage: () => {
        this.alive()
      }
    })

    this.connect = protocol.addMessage({
      type: 3,
      encoding: m.connect,
      onmessage: this.emit.bind(this, 'connect')
    })

    this.connection = protocol.addMessage({
      type: 4,
      encoding: m.connection,
      onmessage: this.emit.bind(this, 'connection')
    })

    this.connected = protocol.addMessage({
      type: 5,
      encoding: m.connected,
      onmessage: this.emit.bind(this, 'connected')
    })

    this.incoming = protocol.addMessage({
      type: 6,
      encoding: m.incoming,
      onmessage: this.emit.bind(this, 'incoming')
    })

    this.deny = protocol.addMessage({
      type: 7,
      encoding: m.deny,
      onmessage: this.emit.bind(this, 'deny')
    })

    this.accept = protocol.addMessage({
      type: 8,
      encoding: m.accept,
      onmessage: this.emit.bind(this, 'accept')
    })

    this.destroy = protocol.addMessage({
      type: 9,
      encoding: m.destroy,
      onmessage: this.emit.bind(this, 'destroy')
    })

    this.listen = protocol.addMessage({
      type: 10,
      encoding: m.listen,
      onmessage: this.emit.bind(this, 'listen')
    })

    this.listening = protocol.addMessage({
      type: 11,
      encoding: m.listening,
      onmessage: this.emit.bind(this, 'listening')
    })

    this.close = protocol.addMessage({
      type: 12,
      encoding: m.close,
      onmessage: this.emit.bind(this, 'close')
    })

    this.closed = protocol.addMessage({
      type: 13,
      encoding: m.closed,
      onmessage: this.emit.bind(this, 'closed')
    })

    this.open = protocol.addMessage({
      type: 14,
      encoding: m.open,
      onmessage: this.emit.bind(this, 'open')
    })

    this.end = protocol.addMessage({
      type: 15,
      encoding: m.end,
      onmessage: this.emit.bind(this, 'end')
    })

    this.data = protocol.addMessage({
      type: 16,
      encoding: m.data,
      onmessage: this.emit.bind(this, 'data')
    })

    this.result = protocol.addMessage({
      type: 17,
      encoding: m.result,
      onmessage: this.emit.bind(this, 'result')
    })

    this.finished = protocol.addMessage({
      type: 18,
      encoding: m.finished,
      onmessage: this.emit.bind(this, 'finished')
    })

    this.lookup = protocol.addMessage({
      type: 19,
      encoding: m.lookup,
      onmessage: this.emit.bind(this, 'lookup')
    })

    this.announce = protocol.addMessage({
      type: 20,
      encoding: m.announce,
      onmessage: this.emit.bind(this, 'announce')
    })

    this.unannounce = protocol.addMessage({
      type: 21,
      encoding: m.unannounce,
      onmessage: this.emit.bind(this, 'unannounce')
    })

    this.signAnnounce = protocol.addMessage({
      type: 22,
      encoding: m.signAnnounce,
      onmessage: this.emit.bind(this, 'signAnnounce')
    })

    this.signUnannounce = protocol.addMessage({
      type: 23,
      encoding: m.signUnannounce,
      onmessage: this.emit.bind(this, 'signUnannounce')
    })

    this.signature = protocol.addMessage({
      type: 24,
      encoding: m.signature,
      onmessage: this.emit.bind(this, 'signature')
    })

    this.noiseSend = protocol.addMessage({
      type: 25,
      encoding: m.noiseSend,
      onmessage: this.emit.bind(this, 'noiseSend')
    })

    this.noiseReceive = protocol.addMessage({
      type: 26,
      encoding: m.noiseReceive,
      onmessage: this.emit.bind(this, 'noiseReceive')
    })

    this.noiseReply = protocol.addMessage({
      type: 27,
      encoding: m.noiseReply,
      onmessage: this.emit.bind(this, 'noiseReply')
    })
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
}

module.exports = {
  Protocol
}

function onStreamClose () {
  clearInterval(this._heartbeat)

  if (this._failsafe) clearTimeout(this._failsafe)
}
