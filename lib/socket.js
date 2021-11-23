const { Duplex } = require('streamx')
const buffer = require('b4a')

class Socket extends Duplex {
  constructor (protocol, id, options = {}) {
    super({ map: toBuffer })

    this._protocol = protocol
    this._id = id

    this.publicKey = options.publicKey || null
    this.remotePublicKey = options.remotePublicKey || null
    this.handshakeHash = options.handshakeHash || null

    // Used for Hypercore replication
    this.noiseStream = this
  }

  alloc (len) {
    return buffer.allocUnsafe(len)
  }

  _writev (data, done) {
    this._protocol
      .data({
        socket: this._id,
        publicKey: this.publicKey,
        data
      })
      .then(
        () => done(null),
        (err) => done(err)
      )
  }

  _destroy (done) {
    this._protocol
      .destroy({
        socket: this._id,
        publicKey: this.publicKey
      })
      .then(
        () => done(null),
        (err) => done(err)
      )
  }
}

module.exports = {
  Socket
}

function toBuffer (data) {
  return typeof data === 'string' ? buffer.from(data) : data
}
