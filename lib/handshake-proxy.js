const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

class HandshakeProxy {
  constructor (protocol, id, remoteSocketAlias, serverAlias, isInitiator, keyPair, remotePublicKey) {
    this._protocol = protocol
    this._id = id
    this._remoteSocketAlias = remoteSocketAlias
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
      remoteSocketAlias: this._remoteSocketAlias,
      data: encode(noisePayload, payload)
    })

    return new Promise((resolve) => {
      this._onNoiseReply = onNoiseSendReply.bind(this, resolve)
    })
  }

  async recv (data) {
    await this._protocol.noiseReceive({
      isInitiator: this.isInitiator,
      id: this._id,
      serverAlias: this._serverAlias,
      data
    })

    return new Promise((resolve) => {
      this._onNoiseReply = onNoiseReceiveReply.bind(this, resolve)
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

function onNoiseSendReply (resolve, message) {
  this._onNoiseReply = null

  if (message.remotePublicKey) {
    this.remotePublicKey = message.remotePublicKey
  }

  if (message.complete) {
    this.remoteId = message.remoteId
    this.holepunchSecret = message.holepunchSecret
  }

  resolve(message.data)
}

function onNoiseReceiveReply (resolve, message) {
  this._onNoiseReply = null

  if (message.remotePublicKey) {
    this.remotePublicKey = message.remotePublicKey
  }

  if (message.complete) {
    this.remoteId = message.remoteId
    this.holepunchSecret = message.holepunchSecret
  }

  resolve(decode(noisePayload, message.data))
}
