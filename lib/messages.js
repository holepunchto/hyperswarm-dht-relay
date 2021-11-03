const { fixed32, fixed64, string, buffer, none } = require('compact-encoding')

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

const key = fixed32

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
    key.preencode(state, message.publicKey)
    key.preencode(state, message.remotePublicKey)
    fixed64.preencode(state, message.handshakeHash)
  },
  encode (state, message) {
    key.encode(state, message.publicKey)
    key.encode(state, message.remotePublicKey)
    fixed64.encode(state, message.handshakeHash)
  },
  decode (state) {
    return {
      publicKey: key.decode(state),
      remotePublicKey: key.decode(state),
      handshakeHash: fixed64.decode(state)
    }
  }
}

const data = {
  preencode (state, message) {
    key.preencode(state, message.remotePublicKey)
    buffer.preencode(state, message.data)
  },
  encode (state, message) {
    key.encode(state, message.remotePublicKey)
    buffer.encode(state, message.data)
  },
  decode (state) {
    return {
      remotePublicKey: key.decode(state),
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

const refresh = join

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
  flushed,
  refresh
}
