const buffer = require('b4a')

class QuerySet {
  constructor () {
    this._queries = new Map()
  }

  get size () {
    return this._queries.size
  }

  add (id, query) {
    this._queries.set(key(id), query)
    return this
  }

  get (id) {
    return this._queries.get(key(id))
  }

  has (id) {
    return this._queries.has(key(id))
  }

  delete (id) {
    return this._queries.delete(key(id))
  }

  [Symbol.iterator] () {
    return this._queries.values()
  }
}

module.exports = {
  QuerySet
}

function key (id) {
  return buffer.toString(id, 'ascii')
}
