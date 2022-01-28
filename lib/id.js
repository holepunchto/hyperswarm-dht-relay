function idFactory (start, step = 1, limit = 2 ** 32) {
  let id = start

  return function nextId () {
    const nextId = id
    id += step
    if (id >= limit) id = start
    return nextId
  }
}

module.exports = {
  nextId: idFactory(1)
}
