const EventEmitter = require('events')
const SecretStream = require('@hyperswarm/secret-stream')

const { Protocol } = require('./protocol')
const { Signing } = require('./signing')
const { Socket } = require('./socket')

const crypto = require('./crypto')

const { nextId } = require('./id')

class Server extends EventEmitter {
  constructor (node, socket, protocol, options = {}) {
    super()

    this._node = node
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._firewall = options.firewall || allowAll
    this._custodial = options.custodial !== false

    this._connections = new Map()
    this._keyPair = null
    this._address = null
    this._listening = null
    this._closing = null

    this.id = nextId()

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)

    this._socket
      .on('close', this._onClose)

    this._protocol
      .on('destroy', this._onDestroy)
      .on('data', this._onData)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get closed () {
    return this._closing !== null
  }

  get publicKey () {
    return this._keyPair && this._keyPair.publicKey
  }

  async listen (keyPair = this._node.defaultKeyPair) {
    if (this._listening) return this._listening

    this._keyPair = keyPair

    if (!this._custodial) {
      this._node._signings.set(
        this.id,
        new Signing(this._protocol, crypto.hash(keyPair.publicKey), keyPair)
      )
    }

    await this._protocol.listen({
      server: this.id,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    this._listening = new Promise((resolve) => {
      this.once('listening', () => {
        if (!this._custodial) {
          this._node._signings.delete(this.id)
        }

        resolve()
      })
    })

    return this._listening
  }

  address () {
    return this._address
  }

  async close () {
    if (this._closing) return this._closing

    if (this._listening) await this._listening
    else {
      this._closing = Promise.resolve()
      return this._closing
    }

    await this._protocol.close({ server: this.id })

    if (!this._custodial) {
      this._node._signings.set(
        this.id,
        new Signing(this._protocol, crypto.hash(this._keyPair.publicKey), this._keyPair)
      )
    }

    this._closing = new Promise((resolve) => {
      this.once('close', () => {
        if (!this._custodial) {
          this._node._signings.delete(this.id)
        }

        resolve()
      })
    })

    return this._closing
  }
}

module.exports = {
  Server
}

function onClose () {
  this._socket
    .off('close', this._onClose)

  this._protocol
    .off('destroy', this._onDestroy)
    .off('data', this._onData)

  this.emit('close')
}

function onListening (message) {
  this._address = {
    publicKey: this.publicKey,
    host: message.host,
    port: message.port
  }

  this.emit('listening')
}

function onClosed () {
  this._onClose()
}

function onConnection (message) {
  const id = message.socket

  const socket = new Socket(this._protocol, id, false, message)

  this._connections.set(id, socket)

  socket.once('close', () => this._connections.delete(id))

  if (this._custodial) return this.emit('connection', socket)

  const handshake = this._node._handshakes.get(id)

  const encryptedSocket = new SecretStream(false, socket, {
    handshake: {
      publicKey: socket.publicKey,
      remotePublicKey: socket.remotePublicKey,
      hash: handshake.hash,
      tx: handshake.tx,
      rx: handshake.rx
    }
  })

  this.emit('connection', encryptedSocket)
}

function onDestroy (message) {
  const socket = this._connections.get(message.socket)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket)

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}

function allowAll () {
  return false
}
