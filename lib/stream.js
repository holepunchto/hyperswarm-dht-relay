const { Duplex } = require('streamx')
const buffer = require('b4a')

class Stream extends Duplex {
  constructor (node, protocol, alias, remoteAlias, isInitiator, keyPair, remotePublicKey, handshakeHash) {
    super({ mapWritable: toBuffer })

    this._node = node
    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias
    this._keyPair = keyPair

    this._opening = null

    this.noiseStream = this
    this.rawStream = this
    this.isInitiator = isInitiator
    this.remotePublicKey = remotePublicKey || null
    this.handshakeHash = handshakeHash || null

    this._onStreamClose = onStreamClose.bind(this)

    this._protocol._stream
      .once('close', this._onStreamClose)

    this._onOpen = onOpen.bind(this)
    this._onDestroy = onDestroy.bind(this)

    this.resume().pause()
  }

  get publicKey () {
    return this._keyPair.publicKey
  }

  alloc (len) {
    return buffer.allocUnsafe(len)
  }

  _open (cb) {
    if (this._remoteAlias === null) this._opening = cb
    else {
      cb(null)
      this.emit('connect')
    }
  }

  _continueOpen (err) {
    const cb = this._opening

    if (cb) {
      this._opening = null

      if (err) cb(err)
      else this._open(cb)
    } else {
      if (err) this.destroy(err)
    }
  }

  _writev (data, cb) {
    this._protocol.data.send({ alias: this._alias, data })
    cb(null)
  }

  _final (cb) {
    this._protocol.end.send({ alias: this._alias })
    cb(null)
  }

  _predestroy () {
    const paired = this._remoteAlias !== null

    if (paired) {
      this._protocol.destroy.send({ paired, alias: this._alias })
    }

    const err = new Error('Stream was destroyed')

    this._continueOpen(err)
  }
}

module.exports = {
  Stream
}

function onStreamClose () {
  this.destroy()
}

function onOpen (message) {
  this._remoteAlias = message.alias

  if (message.handshakeHash) {
    this.handshakeHash = message.handshakeHash
  } else {
    const handshake = this._node._handshakes.get(message.handshakeId)

    this._node._handshakes.delete(message.handshakeId)

    this.handshakeHash = handshake.hash

    this.noiseStream.start(this, {
      publicKey: this.publicKey,
      remotePublicKey: this.remotePublicKey,
      handshake: {
        publicKey: this.publicKey,
        remotePublicKey: this.remotePublicKey,
        hash: handshake.hash,
        tx: handshake.tx,
        rx: handshake.rx
      }
    })
  }

  this._continueOpen()
}

function onDestroy (message) {
  this.noiseStream.destroy(message.error && new Error(message.error))
}

function toBuffer (data) {
  return typeof data === 'string' ? buffer.from(data) : data
}
