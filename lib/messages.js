const { fixed32, fixed64, uint, string, buffer, array, raw, none } = require('compact-encoding')
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

const handshake = { ...keyPair, type: 0 }

const error = {
  type: 1,
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

const ping = { ...none, type: 2 }

const pong = { ...none, type: 3 }

const connect = {
  type: 4,
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
  type: 5,
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
  type: 6,
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

const listen = { ...keyPair, type: 7 }

const listening = {
  type: 8,
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
  type: 9,
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

const closed = { ...close, type: 10 }

const data = {
  type: 11,
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

const query = {
  preencode (state, message) {
    uint.preencode(state, message.id)
  },
  encode (state, message) {
    uint.encode(state, message.id)
  },
  decode (state) {
    return {
      id: uint.decode(state)
    }
  }
}

const result = {
  type: 12,
  preencode (state, message) {
    query.preencode(state, message)
    raw.preencode(state, message.data)
  },
  encode (state, message) {
    query.encode(state, message)
    raw.encode(state, message.data)
  },
  decode (state) {
    return {
      ...query.decode(state),
      data: raw.decode(state)
    }
  }
}

const finished = { ...query, type: 13 }

const lookup = {
  type: 14,
  preencode (state, message) {
    query.preencode(state, message)
    topic.preencode(state, message.topic)
  },
  encode (state, message) {
    query.encode(state, message)
    topic.encode(state, message.topic)
  },
  decode (state) {
    return {
      ...query.decode(state),
      topic: topic.decode(state)
    }
  }
}

const announce = {
  type: 15,
  preencode (state, message) {
    query.preencode(state, message)
    topic.preencode(state, message.topic)
    keyPair.preencode(state, message.keyPair)
  },
  encode (state, message) {
    query.encode(state, message)
    topic.encode(state, message.topic)
    keyPair.encode(state, message.keyPair)
  },
  decode (state) {
    return {
      ...query.decode(state),
      topic: topic.decode(state),
      keyPair: keyPair.decode(state)
    }
  }
}

const unannounce = { ...announce, type: 16 }

const node = {
  preencode (state, message) {
    buffer.preencode(state, message.id)
    ipv4Address.preencode(state, message)
  },
  encode (state, message) {
    buffer.encode(state, message.id)
    ipv4Address.encode(state, message)
  },
  decode (state) {
    return {
      id: buffer.decode(state),
      ...ipv4Address.decode(state)
    }
  }
}

const relayAddresses = array(ipv4Address)

const peer = {
  preencode (state, message) {
    publicKey.preencode(state, message.publicKey)
    relayAddresses.preencode(state, message.relayAddresses)
  },
  encode (state, message) {
    publicKey.encode(state, message.publicKey)
    relayAddresses.encode(state, message.relayAddresses)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
      relayAddresses: relayAddresses.decode(state)
    }
  }
}

const peers = array(peer)

const announcers = {
  preencode (state, message) {
    fixed32.preencode(state, message.token)
    node.preencode(state, message.from)
    node.preencode(state, message.to)
    peers.preencode(state, message.peers)
  },
  encode (state, message) {
    fixed32.encode(state, message.token)
    node.encode(state, message.from)
    node.encode(state, message.to)
    peers.encode(state, message.peers)
  },
  decode (state) {
    return {
      token: fixed32.decode(state),
      from: node.decode(state),
      to: node.decode(state),
      peers: peers.decode(state)
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
  query,
  result,
  finished,
  lookup,
  announce,
  unannounce,
  announcers
}
