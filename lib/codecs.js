const { fixed32, fixed64, uint32, buffer: nullableBuffer, array } = require('compact-encoding')
const { ipv4Address } = require('compact-encoding-net')
const { alloc } = require('b4a')

const buffer = {
  ...nullableBuffer,
  decode (state) {
    const b = nullableBuffer.decode(state)
    return b === null ? alloc(0) : b
  }
}

const publicKey = fixed32

const secretKey = fixed64

const topic = fixed32

const peerId = nullableBuffer

const id = uint32

const batch = array(buffer)

const token = fixed32

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

module.exports = {
  buffer,
  publicKey,
  secretKey,
  topic,
  peerId,
  id,
  batch,
  token,
  node,
  relayAddresses,
  peer,
  peers,
  announcers
}
