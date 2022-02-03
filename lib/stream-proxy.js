const { Duplex } = require('streamx')

class StreamProxy extends Duplex {
  constructor (protocol, alias, remoteAlias, isInitiator, rawStream, options = {}) {
    super()

    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias

    this._opening = null
    this._draining = null
    this._ended = 2

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

    const onError = (err) => {
      this.destroy(err)
    }

    const onClose = () => {
      this.rawStream
        .off('error', onError)
        .off('end', onEnd)
        .off('data', onData)
        .off('drain', onDrain)

      if (this._ended !== 0) this.destroy()
    }

    const onEnd = () => {
      this._ended--
      this.push(null)
    }

    const onData = (data) => {
      this.push(data)
    }

    const onDrain = () => {
      this._continueWrite()
    }

    this.rawStream
      .once('error', onError)
      .once('close', onClose)
      .once('end', onEnd)
      .on('data', onData)
      .on('drain', onDrain)

    if (options.data) this.push(options.data)
    if (options.ended) this.push(null)

    this._continueOpen()
  }

  _open (cb) {
    if (this.rawStream) cb(null)
    else this._opening = cb
  }

  _continueOpen (err) {
    const cb = this._opening

    if (cb) {
      this._opening = null

      if (err) cb(err)
      else this._open(cb)
    } else {
      if (err) this.destroy(err)
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
    this._ended--
    this.rawStream.end()
    cb(null)
  }

  _predestroy () {
    const err = new Error('Stream was destroyed')

    this._continueOpen(err)
    this._continueWrite(err)

    if (this.rawStream) {
      this.rawStream.destroy(
        this._readableState.error || this._writableState.error
      )
    }
  }
}

module.exports = {
  StreamProxy
}
