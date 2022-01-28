const { nextId } = require('./id')

class SigneeProxy {
  constructor (node, protocol, target, signee) {
    this._node = node
    this._protocol = protocol
    this._target = target
    this._signee = signee

    this.signAnnounce = signAnnounce.bind(this)
    this.signUnannounce = signUnannounce.bind(this)
  }
}

module.exports = {
  SigneeProxy
}

async function signAnnounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextId()

  await this._protocol.signAnnounce({
    id,
    signee: this._signee,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    this._node._signatures.set(id, { resolve })
  })
}

async function signUnannounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextId()

  await this._protocol.signUnannounce({
    id,
    signee: this._signee,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    this._node._signatures.set(id, { resolve })
  })
}
