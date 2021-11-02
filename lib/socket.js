const buffer = require('b4a')

const { EventEmitter } = require('./events')

class Socket extends EventEmitter {
  constructor (protocol, peer) {
    super()

    this._protocol = protocol
    this._peer = peer
  }

  write (data) {
    if (typeof data === 'string') data = buffer.from(data)

    this._protocol.data({ peer: this._peer.publicKey, data })
  }
}

module.exports = {
  Socket
}
