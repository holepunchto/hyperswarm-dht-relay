const EventEmitter = require('events')
const buffer = require('b4a')
const NoiseHandshake = require('noise-handshake')
const SecretStream = require('@hyperswarm/secret-stream')
const { NS } = require('@hyperswarm/dht/lib/constants')
const curve = require('noise-curve-ed')
const sodium = require('sodium-universal')

const NOISE_PROLOUGE = NS.PEER_HANDSHAKE

class Handshake extends EventEmitter {
  constructor (protocol, socketId, isInitiator, keyPair, remotePublicKey) {
    super()

    this._protocol = protocol

    this.socketId = socketId
    this.isInitiator = isInitiator
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.complete = false

    this._handshake = new NoiseHandshake('IK', isInitiator, keyPair, { curve })
    this._handshake.initialise(NOISE_PROLOUGE, remotePublicKey)

    this._onNoiseRequest = onNoiseRequest.bind(this)
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

async function onNoiseRequest (message) {
  let data

  switch (message.type) {
    case 0: { // send
      data = this._handshake.send(message.data)
      break
    }

    case 1: { // recv
      data = this._handshake.recv(message.data)
      break
    }
  }

  let remoteId = null
  let holepunchSecret = null

  if (this._handshake.complete) {
    this._protocol.off('noiseRequest', this._onNoiseRequest)
    this.complete = true
    this.emit('complete')

    remoteId = SecretStream.id(this._handshake.hash, true)
    this.remotePublicKey = this._handshake.rs
    holepunchSecret = buffer.allocUnsafe(32)

    sodium.crypto_generichash(holepunchSecret, this._handshake.hash, NS.PEER_HOLEPUNCH)
  }

  await this._protocol.noiseResponse({
    socket: message.socket,
    publicKey: message.publicKey,
    data,
    complete: this.complete,
    remoteId,
    remotePublicKey: this.remotePublicKey,
    holepunchSecret
  })
}
