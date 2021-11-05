const { fixed32, fixed64, string, buffer, none } = require('compact-encoding')
const { ipv4Address } = require('compact-encoding-net')

const publicKey = fixed32

const secretKey = fixed64

const keyPair = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
    secretKey.preencode(state, message.secretKey)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
    secretKey.encode(state, message.secretKey)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
      secretKey: secretKey.decode(state)
    }
  }
}

const topic = fixed32

const handshake = keyPair

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

const connect = {
  preencode (state, message) {
    keyPair.preencode(state, message)
    publicKey.preencode(state, message.remotePublicKey)
  },
  encode (state, message) {
    keyPair.encode(state, message)
    publicKey.encode(state, message.remotePublicKey)
  },
  decode (state) {
    return {
      ...keyPair.decode(state),
      remotePublicKey: publicKey.decode(state)
    }
  }
}

const connection = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
    publicKey.preencode(state, message.remotePublicKey)
    fixed64.preencode(state, message.handshakeHash)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
    publicKey.encode(state, message.remotePublicKey)
    fixed64.encode(state, message.handshakeHash)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
      remotePublicKey: publicKey.decode(state),
      handshakeHash: fixed64.decode(state)
    }
  }
}

const destroy = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state)
    }
  }
}

const listen = keyPair

const listening = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
    ipv4Address.preencode(state, message)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
    ipv4Address.encode(state, message)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
      ...ipv4Address.decode(state)
    }
  }
}

const close = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state)
    }
  }
}

const closed = close

const data = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
    buffer.preencode(state, message.data)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
    buffer.encode(state, message.data)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
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
