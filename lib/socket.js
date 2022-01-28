const { Duplex } = require('streamx')
const buffer = require('b4a')

class Socket extends Duplex {
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
    this._protocol
      .data({
        alias: this._alias,
        data
      })
      .then(
        () => cb(null),
        (err) => cb(err)
      )
  }

  _destroy (cb) {
    this._protocol
      .destroy({
        alias: this._alias
      })
      .then(
        () => cb(null),
        (err) => cb(err)
      )
  }
}

module.exports = {
  Socket
}

function toBuffer (data) {
  return typeof data === 'string' ? buffer.from(data) : data
}
