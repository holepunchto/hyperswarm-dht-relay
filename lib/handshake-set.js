const buffer = require('b4a')

class HandshakeSet {
  constructor () {
    this._handshakes = new Map()
  }

  get size () {
    return this._handshakes.size
  }

  add (id, publicKey, handshake) {
    this._handshakes.set(key(id, publicKey), handshake)
    return this
  }

  get (id, publicKey) {
    return this._handshakes.get(key(id, publicKey))
  }

  has (id, publicKey) {
    return this._handshakes.has(key(id, publicKey))
  }

  delete (id, publicKey) {
    return this._handshakes.delete(key(id, publicKey))
  }

  [Symbol.iterator] () {
    return this._handshakes.values()
  }
}

module.exports = {
  HandshakeSet
}

const tmp = buffer.alloc(36)

function key (id, publicKey) {
  tmp.set(id, 0)
  tmp.set(publicKey, 4)
  return buffer.toString(tmp, 'ascii')
}
