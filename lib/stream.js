const { Duplex } = require('streamx')
const buffer = require('b4a')

class Stream extends Duplex {
  constructor (protocol, alias, remoteAlias, isInitiator, options = {}) {
    super({ mapWritable: toBuffer })

    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias

    this._opening = null

    this.noiseStream = this
    this.isInitiator = isInitiator
    this.publicKey = options.publicKey || null
    this.remotePublicKey = options.remotePublicKey || null
    this.handshakeHash = options.handshakeHash || null

    this._onStreamClose = onStreamClose.bind(this)

    this._protocol._stream
      .once('close', this._onStreamClose)

    this._onOpen = onOpen.bind(this)

    this.resume().pause()
  }

  alloc (len) {
    return buffer.allocUnsafe(len)
  }

  _open (cb) {
    if (this._remoteAlias === null) this._opening = cb
    else cb(null)
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

  _writev (data, cb) {
    this._protocol.data.send({ alias: this._alias, data })
    cb(null)
  }

  _final (cb) {
    this._protocol.end.send({ alias: this._alias })
    cb(null)
  }

  _predestroy () {
    this._protocol.destroy.send({ alias: this._alias })
  }
}

module.exports = {
  Stream
}

function onStreamClose () {
  this.destroy()
}

function onOpen (message) {
  this._remoteAlias = message.alias
  this._continueOpen()
}

function toBuffer (data) {
  return typeof data === 'string' ? buffer.from(data) : data
}
