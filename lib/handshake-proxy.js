const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

class HandshakeProxy {
  constructor (protocol, alias, remoteAlias, isInitiator, keyPair, remotePublicKey) {
    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias

    this._resolve = null

    this.isInitiator = isInitiator
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.remoteId = null
    this.holepunchSecret = null

    this._onNoiseReply = null
  }

  async send (payload) {
    await this._protocol.noiseSend({
      alias: this._alias,
      remoteAlias: this._remoteAlias,
      data: encode(noisePayload, payload)
    })

    return new Promise((resolve) => {
      this._onNoiseReply = onNoiseSendReply.bind(this, resolve)
    })
  }

  async recv (data) {
    await this._protocol.noiseReceive({
      alias: this._alias,
      data
    })

    return new Promise((resolve) => {
      this._onNoiseReply = onNoiseReceiveReply.bind(this, resolve)
    })
  }

  final () {
    return {
      socketId: this.socketId,
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

  if (message.complete) {
    this.remoteId = message.remoteId
    this.remotePublicKey = message.remotePublicKey
    this.holepunchSecret = message.holepunchSecret
  }

  resolve(message.data)
}

function onNoiseReceiveReply (resolve, message) {
  this._onNoiseReply = null

  if (message.complete) {
    this.remoteId = message.remoteId
    this.remotePublicKey = message.remotePublicKey
    this.holepunchSecret = message.holepunchSecret
  }

  resolve(decode(noisePayload, message.data))
}
