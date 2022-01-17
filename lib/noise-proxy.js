const { Duplex } = require('streamx')
const buffer = require('b4a')
const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

const crypto = require('./crypto')

class NoiseProxy {
  constructor (protocol) {
    this._protocol = protocol
  }

  createHandshake (socketId) {
    return (keyPair, remotePublicKey) => new HandshakeProxy(this._protocol, socketId, keyPair, remotePublicKey)
  }

  createSecretStream (socketId) {
    return (isInitiator, rawStream, options) => new SecretStreamProxy(this._protocol, socketId, isInitiator, rawStream, options)
  }
}

module.exports = {
  NoiseProxy
}

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

class SecretStreamProxy extends Duplex {
  constructor (protocol, socketId, isInitiator, rawStream, options) {
    super({ eagerOpen: true })

    this._protocol = protocol

    this.socketId = socketId
    this.noiseStream = this
    this.isInitiator = isInitiator
    this.rawStream = rawStream

    this.publicKey = options.publicKey
    this.remotePublicKey = options.remotePublicKey

    this._opening = null

    if (options.autoStart !== false) this.start(rawStream, options)
  }

  start (rawStream, options) {
    this.rawStream = rawStream

    if (options.handshake) {
      this.socketId = options.handshake.socketId
      this.publicKey = options.handshake.publicKey
      this.remotePublicKey = options.handshake.remotePublicKey
    }

    if (options.data) this.push(options.data)
    if (options.ended) this.push(null)

    this._continueOpen(null)
  }

  _open (cb) {
    if (this.rawStream === null) {
      this._opening = cb
      return
    }

    this.rawStream.on('data', (data) => this.push(data))

    cb(null)
  }

  _continueOpen (err) {
    if (err) this.destroy(err)

    const cb = this._opening

    if (cb) {
      this._opening = null
      this._open(cb)
    }
  }

  _write (chunk, cb) {
    this.rawStream.write(chunk, cb)
  }
}
