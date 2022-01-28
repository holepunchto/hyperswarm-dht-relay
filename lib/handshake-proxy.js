const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

class HandshakeProxy {
  constructor (node, protocol, id, remoteStreamAlias, serverAlias, isInitiator, keyPair, remotePublicKey) {
    this._node = node
    this._protocol = protocol
    this._id = id
    this._remoteStreamAlias = remoteStreamAlias
    this._serverAlias = serverAlias

    this.isInitiator = isInitiator
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.remoteId = null
    this.holepunchSecret = null

    this._onNoiseReply = null
  }

  async send (payload) {
    await this._protocol.noiseSend({
      isInitiator: this.isInitiator,
      id: this._id,
      remoteStreamAlias: this._remoteStreamAlias,
      payload: encode(noisePayload, payload)
    })

    return new Promise((resolve, reject) => {
      this._onNoiseReply = onNoiseSendReply.bind(this, resolve, reject)
    })
  }

  async recv (payload) {
    await this._protocol.noiseReceive({
      isInitiator: this.isInitiator,
      id: this._id,
      serverAlias: this._serverAlias,
      payload
    })

    return new Promise((resolve, reject) => {
      this._onNoiseReply = onNoiseReceiveReply.bind(this, resolve, reject)
    })
  }

  final () {
    return {
      id: this._id,
      isInitiator: this.isInitiator,
      publicKey: this.keyPair.publicKey,
      remoteId: this.remoteId,
      remotePublicKey: this.remotePublicKey,
      holepunchSecret: this.holepunchSecret
    }
  }
}

module.exports = {
  HandshakeProxy
}

function onNoiseSendReply (resolve, reject, message) {
  this._onNoiseReply = null

  if (message.remotePublicKey) {
    this.remotePublicKey = message.remotePublicKey
  }

  if (message.complete) {
    this.remoteId = message.remoteId
    this.holepunchSecret = message.holepunchSecret
  }

  resolve(message.payload)
}

function onNoiseReceiveReply (resolve, reject, message) {
  this._onNoiseReply = null

  if (message.remotePublicKey) {
    this.remotePublicKey = message.remotePublicKey
  }

  if (message.complete) {
    this.remoteId = message.remoteId
    this.holepunchSecret = message.holepunchSecret
  }

  if (message.payload === null) {
    this._node._handshakes.delete(this._id)

    reject(new Error('Handshake denied'))
  } else {
    resolve({ id: message.id, ...decode(noisePayload, message.payload) })
  }
}
