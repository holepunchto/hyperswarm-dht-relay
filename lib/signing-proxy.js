const buffer = require('b4a')

const crypto = require('./crypto')

class SigningProxy {
  constructor (protocol, target, publicKey) {
    this._protocol = protocol
    this._target = target
    this._publicKey = publicKey

    this.signAnnounce = signAnnounce.bind(this)
    this.signUnannounce = signUnannounce.bind(this)
  }
}

module.exports = {
  SigningProxy
}

async function signAnnounce (target, token, peerId, { peer: relayAddresses }) {
  const id = crypto.randomId()

  await this._protocol.signAnnounce({
    id,
    publicKey: this._publicKey,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    const onSignature = async (message) => {
      if (buffer.equals(id, message.id)) {
        this._protocol.off('signature', onSignature)
        resolve(message.signature)
      }
    }

    this._protocol.on('signature', onSignature)
  })
}

async function signUnannounce (target, token, peerId, { peer: relayAddresses }) {
  const id = crypto.randomId()

  await this._protocol.signUnannounce({
    id,
    publicKey: this._publicKey,
    token,
    peerId,
    relayAddresses
  })

  return new Promise((resolve) => {
    const onSignature = async (message) => {
      if (buffer.equals(id, message.id)) {
        this._protocol.off('signature', onSignature)
        resolve(message.signature)
      }
    }

    this._protocol.on('signature', onSignature)
  })
}
