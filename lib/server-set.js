const buffer = require('b4a')

class ServerSet {
  constructor () {
    this._servers = new Map()
  }

  get size () {
    return this._servers.size
  }

  add (publicKey, server) {
    this._servers.set(key(publicKey), server)
    return this
  }

  get (publicKey) {
    return this._servers.get(key(publicKey))
  }

  has (publicKey) {
    return this._servers.has(key(publicKey))
  }

  delete (publicKey) {
    return this._servers.delete(key(publicKey))
  }

  [Symbol.iterator] () {
    return this._servers.values()
  }
}

module.exports = {
  ServerSet
}

function key (publicKey) {
  return buffer.toString(publicKey, 'ascii')
}
