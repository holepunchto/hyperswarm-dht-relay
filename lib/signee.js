const buffer = require('b4a')
const sodium = require('sodium-universal')
const { NS } = require('@hyperswarm/dht/lib/constants')
const { encode } = require('compact-encoding')

const messages = require('./messages')

class Signee {
  constructor (protocol, target, keyPair) {
    this._protocol = protocol
    this._target = target
    this._keyPair = keyPair

    this._onSignAnnounce = onSignAnnounce.bind(this)
    this._onSignUnannounce = onSignUnannounce.bind(this)
  }
}

module.exports = {
  Signee
}

async function onSignAnnounce (message) {
  const peer = {
    publicKey: this._keyPair.publicKey,
    relayAddresses: message.relayAddresses
  }

  const data = signable(this._target, message.token, message.peerId, peer, NS.ANNOUNCE)

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  await this._protocol.signature({
    id: message.id,
    signature
  })
}

async function onSignUnannounce (message) {
  const peer = {
    publicKey: this._keyPair.publicKey,
    relayAddresses: message.relayAddresses
  }

  const data = signable(this._target, message.token, message.peerId, peer, NS.UNANNOUNCE)

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  await this._protocol.signature({
    id: message.id,
    signature
  })
}

function signable (target, token, id, peer, ns) {
  const hash = buffer.allocUnsafe(32)

  sodium.crypto_generichash_batch(hash, [
    target,
    id,
    token,
    encode(messages.peer, peer)
  ], ns)

  return hash
}
