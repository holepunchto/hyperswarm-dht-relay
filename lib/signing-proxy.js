const { nextRelayId } = require('./id')

class SigningProxy {
  constructor (protocol, target, signer) {
    this._protocol = protocol
    this._target = target
    this._signer = signer

    this.signAnnounce = signAnnounce.bind(this)
    this.signUnannounce = signUnannounce.bind(this)
  }
}

module.exports = {
  SigningProxy
}

async function signAnnounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextRelayId()

  await this._protocol.signAnnounce({
    id,
    signer: this._signer,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    const onSignature = async (message) => {
      if (id === message.id) {
        this._protocol.off('signature', onSignature)
        resolve(message.signature)
      }
    }

    this._protocol.on('signature', onSignature)
  })
}

async function signUnannounce (target, token, peerId, { peer: relayAddresses }) {
  const id = nextRelayId()

  await this._protocol.signUnannounce({
    id,
    signer: this._signer,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    const onSignature = async (message) => {
      if (id === message.id) {
        this._protocol.off('signature', onSignature)
        resolve(message.signature)
      }
    }

    this._protocol.on('signature', onSignature)
  })
}
