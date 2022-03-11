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

    const protocol = muxer.open({ protocol: '@hyperswarm/dht-relay' })

    this.handshake = protocol.addMessage({
      encoding: m.handshake,
      onmessage: this.emit.bind(this, 'handshake')
    })

    this.ping = protocol.addMessage({
      encoding: m.ping,
      onmessage: () => {
        this.pong.send()
        this.alive()
      }
    })

    this.pong = protocol.addMessage({
      encoding: m.pong,
      onmessage: () => {
        this.alive()
      }
    })

    this.connect = protocol.addMessage({
      encoding: m.connect,
      onmessage: this.emit.bind(this, 'connect')
    })

    this.connection = protocol.addMessage({
      encoding: m.connection,
      onmessage: this.emit.bind(this, 'connection')
    })

    this.connected = protocol.addMessage({
      encoding: m.connected,
      onmessage: this.emit.bind(this, 'connected')
    })

    this.incoming = protocol.addMessage({
      encoding: m.incoming,
      onmessage: this.emit.bind(this, 'incoming')
    })

    this.deny = protocol.addMessage({
      encoding: m.deny,
      onmessage: this.emit.bind(this, 'deny')
    })

    this.accept = protocol.addMessage({
      encoding: m.accept,
      onmessage: this.emit.bind(this, 'accept')
    })

    this.destroy = protocol.addMessage({
      encoding: m.destroy,
      onmessage: this.emit.bind(this, 'destroy')
    })

    this.listen = protocol.addMessage({
      encoding: m.listen,
      onmessage: this.emit.bind(this, 'listen')
    })

    this.listening = protocol.addMessage({
      encoding: m.listening,
      onmessage: this.emit.bind(this, 'listening')
    })

    this.close = protocol.addMessage({
      encoding: m.close,
      onmessage: this.emit.bind(this, 'close')
    })

    this.closed = protocol.addMessage({
      encoding: m.closed,
      onmessage: this.emit.bind(this, 'closed')
    })

    this.open = protocol.addMessage({
      encoding: m.open,
      onmessage: this.emit.bind(this, 'open')
    })

    this.end = protocol.addMessage({
      encoding: m.end,
      onmessage: this.emit.bind(this, 'end')
    })

    this.data = protocol.addMessage({
      encoding: m.data,
      onmessage: this.emit.bind(this, 'data')
    })

    this.result = protocol.addMessage({
      encoding: m.result,
      onmessage: this.emit.bind(this, 'result')
    })

    this.finished = protocol.addMessage({
      encoding: m.finished,
      onmessage: this.emit.bind(this, 'finished')
    })

    this.lookup = protocol.addMessage({
      encoding: m.lookup,
      onmessage: this.emit.bind(this, 'lookup')
    })

    this.announce = protocol.addMessage({
      encoding: m.announce,
      onmessage: this.emit.bind(this, 'announce')
    })

    this.unannounce = protocol.addMessage({
      encoding: m.unannounce,
      onmessage: this.emit.bind(this, 'unannounce')
    })

    this.signAnnounce = protocol.addMessage({
      encoding: m.signAnnounce,
      onmessage: this.emit.bind(this, 'signAnnounce')
    })

    this.signUnannounce = protocol.addMessage({
      encoding: m.signUnannounce,
      onmessage: this.emit.bind(this, 'signUnannounce')
    })

    this.signature = protocol.addMessage({
      encoding: m.signature,
      onmessage: this.emit.bind(this, 'signature')
    })

    this.noiseSend = protocol.addMessage({
      encoding: m.noiseSend,
      onmessage: this.emit.bind(this, 'noiseSend')
    })

    this.noiseReceive = protocol.addMessage({
      encoding: m.noiseReceive,
      onmessage: this.emit.bind(this, 'noiseReceive')
    })

    this.noiseReply = protocol.addMessage({
      encoding: m.noiseReply,
      onmessage: this.emit.bind(this, 'noiseReply')
    })
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
