const kEvents = Symbol('kEvents')

class EventEmitter {
  constructor () {
    this[kEvents] = new Map()
  }

  on (type, listener) {
    let events = this[kEvents].get(type)
    if (events === undefined) {
      events = new Set()
      this[kEvents].set(type, events)
    }
    events.add(listener)
    return this
  }

  once (type, listener) {
    const once = (...args) => {
      this.off(type, once)
      listener(...args)
    }
    this.on(type, once)
    return this
  }

  off (type, listener) {
    if (type === undefined) this[kEvents].clear()
    else {
      const events = this[kEvents].get(type)
      if (events !== undefined) {
        if (listener === undefined) events.clear()
        else events.delete(listener)
      }
    }
    return this
  }

  emit (type, ...args) {
    const events = this[kEvents].get(type)
    if (events !== undefined) {
      events.forEach(listener => listener(...args))
      return events.size > 0
    }
    return false
  }
}

module.exports = {
  EventEmitter
}
