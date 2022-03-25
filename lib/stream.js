const { Duplex } = require('streamx')
const buffer = require('b4a')
const Timeout = require('timeout-refresh')

class Stream extends Duplex {
  constructor (node, protocol, alias, remoteAlias, isInitiator, keyPair, remotePublicKey, handshakeHash) {
    super({ mapWritable: toBuffer })

    this._node = node
    this._protocol = protocol
    this._alias = alias
    this._remoteAlias = remoteAlias
    this._keyPair = keyPair

    this._opening = null
    this._openedDone = null
    this._timeout = null
    this._timeoutMs = 0
    this._keepAlive = null
    this._keepAliveMs = 0

    this.opened = new Promise((resolve) => { this._openedDone = resolve })

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

  setTimeout (ms) {
    if (!ms) ms = 0

    this._clearTimeout()
    this._timeoutMs = ms

    if (!ms) return

    this._timeout = Timeout.once(ms, this._destroyTimeout, this)
    this._timeout.unref()
  }

  setKeepAlive (ms) {
    if (!ms) ms = 0

    this._keepAliveMs = ms

    if (!ms) return

    this._keepAlive = Timeout.on(ms, this._sendKeepAlive, this)
    this._keepAlive.unref()
  }

  _open (cb) {
    if (this._remoteAlias === null) this._opening = cb
    else {
      this._resolveOpened(true)
      cb(null)
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

  _resolveOpened (opened) {
    const cb = this._openedDone

    if (cb) {
      this._openedDone = null

      cb(opened)

      if (opened) this.emit('connect')
    }
  }

  _writev (data, cb) {
    if (this._keepAlive !== null) this._keepAlive.refresh()

    this._protocol.data.send({ alias: this._alias, data })
    cb(null)
  }

  _final (cb) {
    this._clearKeepAlive()

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

  _destroy (cb) {
    this._clearKeepAlive()
    this._clearTimeout()
    this._resolveOpened(false)
    cb(null)
  }

  _destroyTimeout () {
    this.destroy(new Error('Stream timed out'))
  }

  _clearTimeout () {
    if (this._timeout === null) return

    this._timeout.destroy()
    this._timeout = null
    this._timeoutMs = 0
  }

  _clearKeepAlive () {
    if (this._keepAlive === null) return

    this._keepAlive.destroy()
    this._keepAlive = null
    this._keepAliveMs = 0
  }

  _sendKeepAlive () {
    this.write(this.alloc(0))
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
