const EventEmitter = require('events')
const SecretStream = require('@hyperswarm/secret-stream')

const { Firewall } = require('./firewall')
const { Signee } = require('./signee')
const { Socket } = require('./socket')

const crypto = require('./crypto')
const { nextId } = require('./id')

class Server extends EventEmitter {
  constructor (node, socket, protocol, alias, options = {}) {
    super()

    this._node = node
    this._socket = socket
    this._protocol = protocol
    this._alias = alias

    this._firewall = new Firewall(protocol, options.firewall || allowAll)
    this._custodial = options.custodial !== false

    this._connections = new Map()
    this._keyPair = null
    this._address = null
    this._listening = null
    this._closing = null

    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)

    this._socket
      .on('close', this._onClose)

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
      this._node._signees.set(
        this._alias,
        new Signee(this._protocol, crypto.hash(keyPair.publicKey), keyPair)
      )

      this.once('close', () => {
        this._node._signees.delete(this._alias)
      })
    }

    await this._protocol.listen({
      alias: this._alias,
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
    else {
      this._closing = Promise.resolve()
      return this._closing
    }

    await this._protocol.close({ alias: this._alias })

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

async function onConnection (message) {
  const remoteAlias = message.alias
  const alias = nextId()

  const socket = new Socket(this._protocol, alias, false, message)

  this._connections.set(remoteAlias, socket)

  socket.once('close', () => this._connections.delete(remoteAlias))

  await this._protocol.connected({ alias, remoteAlias })

  if (!this._custodial) {
    const handshake = this._node._handshakes.get(message.handshakeId)

    this._node._handshakes.delete(message.handshakeId)

    const encryptedSocket = new SecretStream(false, socket, {
      publicKey: socket.publicKey,
      remotePublicKey: socket.remotePublicKey,
      handshake: {
        publicKey: socket.publicKey,
        remotePublicKey: socket.remotePublicKey,
        hash: handshake.hash,
        tx: handshake.tx,
        rx: handshake.rx
      }
    })

    socket.noiseStream = encryptedSocket
  }

  this.emit('connection', socket.noiseStream)
}

function allowAll () {
  return false
}
