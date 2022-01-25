const { fixed32, fixed64, uint32, buffer, array, raw, none, string } = require('compact-encoding')
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

const ping = message(1, 'ping')

const pong = message(2, 'pong')

const id = uint32

const alias = id

const connect = message(3, 'connect', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.alias)
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
    publicKey.preencode(state, m.remotePublicKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)
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
      alias: alias.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state),
      remotePublicKey: publicKey.decode(state)
    }
  }
})

const connection = message(4, 'connection', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.alias)
    alias.preencode(state, m.serverAlias)
    if (m.remotePublicKey) publicKey.preencode(state, m.remotePublicKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)
    alias.encode(state, m.serverAlias)

    if (m.remotePublicKey) {
      flags |= 1
      publicKey.encode(state, m.remotePublicKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      alias: alias.decode(state),
      serverAlias: alias.decode(state),
      remotePublicKey: (flags & 1) === 0 ? null : publicKey.decode(state)
    }
  }
})

const connected = message(5, 'connected', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.alias)
    if (m.remoteAlias) alias.preencode(state, m.remoteAlias)
    if (m.handshakeHash) fixed64.preencode(state, m.handshakeHash)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)

    if (m.remoteAlias) {
      flags |= 1
      alias.encode(state, m.remoteAlias)
    }

    if (m.handshakeHash) {
      flags |= 2
      fixed64.encode(state, m.handshakeHash)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      alias: alias.decode(state),
      remoteAlias: (flags & 1) === 0 ? null : alias.decode(state),
      handshakeHash: (flags & 2) === 0 ? null : fixed64.decode(state)
    }
  }
})

const accept = message(6, 'accept', {
  preencode (state, m) {
    alias.preencode(state, m.alias)
    alias.preencode(state, m.remoteAlias)
  },
  encode (state, m) {
    alias.encode(state, m.alias)
    alias.encode(state, m.remoteAlias)
  },
  decode (state) {
    return {
      alias: alias.decode(state),
      remoteAlias: alias.decode(state)
    }
  }
})

const destroy = message(7, 'destroy', {
  preencode (state, m) {
    state.end++ // Flags
    if (m.alias) alias.preencode(state, m.alias)
    else alias.preencode(state, m.remoteAlias)
    if (m.error) string.preencode(state, m.error)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    if (m.alias) {
      flags |= 1
      alias.encode(state, m.alias)
    } else {
      alias.encode(state, m.remoteAlias)
    }

    if (m.error) {
      flags |= 2
      string.encode(state, m.error)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      alias: (flags & 1) === 0 ? null : alias.decode(state),
      remoteAlias: (flags & 1) !== 0 ? null : alias.decode(state),
      error: (flags & 2) === 0 ? null : string.decode(state)
    }
  }
})

const listen = message(8, 'listen', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.server)
    publicKey.preencode(state, m.publicKey)
    if (m.secretKey) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)
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
      alias: alias.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: (flags & 1) === 0 ? null : secretKey.decode(state)
    }
  }
})

const listening = message(9, 'listening', {
  preencode (state, m) {
    alias.preencode(state, m.alias)
    alias.preencode(state, m.remoteAlias)
    ipv4Address.preencode(state, m)
  },
  encode (state, m) {
    alias.encode(state, m.alias)
    alias.encode(state, m.remoteAlias)
    ipv4Address.encode(state, m)
  },
  decode (state) {
    return {
      alias: alias.decode(state),
      remoteAlias: alias.decode(state),
      ...ipv4Address.decode(state)
    }
  }
})

const close = message(10, 'close', {
  preencode (state, m) {
    alias.preencode(state, m.alias)
  },
  encode (state, m) {
    alias.encode(state, m.alias)
  },
  decode (state) {
    return {
      alias: alias.decode(state)
    }
  }
})

const closed = message(11, 'closed', close)

const batch = array(buffer)

const data = message(12, 'data', {
  preencode (state, m) {
    alias.preencode(state, m.alias)
    batch.preencode(state, m.data)
  },
  encode (state, m) {
    alias.encode(state, m.alias)
    batch.encode(state, m.data)
  },
  decode (state) {
    return {
      alias: alias.decode(state),
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

const noiseSend = message(21, 'noiseSend', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.alias)
    if (m.remoteAlias) alias.preencode(state, m.remoteAlias)
    buffer.preencode(state, m.data)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)

    if (m.remoteAlias) {
      flags |= 1
      alias.encode(state, m.remoteAlias)
    }

    buffer.encode(state, m.data)

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    return {
      alias: alias.decode(state),
      remoteAlias: (flags & 1) === 0 ? null : alias.decode(state),
      data: buffer.decode(state)
    }
  }
})

const noiseReceive = message(22, 'noiseReceive', {
  preencode (state, m) {
    alias.preencode(state, m.alias)
    buffer.preencode(state, m.data)
  },
  encode (state, m) {
    alias.encode(state, m.alias)
    buffer.encode(state, m.data)
  },
  decode (state) {
    return {
      alias: alias.decode(state),
      data: buffer.decode(state)
    }
  }
})

const noiseReply = message(23, 'noiseReply', {
  preencode (state, m) {
    state.end++ // Flags
    alias.preencode(state, m.alias)
    buffer.preencode(state, m.data)

    if (m.complete) {
      fixed32.preencode(state, m.remoteId)
      fixed32.preencode(state, m.holepunchSecret)
    }

    if (m.remotePublicKey) publicKey.preencode(state, m.remotePublicKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    alias.encode(state, m.alias)
    buffer.encode(state, m.data)

    if (m.complete) {
      flags |= 1
      fixed32.encode(state, m.remoteId)
      fixed32.encode(state, m.holepunchSecret)
    }

    if (m.remotePublicKey) {
      flags |= 2
      publicKey.encode(state, m.remotePublicKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const complete = (flags & 1) !== 0

    return {
      alias: alias.decode(state),
      data: buffer.decode(state),
      complete,
      remoteId: complete ? fixed32.decode(state) : null,
      holepunchSecret: complete ? fixed32.decode(state) : null,
      remotePublicKey: (flags & 2) === 0 ? null : publicKey.decode(state)
    }
  }
})

module.exports = {
  handshake,
  ping,
  pong,
  connect,
  connection,
  connected,
  accept,
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
  noiseSend,
  noiseReceive,
  noiseReply
}

function message (type, name, encoding = none) {
  return { ...encoding, type, name }
}
