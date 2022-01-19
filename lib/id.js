function idFactory (start, step = 2, limit = 2 ** 32) {
  let id = start

  return function nextId () {
    id += step
    if (id >= limit) id = start
    return id
  }
}

module.exports = {
  nextId: idFactory(2),
  nextRelayId: idFactory(1)
}
