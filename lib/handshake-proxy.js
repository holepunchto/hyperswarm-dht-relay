const buffer = require('b4a')
const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

const crypto = require('./crypto')

class HandshakeProxy {
  constructor (protocol, socketId, keyPair, remotePublicKey) {
    this._protocol = protocol

    this.socketId = socketId || crypto.randomId()
    this.isInitiator = !!remotePublicKey
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.remoteId = null
    this.holepunchSecret = null
  }

  async send (payload) {
    await this._protocol.noiseRequest({
      socket: this.socketId,
      publicKey: this.keyPair.publicKey,
      type: 0, // send
      data: encode(noisePayload, payload)
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (buffer.equals(this.keyPair.publicKey, message.publicKey)) {
          if (message.complete) this._onComplete(message)
          resolve(message.data)
        }
      })
    })
  }

  async recv (data) {
    await this._protocol.noiseRequest({
      socket: this.socketId,
      publicKey: this.keyPair.publicKey,
      type: 1, // recv
      data
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (buffer.equals(this.keyPair.publicKey, message.publicKey)) {
          if (message.complete) this._onComplete(message)
          resolve(decode(noisePayload, message.data))
        }
      })
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

  _onComplete (message) {
    this.remoteId = message.remoteId
    this.remotePublicKey = message.remotePublicKey
    this.holepunchSecret = message.holepunchSecret
  }
}

module.exports = {
  HandshakeProxy
}
