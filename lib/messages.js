const { fixed32, fixed64, string, buffer, none } = require('compact-encoding')
const { ipv4Address } = require('compact-encoding-net')

const session = fixed32

const handshake = {
  preencode (state, message) {
    session.preencode(state, message.session)
  },
  encode (state, message) {
    session.encode(state, message.session)
  },
  decode (state) {
    return {
      session: session.decode(state)
    }
  }
}

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

const connect = {
  preencode (state, message) {
    key.preencode(state, message.remotePublicKey)
  },
  encode (state, message) {
    key.encode(state, message.remotePublicKey)
  },
  decode (state) {
    return {
      remotePublicKey: key.decode(state)
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

const destroy = connect

const listen = none

const listening = {
  preencode (state, message) {
    key.preencode(state, message.publicKey)
    ipv4Address.preencode(state, message)
  },
  encode (state, message) {
    key.encode(state, message.publicKey)
    ipv4Address.encode(state, message)
  },
  decode (state) {
    return {
      publicKey: key.decode(state),
      ...ipv4Address.decode(state)
    }
  }
}

const close = {
  preencode (state, message) {
    key.preencode(state, message.publicKey)
  },
  encode (state, message) {
    key.encode(state, message.publicKey)
  },
  decode (state) {
    return {
      publicKey: key.decode(state)
    }
  }
}

const closed = close

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

const lookup = {
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

const announce = {
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

const unannounce = {
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

module.exports = {
  handshake,
  error,
  ping,
  pong,
  connect,
  connection,
  destroy,
  listen,
  listening,
  close,
  closed,
  data,
  lookup,
  announce,
  unannounce
}
