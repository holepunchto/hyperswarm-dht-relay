const EventEmitter = require('events')
const buffer = require('b4a')
const sodium = require('sodium-universal')
const SecretStream = require('@hyperswarm/secret-stream')
const { encode } = require('compact-encoding')
const { NS } = require('@hyperswarm/dht/lib/constants')

const { Protocol } = require('./protocol')
const { Socket } = require('./socket')
const { SocketSet } = require('./socket-set')

const messages = require('./messages')
const crypto = require('./crypto')

class Server extends EventEmitter {
  constructor (node, socket, protocol, options = {}) {
    super()

    this._node = node
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._firewall = options.firewall || allowAll
    this._custodial = options.custodial !== false

    this._connections = new SocketSet()
    this._keyPair = null
    this._address = null
    this._listening = null
    this._closing = null

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)
    this._onSignAnnounce = onSignAnnounce.bind(this)
    this._onSignUnannounce = onSignUnannounce.bind(this)

    this._socket
      .on('close', this._onClose)

    this._protocol
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
      .on('signAnnounce', this._onSignAnnounce)
      .on('signUnannounce', this._onSignUnannounce)

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get publicKey () {
    return this._keyPair && this._keyPair.publicKey
  }

  async listen (keyPair = this._node.defaultKeyPair) {
    if (this._listening) return this._listening

    this._keyPair = keyPair

    this._node._servers.add(keyPair.publicKey, this)

    await this._protocol.listen({
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    this._listening = new Promise((resolve) => {
      this.once('listening', () => resolve())
    })

    return this._listening
  }

  address () {
    return this._address
  }

  async close () {
    if (this._closing) return this._closing

    if (this._listening) await this._listening
    else return

    await this._protocol.close(this._keyPair)

    this._closing = new Promise((resolve) => {
      this.once('close', () => resolve())
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
    .off('signAnnounce', this._onSignAnnounce)
    .off('signUnannounce', this._onSignUnannounce)

  this.emit('close')
}

function onListening (message) {
  this._address = message
  this.emit('listening')
}

function onClosed () {
  this._onClose()
}

function onConnection (message) {
  const id = message.socket

  const socket = new Socket(this._protocol, id, message)

  this._connections.add(id, socket.publicKey, socket)

  socket.once('close', () => this._connections.delete(id, socket.publicKey))

  if (this._custodial) return this.emit('connection', socket)

  const handshake = this._node._handshakes.get(id, socket.publicKey)

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
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(message.socket, message.publicKey)

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}

async function onSignAnnounce (message) {
  const target = crypto.hash(this.publicKey)

  const peer = {
    publicKey: this.publicKey,
    relayAddresses: message.relayAddresses
  }

  const data = signable(target, message.token, message.peerId, peer, NS.ANNOUNCE)

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  await this._protocol.signature({
    id: message.id,
    signature
  })
}

async function onSignUnannounce (message) {
  const target = crypto.hash(this.publicKey)

  const peer = {
    publicKey: this.publicKey,
    relayAddresses: message.relayAddresses
  }

  const data = signable(target, message.token, message.peerId, peer, NS.UNANNOUNCE)

  const signature = buffer.allocUnsafe(64)

  sodium.crypto_sign_detached(signature, data, this._keyPair.secretKey)

  await this._protocol.signature({
    id: message.id,
    signature
  })
}

function allowAll () {
  return false
}

function signable (target, token, id, peer, ns) {
  const hash = buffer.allocUnsafe(32)

  sodium.crypto_generichash_batch(hash, [
    target,
    id,
    token,
    encode(messages.peer, peer)
  ], ns)

  return hash
}
