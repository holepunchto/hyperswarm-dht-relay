const { Duplex } = require('streamx')
const buffer = require('b4a')

class Socket extends Duplex {
  constructor (protocol, options = {}) {
    super()

    this._protocol = protocol

    this.publicKey = options.publicKey || null
    this.remotePublicKey = options.remotePublicKey || null
    this.handshakeHash = options.handshakeHash || null

    // Used for Hypercore replication
    this.noiseStream = this

    this.once('close', () => this._protocol.destroy(this))
  }

  _write (data, done) {
    if (typeof data === 'string') data = buffer.from(data)
    this._protocol
      .data({ remotePublicKey: this.remotePublicKey, data })
      .then(
        () => done(),
        (err) => done(err)
      )
  }

  alloc (len) {
    return buffer.allocUnsafe(len)
  }
}

module.exports = {
  Socket
}
