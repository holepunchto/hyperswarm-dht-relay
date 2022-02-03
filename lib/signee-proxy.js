const { nextId } = require('./id')

class SigneeProxy {
  constructor (node, protocol, target, signee) {
    this._node = node
    this._protocol = protocol
    this._target = target
    this._signee = signee

    this._signAnnounce = signAnnounce.bind(this)
    this._signUnannounce = signUnannounce.bind(this)
  }
}

module.exports = {
  SigneeProxy
}

function signAnnounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextId()

  this._protocol.signAnnounce.send({
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

function signUnannounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextId()

  this._protocol.signUnannounce.send({
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
