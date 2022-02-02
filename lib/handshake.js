const EventEmitter = require('events')
const buffer = require('b4a')
const NoiseHandshake = require('noise-handshake')
const SecretStream = require('@hyperswarm/secret-stream')
const { NS } = require('@hyperswarm/dht/lib/constants')
const curve = require('noise-curve-ed')
const sodium = require('sodium-universal')
const { decode } = require('compact-encoding')
const { noisePayload } = require('@hyperswarm/dht/lib/messages')

const NOISE_PROLOUGE = NS.PEER_HANDSHAKE

class Handshake extends EventEmitter {
  constructor (node, protocol, firewall, id, isInitiator, keyPair, remotePublicKey) {
    super()

    this._node = node
    this._protocol = protocol
    this._firewall = firewall
    this._id = id

    this.isInitiator = isInitiator
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.remoteId = null
    this.holepunchSecret = null
    this.complete = false

    this._handshake = new NoiseHandshake('IK', isInitiator, keyPair, { curve })
    this._handshake.initialise(NOISE_PROLOUGE, remotePublicKey)

    this._onComplete = onComplete.bind(this)
    this._onNoise = onNoise.bind(this)
    this._onNoiseSend = onNoiseSend.bind(this)
    this._onNoiseReceive = onNoiseReceive.bind(this)
  }

  get hash () {
    return this._handshake.hash
  }

  get tx () {
    return this._handshake.tx
  }

  get rx () {
    return this._handshake.rx
  }
}

module.exports = {
  Handshake
}

function onComplete () {
  this.complete = true

  this.emit('complete')

  const hash = this._handshake.hash

  this.remoteId = SecretStream.id(hash, true)
  this.holepunchSecret = buffer.allocUnsafe(32)

  sodium.crypto_generichash(this.holepunchSecret, hash, NS.PEER_HOLEPUNCH)
}

function onNoise (payload) {
  if (this._handshake.complete) {
    this._onComplete()
  } else {
    this.remotePublicKey = this._handshake.rs

    if (this._firewall) {
      const remoteHandshakePayload = decode(noisePayload, payload)

      if (this._firewall.deny(this.remotePublicKey, remoteHandshakePayload)) {
        this._node._handshakes.delete(this._id)

        return this._protocol.noiseReply.send({
          id: this._id,
          payload: null,
          remotePublicKey: this.remotePublicKey
        })
      }
    }
  }

  this._protocol.noiseReply.send({
    id: this._id,
    payload,
    isInitiator: this.isInitiator,
    complete: this.complete,
    remoteId: this.remoteId,
    holepunchSecret: this.holepunchSecret,
    remotePublicKey: this.remotePublicKey
  })
}

function onNoiseSend (message) {
  this._onNoise(this._handshake.send(message.payload))
}

function onNoiseReceive (message) {
  this._onNoise(this._handshake.recv(message.payload))
}
