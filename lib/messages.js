const { fixed32, fixed64, none, string } = require('compact-encoding')
const { ipv4Address } = require('compact-encoding-net')

const { buffer, publicKey, secretKey, id, batch, topic, peerId, token, relayAddresses } = require('./codecs')

const handshake = {
  preencode (state, m) {
    state.end++ // Flags
    publicKey.preencode(state, m.publicKey)
    if (m.custodial) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    publicKey.encode(state, m.publicKey)

    if (m.custodial) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      publicKey: publicKey.decode(state),
      secretKey: custodial ? secretKey.decode(state) : null
    }
  }
}

const ping = none

const pong = none

const connect = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.alias)
    publicKey.preencode(state, m.publicKey)
    if (m.custodial) secretKey.preencode(state, m.secretKey)
    publicKey.preencode(state, m.remotePublicKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.alias)
    publicKey.encode(state, m.publicKey)

    if (m.custodial) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
    publicKey.encode(state, m.remotePublicKey)
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      alias: id.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: custodial ? secretKey.decode(state) : null,
      remotePublicKey: publicKey.decode(state)
    }
  }
}

const connection = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.alias)
    id.preencode(state, m.serverAlias)
    publicKey.preencode(state, m.remotePublicKey)
    if (m.custodial) fixed64.preencode(state, m.handshakeHash)
    else id.preencode(state, m.handshakeId)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.alias)
    id.encode(state, m.serverAlias)
    publicKey.encode(state, m.remotePublicKey)

    if (m.custodial) {
      flags |= 1
      fixed64.encode(state, m.handshakeHash)
    } else {
      id.encode(state, m.handshakeId)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      alias: id.decode(state),
      serverAlias: id.decode(state),
      remotePublicKey: publicKey.decode(state),
      handshakeHash: custodial ? fixed64.decode(state) : null,
      handshakeId: custodial ? null : id.decode(state)
    }
  }
}

const connected = {
  preencode (state, m) {
    id.preencode(state, m.alias)
    id.preencode(state, m.remoteAlias)
  },
  encode (state, m) {
    id.encode(state, m.alias)
    id.encode(state, m.remoteAlias)
  },
  decode (state) {
    return {
      alias: id.decode(state),
      remoteAlias: id.decode(state)
    }
  }
}

const incoming = {
  preencode (state, m) {
    id.preencode(state, m.id)
    id.preencode(state, m.serverAlias)
    publicKey.preencode(state, m.remotePublicKey)
    buffer.preencode(state, m.payload)
  },
  encode (state, m) {
    id.encode(state, m.id)
    id.encode(state, m.serverAlias)
    publicKey.encode(state, m.remotePublicKey)
    buffer.encode(state, m.payload)
  },
  decode (state) {
    return {
      id: id.decode(state),
      serverAlias: id.decode(state),
      remotePublicKey: publicKey.decode(state),
      payload: buffer.decode(state)
    }
  }
}

const deny = {
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

const accept = deny

const destroy = {
  preencode (state, m) {
    state.end++ // Flags
    if (m.paired) id.preencode(state, m.alias)
    else id.preencode(state, m.remoteAlias)
    if (m.error) string.preencode(state, m.error)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    if (m.paired) {
      flags |= 1
      id.encode(state, m.alias)
    } else {
      id.encode(state, m.remoteAlias)
    }

    if (m.error) {
      flags |= 2
      string.encode(state, m.error)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const paired = (flags & 1) !== 0

    return {
      paired,
      alias: paired ? id.decode(state) : null,
      remoteAlias: paired ? null : id.decode(state),
      error: (flags & 2) === 0 ? null : string.decode(state)
    }
  }
}

const listen = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.server)
    publicKey.preencode(state, m.publicKey)
    if (m.custodial) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.alias)
    publicKey.encode(state, m.publicKey)

    if (m.custodial) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      alias: id.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: custodial ? secretKey.decode(state) : null
    }
  }
}

const listening = {
  preencode (state, m) {
    id.preencode(state, m.alias)
    id.preencode(state, m.remoteAlias)
    ipv4Address.preencode(state, m)
  },
  encode (state, m) {
    id.encode(state, m.alias)
    id.encode(state, m.remoteAlias)
    ipv4Address.encode(state, m)
  },
  decode (state) {
    return {
      alias: id.decode(state),
      remoteAlias: id.decode(state),
      ...ipv4Address.decode(state)
    }
  }
}

const close = {
  preencode (state, m) {
    id.preencode(state, m.alias)
  },
  encode (state, m) {
    id.encode(state, m.alias)
  },
  decode (state) {
    return {
      alias: id.decode(state)
    }
  }
}

const closed = close

const open = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.alias)
    id.preencode(state, m.remoteAlias)
    if (m.custodial) fixed64.preencode(state, m.handshakeHash)
    else id.preencode(state, m.handshakeId)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.alias)
    id.encode(state, m.remoteAlias)

    if (m.custodial) {
      flags |= 1
      fixed64.encode(state, m.handshakeHash)
    } else {
      id.encode(state, m.handshakeId)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      alias: id.decode(state),
      remoteAlias: id.decode(state),
      handshakeHash: custodial ? fixed64.decode(state) : null,
      handshakeId: custodial ? null : id.decode(state)
    }
  }
}

const end = {
  preencode (state, m) {
    id.preencode(state, m.alias)
  },
  encode (state, m) {
    id.encode(state, m.alias)
  },
  decode (state) {
    return {
      alias: id.decode(state)
    }
  }
}

const data = {
  preencode (state, m) {
    id.preencode(state, m.alias)
    batch.preencode(state, m.data)
  },
  encode (state, m) {
    id.encode(state, m.alias)
    batch.encode(state, m.data)
  },
  decode (state) {
    return {
      alias: id.decode(state),
      data: batch.decode(state)
    }
  }
}

const result = {
  preencode (state, m) {
    id.preencode(state, m.id)
    buffer.preencode(state, m.data)
  },
  encode (state, m) {
    id.encode(state, m.id)
    buffer.encode(state, m.data)
  },
  decode (state) {
    return {
      id: id.decode(state),
      data: buffer.decode(state)
    }
  }
}

const finished = {
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

const lookup = {
  preencode (state, m) {
    id.preencode(state, m.id)
    topic.preencode(state, m.topic)
  },
  encode (state, m) {
    id.encode(state, m.id)
    topic.encode(state, m.topic)
  },
  decode (state) {
    return {
      id: id.decode(state),
      topic: topic.decode(state)
    }
  }
}

const announce = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.id)
    topic.preencode(state, m.topic)
    publicKey.preencode(state, m.publicKey)
    if (m.custodial) secretKey.preencode(state, m.secretKey)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.id)
    topic.encode(state, m.topic)
    publicKey.encode(state, m.publicKey)

    if (m.custodial) {
      flags |= 1
      secretKey.encode(state, m.secretKey)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const custodial = (flags & 1) !== 0

    return {
      custodial,
      id: id.decode(state),
      topic: topic.decode(state),
      publicKey: publicKey.decode(state),
      secretKey: custodial ? secretKey.decode(state) : null
    }
  }
}

const unannounce = announce

const signAnnounce = {
  preencode (state, m) {
    id.preencode(state, m.id)
    id.preencode(state, m.signee)
    token.preencode(state, m.token)
    peerId.preencode(state, m.peerId)
    relayAddresses.preencode(state, m.relayAddresses)
  },
  encode (state, m) {
    id.encode(state, m.id)
    id.encode(state, m.signee)
    token.encode(state, m.token)
    peerId.encode(state, m.peerId)
    relayAddresses.encode(state, m.relayAddresses)
  },
  decode (state) {
    return {
      id: id.decode(state),
      signee: id.decode(state),
      token: token.decode(state),
      peerId: peerId.decode(state),
      relayAddresses: relayAddresses.decode(state)
    }
  }
}

const signUnannounce = signAnnounce

const signature = {
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
}

const noiseSend = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.id)
    if (m.isInitiator) id.preencode(state, m.remoteStreamAlias)
    buffer.preencode(state, m.payload)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.id)

    if (m.isInitiator) {
      flags |= 1
      id.encode(state, m.remoteStreamAlias)
    }

    buffer.encode(state, m.payload)

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const isInitiator = (flags & 1) !== 0

    return {
      isInitiator,
      id: id.decode(state),
      remoteStreamAlias: isInitiator ? id.decode(state) : null,
      payload: buffer.decode(state)
    }
  }
}

const noiseReceive = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.id)
    if (!m.isInitiator) id.preencode(state, m.serverAlias)
    buffer.preencode(state, m.payload)
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.id)

    if (m.isInitiator) {
      flags |= 1
    } else {
      id.encode(state, m.serverAlias)
    }

    buffer.encode(state, m.payload)

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const isInitiator = (flags & 1) !== 0

    return {
      isInitiator,
      id: id.decode(state),
      serverAlias: isInitiator ? null : id.decode(state),
      payload: buffer.decode(state)
    }
  }
}

const noiseReply = {
  preencode (state, m) {
    state.end++ // Flags
    id.preencode(state, m.id)
    buffer.preencode(state, m.payload)

    if (!m.isInitiator && !m.complete) publicKey.preencode(state, m.remotePublicKey)

    if (m.complete) {
      fixed32.preencode(state, m.remoteId)
      fixed32.preencode(state, m.holepunchSecret)
    }
  },
  encode (state, m) {
    const s = state.start++
    let flags = 0

    id.encode(state, m.id)
    buffer.encode(state, m.payload)

    if (m.isInitiator) flags |= 1

    if (!m.isInitiator && !m.complete) {
      publicKey.encode(state, m.remotePublicKey)
    }

    if (m.complete) {
      flags |= 2
      fixed32.encode(state, m.remoteId)
      fixed32.encode(state, m.holepunchSecret)
    }

    state.buffer[s] = flags
  },
  decode (state) {
    const flags = state.buffer[state.start++]

    const isInitiator = (flags & 1) !== 0
    const complete = (flags & 2) !== 0

    return {
      isInitiator,
      complete,
      id: id.decode(state),
      payload: buffer.decode(state),
      remotePublicKey: isInitiator || complete ? null : publicKey.decode(state),
      remoteId: complete ? fixed32.decode(state) : null,
      holepunchSecret: complete ? fixed32.decode(state) : null
    }
  }
}

module.exports = {
  handshake,
  ping,
  pong,
  connect,
  connection,
  connected,
  incoming,
  deny,
  accept,
  destroy,
  listen,
  listening,
  close,
  closed,
  open,
  end,
  data,
  result,
  finished,
  lookup,
  announce,
  unannounce,
  signAnnounce,
  signUnannounce,
  signature,
  noiseSend,
  noiseReceive,
  noiseReply
}
