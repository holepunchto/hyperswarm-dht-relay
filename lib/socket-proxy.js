const { Duplex } = require('streamx')

class SocketProxy extends Duplex {
  constructor (protocol, alias, remoteAlias, isInitiator, rawStream, options = {}) {
    super({ eagerOpen: true })

    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias

    this._handshake = null
    this._opening = null

    this.noiseStream = this
    this.isInitiator = isInitiator
    this.rawStream = rawStream

    this.publicKey = options.publicKey
    this.remotePublicKey = options.remotePublicKey

    if (options.autoStart !== false) this.start(rawStream, options)
  }

  start (rawStream, options) {
    this.rawStream = rawStream

    if (options.handshake) {
      this.socketId = options.handshake.socketId
      this.publicKey = options.handshake.publicKey
      this.remotePublicKey = options.handshake.remotePublicKey
    }

    if (options.data) this.push(options.data)
    if (options.ended) this.push(null)

    this._continueOpen(null)
  }

  _open (cb) {
    if (this.rawStream === null) {
      this._opening = cb
      return
    }

    this.rawStream.on('data', (data) => this.push(data))

    cb(null)
  }

  _continueOpen (err) {
    if (err) this.destroy(err)

    const cb = this._opening

    if (cb) {
      this._opening = null
      this._open(cb)
    }
  }

  _write (chunk, cb) {
    this.rawStream.write(chunk, cb)
  }
}

module.exports = {
  SocketProxy
}
