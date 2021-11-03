const { Duplex } = require('streamx')
const buffer = require('b4a')

class Socket extends Duplex {
  constructor (protocol, peer) {
    super()

    this._protocol = protocol
    this._peer = peer
  }

  _write (data, done) {
    if (typeof data === 'string') data = buffer.from(data)
    this._protocol
      .data({ peer: this._peer, data })
      .then(
        () => done(),
        (err) => done(err)
      )
  }
}

module.exports = {
  Socket
}
