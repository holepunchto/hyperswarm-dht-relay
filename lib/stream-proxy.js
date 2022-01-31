const { Duplex } = require('streamx')

class StreamProxy extends Duplex {
  constructor (protocol, alias, remoteAlias, isInitiator, rawStream, options = {}) {
    super()

    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias

    this._opening = null
    this._draining = null

    this.noiseStream = this
    this.isInitiator = isInitiator
    this.publicKey = options.publicKey
    this.remotePublicKey = options.remotePublicKey
    this.handshakeId = null
    this.rawStream = null

    if (options.autoStart !== false) this.start(rawStream, options)

    this.resume().pause()
  }

  start (rawStream, options) {
    this.rawStream = rawStream

    if (options.handshake) {
      this.publicKey = options.handshake.publicKey
      this.remotePublicKey = options.handshake.remotePublicKey
      this.handshakeId = options.handshake.id
    }

    this.rawStream
      .on('error', (err) => this.destroy(err))
      .on('close', () => this.destroy())

    if (options.data) this.push(options.data)
    if (options.ended) this.push(null)

    this._continueOpen()
  }

  _open (cb) {
    if (this.rawStream === null) this._opening = cb
    else {
      this.rawStream
        .on('data', (data) => this.push(data))
        .on('end', () => this.push(null))
        .on('drain', () => this._continueWrite())

      cb(null)
    }
  }

  _continueOpen (err) {
    if (err) this.destroy(err)
    else {
      const cb = this._opening

      if (cb) {
        this._opening = null
        this._open(cb)
      }
    }
  }

  _read (cb) {
    this.rawStream.resume()
    cb(null)
  }

  _write (data, cb) {
    if (this.rawStream.write(data, cb)) cb(null)
    else this._draining = cb
  }

  _continueWrite (err) {
    const cb = this._draining

    if (cb) {
      this._draining = null
      cb(err)
    }
  }

  _final (cb) {
    this.rawStream.end()
    cb(null)
  }

  _predestroy () {
    const error = new Error('Stream was destroyed')

    this._continueOpen(error)
    this._continueWrite(error)
  }
}

module.exports = {
  StreamProxy
}
