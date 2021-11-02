const { fixed32, string, buffer, none } = require('compact-encoding')

const error = {
  preencode (state, message) {
    string.preencode(state, message.message)
  },
  encode (state, message) {
    string.encode(state, message.message)
  },
  decode (state) {
    return new Error(string.decode(state))
  }
}

const ping = none

const pong = none

const peer = {
  preencode (state, message) {
    fixed32.preencode(state, message.publicKey)
  },
  encode (state, message) {
    fixed32.encode(state, message.publicKey)
  },
  decode (state) {
    return {
      publicKey: fixed32.decode(state)
    }
  }
}

const topic = fixed32

const listen = none

const join = {
  preencode (state, message) {
    state.end++ // Flags
    topic.preencode(state, message.topic)
  },
  encode (state, message) {
    const s = state.start++
    let flags = 0

    if (message.options?.server) flags |= 1
    if (message.options?.client) flags |= 2

    state.buffer[s] = flags
    topic.encode(state, message.topic)
  },
  decode (state) {
    const flags = state.buffer[state.start++]
    return {
      topic: topic.decode(state),
      options: {
        server: (flags & 1) !== 0,
        client: (flags & 2) !== 0
      }
    }
  }
}

const leave = {
  preencode (state, message) {
    topic.preencode(state, message.topic)
  },
  encode (state, message) {
    topic.encode(state, message.topic)
  },
  decode (state) {
    return {
      topic: topic.decode(state)
    }
  }
}

const connection = {
  preencode (state, message) {
    peer.preencode(state, message.peer)
  },
  encode (state, message) {
    peer.encode(state, message.peer)
  },
  decode (state) {
    return {
      peer: peer.decode(state)
    }
  }
}

const data = {
  preencode (state, message) {
    peer.preencode(state, message.peer)
    buffer.preencode(state, message.data)
  },
  encode (state, message) {
    peer.encode(state, message.peer)
    buffer.encode(state, message.data)
  },
  decode (state) {
    return {
      peer: peer.decode(state),
      data: buffer.decode(state)
    }
  }
}

const flush = {
  preencode (state, message = {}) {
    state.end++ // Flags
    if (message.topic) topic.preencode(state, message.topic)
  },
  encode (state, message = {}) {
    const s = state.start++
    let flags = 0

    if (message.topic) {
      flags |= 1
      topic.encode(state, message.topic)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]
    return {
      topic: (flags & 1) === 0 ? null : topic.decode(state)
    }
  }
}

const flushed = flush

module.exports = {
  error,
  ping,
  pong,
  listen,
  join,
  leave,
  connection,
  data,
  flush,
  flushed
}
