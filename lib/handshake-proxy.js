const buffer = require('b4a')
const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

class HandshakeProxy {
  constructor (protocol, socketId, serverId, keyPair, remotePublicKey) {
    this._protocol = protocol

    this.socketId = socketId
    this.serverId = serverId
    this.isInitiator = !!remotePublicKey
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey
    this.remoteId = null
    this.holepunchSecret = null
  }

  async send (payload) {
    await this._protocol.noiseRequest({
      type: 'send',
      isInitiator: this.isInitiator,
      socket: this.socketId,
      server: this.serverId,
      data: encode(noisePayload, payload)
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (buffer.equals(this.socketId, message.socket)) {
          if (message.complete) this._onComplete(message)
          resolve(message.data)
        }
      })
    })
  }

  async recv (data) {
    await this._protocol.noiseRequest({
      type: 'receive',
      isInitiator: this.isInitiator,
      socket: this.socketId,
      server: this.serverId,
      data
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (buffer.equals(this.socketId, message.socket)) {
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
