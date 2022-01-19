const { fixed32, fixed64, uint32, string, buffer, array, raw, none } = require('compact-encoding')
const { ipv4Address } = require('compact-encoding-net')

const publicKey = fixed32

const secretKey = fixed64

const topic = fixed32

const handshake = message(0, 'handshake', {
  preencode (state, m) {
    state.end++ // Flags
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    publicKey.encode(state, m.publicKey)

    if (m.secretKey) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state)
    }
  }
})

const error = message(1, 'error', {
  preencode (state, m) {
    string.preencode(state, m.message)
  },
  encode (state, m) {
    string.encode(state, m.message)
  },
  decode (state) {
    return new Error(string.decode(state))
  }
})

const ping = message(2, 'ping')

const pong = message(3, 'pong')

const id = uint32

const socket = id

const server = id

const connect = message(4, 'connect', {
  preencode (state, m) {
    state.end++ // Flags
    socket.preencode(state, m.socket)
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
    publicKey.preencode(state, m.remotePublicKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    socket.encode(state, m.socket)
    publicKey.encode(state, m.publicKey)

    if (m.secretKey) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
    publicKey.encode(state, m.remotePublicKey)
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      socket: socket.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state),
      remotePublicKey: publicKey.decode(state)
    }
  }
})

const connection = message(5, 'connection', {
  preencode (state, m) {
    state.end++ // Flags
    socket.preencode(state, m.socket)
    server.preencode(state, m.server)
    publicKey.preencode(state, m.remotePublicKey)
    if (m.handshakeHash) fixed64.preencode(state, m.handshakeHash)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    socket.encode(state, m.socket)
    server.encode(state, m.server)
    publicKey.encode(state, m.remotePublicKey)

    if (m.handshakeHash) {
      flags |= 1
      fixed64.encode(state, m.handshakeHash)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      socket: socket.decode(state),
      server: server.decode(state),
      remotePublicKey: publicKey.decode(state),
      handshakeHash: (flags & 1) === 0 ? null : fixed64.decode(state)
    }
  }
})

const open = message(6, 'open', {
  preencode (state, m) {
    state.end++ // Flags
    socket.preencode(state, m.socket)
    if (m.handshakeHash) fixed64.preencode(state, m.handshakeHash)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    socket.encode(state, m.socket)

    if (m.handshakeHash) {
      flags |= 1
      fixed64.encode(state, m.handshakeHash)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      socket: socket.decode(state),
      handshakeHash: (flags & 1) === 0 ? null : fixed64.decode(state)
    }
  }
})

const destroy = message(7, 'destroy', {
  preencode (state, m) {
    socket.preencode(state, m.socket)
  },
  encode (state, m) {
    socket.encode(state, m.socket)
  },
  decode (state) {
    return {
      socket: socket.decode(state)
    }
  }
})

const listen = message(8, 'listen', {
  preencode (state, m) {
    state.end++ // Flags
    server.preencode(state, m.server)
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    server.encode(state, m.server)
    publicKey.encode(state, m.publicKey)

    if (m.secretKey) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      server: server.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state)
    }
  }
})

const listening = message(9, 'listening', {
  preencode (state, m) {
    server.preencode(state, m.server)
    ipv4Address.preencode(state, m)
  },
  encode (state, m) {
    server.encode(state, m.server)
    ipv4Address.encode(state, m)
  },
  decode (state) {
    return {
      server: server.decode(state),
      ...ipv4Address.decode(state)
    }
  }
})

const close = message(10, 'close', {
  preencode (state, m) {
    server.preencode(state, m.server)
  },
  encode (state, m) {
    server.encode(state, m.server)
  },
  decode (state) {
    return {
      server: server.decode(state)
    }
  }
})

const closed = message(11, 'closed', close)

const batch = array(buffer)

const data = message(12, 'data', {
  preencode (state, m) {
    socket.preencode(state, m.socket)
    batch.preencode(state, m.data)
  },
  encode (state, m) {
    socket.encode(state, m.socket)
    batch.encode(state, m.data)
  },
  decode (state) {
    return {
      socket: socket.decode(state),
      data: batch.decode(state)
    }
  }
})

const query = {
  preencode (state, m) {
    id.preencode(state, m.id)
  },
  encode (state, m) {
    id.encode(state, m.id)
  },
  decode (state) {
    return {
      id: id.decode(state)
    }
  }
}

const result = message(13, 'result', {
  preencode (state, m) {
    query.preencode(state, m)
    raw.preencode(state, m.data)
  },
  encode (state, m) {
    query.encode(state, m)
    raw.encode(state, m.data)
  },
  decode (state) {
    return {
      ...query.decode(state),
      data: raw.decode(state)
    }
  }
})

const finished = message(14, 'finished', query)

const lookup = message(15, 'lookup', {
  preencode (state, m) {
    query.preencode(state, m)
    topic.preencode(state, m.topic)
  },
  encode (state, m) {
    query.encode(state, m)
    topic.encode(state, m.topic)
  },
  decode (state) {
    return {
      ...query.decode(state),
      topic: topic.decode(state)
    }
  }
})

const announce = message(16, 'announce', {
  preencode (state, m) {
    state.end++ // Flags
    query.preencode(state, m)
    topic.preencode(state, m.topic)
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    query.encode(state, m)
    topic.encode(state, m.topic)
    publicKey.encode(state, m.publicKey)

    if (m.secretKey) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      ...query.decode(state),
      topic: topic.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state)
    }
  }
})

const unannounce = message(17, 'unannounce', announce)

const peerId = buffer

const node = {
  preencode (state, m) {
    peerId.preencode(state, m.id)
    ipv4Address.preencode(state, m)
  },
  encode (state, m) {
    peerId.encode(state, m.id)
    ipv4Address.encode(state, m)
  },
  decode (state) {
    return {
      id: peerId.decode(state),
      ...ipv4Address.decode(state)
    }
  }
}

const relayAddresses = array(ipv4Address)

const peer = {
  preencode (state, m) {
    publicKey.preencode(state, m.publicKey)
    relayAddresses.preencode(state, m.relayAddresses)
  },
  encode (state, m) {
    publicKey.encode(state, m.publicKey)
    relayAddresses.encode(state, m.relayAddresses)
  },
  decode (state) {
    return {
      publicKey: publicKey.decode(state),
      relayAddresses: relayAddresses.decode(state)
    }
  }
}

const peers = array(peer)

const token = fixed32

const announcers = {
  preencode (state, m) {
    token.preencode(state, m.token)
    node.preencode(state, m.from)
    node.preencode(state, m.to)
    peers.preencode(state, m.peers)
  },
  encode (state, m) {
    token.encode(state, m.token)
    node.encode(state, m.from)
    node.encode(state, m.to)
    peers.encode(state, m.peers)
  },
  decode (state) {
    return {
      token: token.decode(state),
      from: node.decode(state),
      to: node.decode(state),
      peers: peers.decode(state)
    }
  }
}

const signer = id

const signAnnounce = message(18, 'signAnnounce', {
  preencode (state, m) {
    id.preencode(state, m.id)
    signer.preencode(state, m.signer)
    token.preencode(state, m.token)
    peerId.preencode(state, m.peerId)
    relayAddresses.preencode(state, m.relayAddresses)
  },
  encode (state, m) {
    id.encode(state, m.id)
    signer.encode(state, m.signer)
    token.encode(state, m.token)
    peerId.encode(state, m.peerId)
    relayAddresses.encode(state, m.relayAddresses)
  },
  decode (state) {
    return {
      id: id.decode(state),
      signer: signer.decode(state),
      token: token.decode(state),
      peerId: peerId.decode(state),
      relayAddresses: relayAddresses.decode(state)
    }
  }
})

const signUnannounce = message(19, 'signUnannounce', signAnnounce)

const signature = message(20, 'signature', {
  preencode (state, m) {
    id.preencode(state, m.id)
    buffer.preencode(state, m.signature)
  },
  encode (state, m) {
    id.encode(state, m.id)
    buffer.encode(state, m.signature)
  },
  decode (state) {
    return {
      id: id.decode(state),
      signature: buffer.decode(state)
    }
  }
})

const noiseRequest = message(21, 'noiseRequest', {
  preencode (state, m) {
    state.end++ // Flags
    socket.preencode(state, m.socket)
    if (!m.isInitiator) server.preencode(state, m.server)
    buffer.preencode(state, m.data)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    if (m.type === 'receive') flags |= 1
    if (m.isInitiator) flags |= 2

    socket.encode(state, m.socket)
    if (!m.isInitiator) server.encode(state, m.server)
    buffer.encode(state, m.data)

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const isInitiator = (flags & 2) !== 0

    return {
      isInitiator,
      type: (flags & 1) === 0 ? 'send' : 'receive',
      socket: socket.decode(state),
      server: isInitiator ? null : server.decode(state),
      data: buffer.decode(state)
    }
  }
})

const noiseResponse = message(22, 'noiseResponse', {
  preencode (state, m) {
    state.end++ // Flags
    socket.preencode(state, m.socket)
    buffer.preencode(state, m.data)

    if (m.complete) {
      fixed32.preencode(state, m.remoteId)
      if (!m.isInitiator) publicKey.preencode(state, m.remotePublicKey)
      fixed32.preencode(state, m.holepunchSecret)
    }
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    if (m.complete) flags |= 1
    if (m.isInitiator) flags |= 2

    socket.encode(state, m.socket)
    buffer.encode(state, m.data)

    if (m.complete) {
      fixed32.encode(state, m.remoteId)
      if (!m.isInitiator) publicKey.encode(state, m.remotePublicKey)
      fixed32.encode(state, m.holepunchSecret)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const complete = (flags & 1) !== 0
    const isInitiator = (flags & 2) !== 0

    return {
      isInitiator,
      socket: socket.decode(state),
      data: buffer.decode(state),
      complete,
      remoteId: complete ? fixed32.decode(state) : null,
      remotePublicKey: complete && !isInitiator ? publicKey.decode(state) : null,
      holepunchSecret: complete ? fixed32.decode(state) : null
    }
  }
})

module.exports = {
  handshake,
  error,
  ping,
  pong,
  connect,
  connection,
  open,
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
  announcers,
  peer,
  signAnnounce,
  signUnannounce,
  signature,
  noiseRequest,
  noiseResponse
}

function message (type, name, encoding = none) {
  return { ...encoding, type, name }
}
