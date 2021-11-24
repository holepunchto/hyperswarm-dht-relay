const buffer = require('b4a')

class SocketSet {
  constructor () {
    this._sockets = new Map()
  }

  get size () {
    return this._sockets.size
  }

  add (id, publicKey, socket) {
    this._sockets.set(key(id, publicKey), socket)
    return this
  }

  get (id, publicKey) {
    return this._sockets.get(key(id, publicKey))
  }

  has (id, publicKey) {
    return this._sockets.has(key(id, publicKey))
  }

  delete (id, publicKey) {
    return this._sockets.delete(key(id, publicKey))
  }

  [Symbol.iterator] () {
    return this._sockets.values()
  }
}

module.exports = {
  SocketSet
}

const tmp = buffer.alloc(36)

function key (id, publicKey) {
  tmp.set(id, 0)
  tmp.set(publicKey, 4)
  return buffer.toString(tmp, 'ascii')
}
