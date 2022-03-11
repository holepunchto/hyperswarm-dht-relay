const EventEmitter = require('events')
const Protomux = require('protomux')

const m = require('./messages')

const heartbeatFrequency = 15 * 1e3

class Protocol extends EventEmitter {
  constructor (stream) {
    super()

    const muxer = Protomux.from(stream)

    this._stream = muxer.stream.setMaxListeners(0)

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

    const channel = muxer.createChannel({ protocol: '@hyperswarm/dht-relay' })

    this.handshake = channel.addMessage({
      encoding: m.handshake,
      onmessage: this.emit.bind(this, 'handshake')
    })

    this.ping = channel.addMessage({
      encoding: m.ping,
      onmessage: () => {
        this.pong.send()
        this.alive()
      }
    })

    this.pong = channel.addMessage({
      encoding: m.pong,
      onmessage: () => {
        this.alive()
      }
    })

    this.connect = channel.addMessage({
      encoding: m.connect,
      onmessage: this.emit.bind(this, 'connect')
    })

    this.connection = channel.addMessage({
      encoding: m.connection,
      onmessage: this.emit.bind(this, 'connection')
    })

    this.connected = channel.addMessage({
      encoding: m.connected,
      onmessage: this.emit.bind(this, 'connected')
    })

    this.incoming = channel.addMessage({
      encoding: m.incoming,
      onmessage: this.emit.bind(this, 'incoming')
    })

    this.deny = channel.addMessage({
      encoding: m.deny,
      onmessage: this.emit.bind(this, 'deny')
    })

    this.accept = channel.addMessage({
      encoding: m.accept,
      onmessage: this.emit.bind(this, 'accept')
    })

    this.destroy = channel.addMessage({
      encoding: m.destroy,
      onmessage: this.emit.bind(this, 'destroy')
    })

    this.listen = channel.addMessage({
      encoding: m.listen,
      onmessage: this.emit.bind(this, 'listen')
    })

    this.listening = channel.addMessage({
      encoding: m.listening,
      onmessage: this.emit.bind(this, 'listening')
    })

    this.close = channel.addMessage({
      encoding: m.close,
      onmessage: this.emit.bind(this, 'close')
    })

    this.closed = channel.addMessage({
      encoding: m.closed,
      onmessage: this.emit.bind(this, 'closed')
    })

    this.open = channel.addMessage({
      encoding: m.open,
      onmessage: this.emit.bind(this, 'open')
    })

    this.end = channel.addMessage({
      encoding: m.end,
      onmessage: this.emit.bind(this, 'end')
    })

    this.data = channel.addMessage({
      encoding: m.data,
      onmessage: this.emit.bind(this, 'data')
    })

    this.result = channel.addMessage({
      encoding: m.result,
      onmessage: this.emit.bind(this, 'result')
    })

    this.finished = channel.addMessage({
      encoding: m.finished,
      onmessage: this.emit.bind(this, 'finished')
    })

    this.lookup = channel.addMessage({
      encoding: m.lookup,
      onmessage: this.emit.bind(this, 'lookup')
    })

    this.announce = channel.addMessage({
      encoding: m.announce,
      onmessage: this.emit.bind(this, 'announce')
    })

    this.unannounce = channel.addMessage({
      encoding: m.unannounce,
      onmessage: this.emit.bind(this, 'unannounce')
    })

    this.signAnnounce = channel.addMessage({
      encoding: m.signAnnounce,
      onmessage: this.emit.bind(this, 'signAnnounce')
    })

    this.signUnannounce = channel.addMessage({
      encoding: m.signUnannounce,
      onmessage: this.emit.bind(this, 'signUnannounce')
    })

    this.signature = channel.addMessage({
      encoding: m.signature,
      onmessage: this.emit.bind(this, 'signature')
    })

    this.noiseSend = channel.addMessage({
      encoding: m.noiseSend,
      onmessage: this.emit.bind(this, 'noiseSend')
    })

    this.noiseReceive = channel.addMessage({
      encoding: m.noiseReceive,
      onmessage: this.emit.bind(this, 'noiseReceive')
    })

    this.noiseReply = channel.addMessage({
      encoding: m.noiseReply,
      onmessage: this.emit.bind(this, 'noiseReply')
    })

    channel.open()
  }

  heartbeat () {
    if (!this._heartbeat) {
      this._heartbeat = setInterval(() => this.ping.send(), heartbeatFrequency)
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
