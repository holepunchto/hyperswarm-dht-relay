const { Duplex } = require('streamx')
const buffer = require('b4a')

class Stream extends Duplex {
  constructor (protocol, alias, isInitiator, options = {}) {
    super({ map: toBuffer })

    this._protocol = protocol
    this._alias = alias

    this.noiseStream = this
    this.isInitiator = isInitiator
    this.publicKey = options.publicKey || null
    this.remotePublicKey = options.remotePublicKey || null
    this.handshakeHash = options.handshakeHash || null
  }

  alloc (len) {
    return buffer.allocUnsafe(len)
  }

  _writev (data, cb) {
    this._protocol.data({ alias: this._alias, data })
    cb(null)
  }

  _final (cb) {
    this._protocol.end({ alias: this._alias })
    cb(null)
  }

  _predestroy () {
    this._protocol.destroy({ alias: this._alias })
  }
}

module.exports = {
  Stream
}

function toBuffer (data) {
  return typeof data === 'string' ? buffer.from(data) : data
}
