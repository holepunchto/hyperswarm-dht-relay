const { Duplex } = require('streamx')
const buffer = require('b4a')
const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode, decode } = require('compact-encoding')

class NoiseProxy {
  constructor (protocol) {
    this._protocol = protocol
  }

  createHandshake (socketId, keyPair, remotePublicKey) {
    return new HandshakeProxy(this._protocol, socketId, keyPair, remotePublicKey)
  }

  createSecretStream (socketId, isInitiator, rawStream, options) {
    return new SecretStreamProxy(this._protocol, socketId, isInitiator, rawStream, options)
  }
}

module.exports = {
  NoiseProxy
}

class HandshakeProxy {
  constructor (protocol, socketId, keyPair, remotePublicKey) {
    this._protocol = protocol
    this._socketId = socketId

    this.isInitiator = !!remotePublicKey
    this.keyPair = keyPair
    this.remotePublicKey = remotePublicKey

    this._remoteId = null
    this._holepunchSecret = null
  }

  async send (payload) {
    await this._protocol.noiseRequest({
      socket: this._socketId,
      publicKey: this.keyPair.publicKey,
      type: 0, // send
      data: encode(noisePayload, payload)
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (
          buffer.equals(this._socketId, message.socket) &&
          buffer.equals(this.keyPair.publicKey, message.publicKey)
        ) {
          resolve(message.data)
        }
      })
    })
  }

  async recv (data) {
    await this._protocol.noiseRequest({
      socket: this._socketId,
      publicKey: this.keyPair.publicKey,
      type: 1, // recv
      data
    })

    return new Promise((resolve) => {
      this._protocol.on('noiseResponse', (message) => {
        if (
          buffer.equals(this._socketId, message.socket) &&
          buffer.equals(this.keyPair.publicKey, message.publicKey)
        ) {
          const data = message.data.subarray(0, message.data.length - 64)
          const remoteId = message.data.subarray(message.data.length - 64, message.data.length - 32)
          const holepunchSecret = message.data.subarray(message.data.length - 32)

          this._remoteId = remoteId
          this._holepunchSecret = holepunchSecret

          resolve(decode(noisePayload, data))
        }
      })
    })
  }

  final () {
    return {
      isInitiator: this.isInitiator,
      remoteId: this._remoteId,
      holepunchSecret: this._holepunchSecret
    }
  }
}

class SecretStreamProxy extends Duplex {
  constructor (protocol, socketId, isInitiator, rawStream, options) {
    super({ eagerOpen: true })

    this._protocol = protocol
    this._socketId = socketId

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
