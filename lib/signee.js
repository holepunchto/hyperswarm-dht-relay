const buffer = require('b4a')
const sodium = require('sodium-universal')
const { NS } = require('@hyperswarm/dht/lib/constants')
const { encode } = require('compact-encoding')

const { peer } = require('./codecs')

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

function onSignAnnounce (message) {
  const data = signable(
    this._keyPair.publicKey,
    this._target,
    message.token,
    message.peerId,
    message.relayAddresses,
    NS.ANNOUNCE
  )

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  this._protocol.signature.send({
    id: message.id,
    signature
  })
}

function onSignUnannounce (message) {
  const data = signable(
    this._keyPair.publicKey,
    this._target,
    message.token,
    message.peerId,
    message.relayAddresses,
    NS.UNANNOUNCE
  )

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  this._protocol.signature.send({
    id: message.id,
    signature
  })
}

function signable (publicKey, target, token, id, relayAddresses, ns) {
  const signable = buffer.allocUnsafe(32 + 32)
  const hash = signable.subarray(32)

  signable.set(ns)

  sodium.crypto_generichash_batch(hash, [
    target,
    id,
    token,
    encode(peer, { publicKey, relayAddresses })
  ])

  return signable
}
