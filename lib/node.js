const EventEmitter = require('events')
const SecretStream = require('@hyperswarm/secret-stream')

const { Handshake } = require('./handshake')
const { Protocol } = require('./protocol')
const { Query } = require('./query')
const { Server } = require('./server')
const { Signee } = require('./signee')
const { Socket } = require('./socket')

const m = require('./messages')
const crypto = require('./crypto')

const { nextId } = require('./id')

class Node extends EventEmitter {
  constructor (socket, options = {}) {
    super()

    this._socket = socket
    this._protocol = new Protocol(socket)
    this._custodial = options.custodial !== false

    this.defaultKeyPair = options.keyPair || crypto.keyPair()

    this._opening = new Map()
    this._servers = new Map()
    this._queries = new Map()
    this._connecting = new Map()
    this._connections = new Map()
    this._handshakes = new Map()
    this._signees = new Map()
    this._destroying = null

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onListening = onListening.bind(this)
    this._onClosed = onClosed.bind(this)
    this._onConnection = onConnection.bind(this)
    this._onIncoming = onIncoming.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onOpen = onOpen.bind(this)
    this._onEnd = onEnd.bind(this)
    this._onData = onData.bind(this)
    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)
    this._onSignAnnounce = onSignAnnounce.bind(this)
    this._onSignUnannounce = onSignUnannounce.bind(this)
    this._onNoiseSend = onNoiseSend.bind(this)
    this._onNoiseReceive = onNoiseReceive.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('listening', this._onListening)
      .on('closed', this._onClosed)
      .on('connection', this._onConnection)
      .on('incoming', this._onIncoming)
      .on('destroy', this._onDestroy)
      .on('open', this._onOpen)
      .on('end', this._onEnd)
      .on('data', this._onData)
      .on('result', this._onResult)
      .on('finished', this._onFinished)
      .on('signAnnounce', this._onSignAnnounce)
      .on('signUnannounce', this._onSignUnannounce)
      .on('noiseSend', this._onNoiseSend)
      .on('noiseReceive', this._onNoiseReceive)
      .alive()
      .handshake({
        publicKey: this.defaultKeyPair.publicKey,
        secretKey: this._custodial ? this.defaultKeyPair.secretKey : null
      })

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get destroyed () {
    return this._destroying !== null
  }

  connect (remotePublicKey, options = {}) {
    const { keyPair = this.defaultKeyPair } = options

    const alias = nextId()

    const socket = new Socket(this._protocol, alias, true, {
      publicKey: keyPair.publicKey,
      remotePublicKey
    })

    this._connecting.set(alias, socket)

    socket.once('close', () => this._connecting.delete(alias))

    this._protocol.connect({
      alias,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null,
      remotePublicKey
    })

    if (this._custodial) return socket

    const encryptedSocket = new SecretStream(true, null, {
      publicKey: keyPair.publicKey,
      remotePublicKey,
      autoStart: false
    })

    socket.noiseStream = encryptedSocket

    return encryptedSocket
  }

  createServer (options = {}, listener) {
    if (typeof options === 'function') {
      listener = options
      options = {}
    }

    options = { ...options, custodial: this._custodial }

    const alias = nextId()

    const server = new Server(this, this._socket, this._protocol, alias, options)

    this._opening.set(alias, server)

    server.once('close', () => this._opening.delete(alias))

    if (listener) server.on('connection', listener)

    return server
  }

  lookup (topic) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    query.once('close', () => this._queries.delete(query.id))

    this._protocol.lookup({ id: query.id, topic })

    return query
  }

  announce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    if (!this._custodial) {
      this._signees.set(query.id, new Signee(this._protocol, topic, keyPair))
    }

    query.once('close', () => {
      this._queries.delete(query.id)

      if (!this._custodial) {
        this._signees.delete(query.id)
      }
    })

    this._protocol.announce({
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    return query
  }

  unannounce (topic, keyPair) {
    const query = new Query(this._socket, this._protocol, topic, m.announcers)

    this._queries.set(query.id, query)

    if (!this._custodial) {
      this._signees.set(query.id, new Signee(this._protocol, topic, keyPair))
    }

    query.once('close', () => {
      this._queries.delete(query.id)

      if (!this._custodial) {
        this._signees.delete(query.id)
      }
    })

    this._protocol.unannounce({
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: this._custodial ? keyPair.secretKey : null
    })

    return query.resume().finished()
  }

  async destroy (options = {}) {
    if (options.force !== true) {
      const closing = []

      for (const server of this._servers.values()) {
        closing.push(server.close())
      }

      await Promise.allSettled(closing)
    }

    if (this._destroying) return this._destroying

    this._destroying = this._socket.destroy()

    return this._destroying
  }

  static fromTransport ({ Socket }, socket, options) {
    return new Node(new Socket(socket), options)
  }

  static keyPair (seed) {
    return crypto.keyPair(seed)
  }
}

module.exports = {
  Node
}

function onError (err) {
  this.emit('error', err)
}

async function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)

  this._protocol
    .off('listening', this._onListening)
    .off('closed', this._onClosed)
    .off('connection', this._onConnection)
    .off('incoming', this._onIncoming)
    .off('destroy', this._onDestroy)
    .off('open', this._onOpen)
    .off('end', this._onEnd)
    .off('data', this._onData)
    .off('result', this._onResult)
    .off('finished', this._onFinished)
    .off('signAnnounce', this._onSignAnnounce)
    .off('signUnannounce', this._onSignUnannounce)
    .off('noiseSend', this._onNoiseSend)
    .off('noiseReceive', this._onNoiseReceive)

  for (const server of this._servers.values()) await server.close()
  for (const query of this._queries.values()) query.destroy()
  for (const socket of this._connections.values()) socket.destroy()

  this.emit('close')
}

function onListening (message) {
  const server = this._opening.get(message.remoteAlias)

  if (server) {
    this._opening.delete(message.remoteAlias)

    this._servers.set(message.alias, server)

    server.once('close', () => this._servers.delete(message.alias))

    server._onListening(message)
  }
}

function onClosed (message) {
  const server = this._servers.get(message.alias)

  if (server) server._onClose()
}

async function onConnection (message) {
  const server = this._servers.get(message.serverAlias)

  if (server) server._onConnection(message)
}

function onOpen (message) {
  const socket = this._connecting.get(message.remoteAlias)

  if (socket) {
    this._connecting.delete(message.remoteAlias)

    this._connections.set(message.alias, socket)

    socket.once('close', () => this._connections.delete(message.alias))

    if (message.handshakeHash) {
      socket.handshakeHash = message.handshakeHash
    } else {
      const handshake = this._handshakes.get(message.handshakeId)

      this._handshakes.delete(message.handshakeId)

      socket.handshakeHash = handshake.hash

      socket.noiseStream.start(socket, {
        handshake: {
          publicKey: socket.publicKey,
          remotePublicKey: socket.remotePublicKey,
          hash: handshake.hash,
          tx: handshake.tx,
          rx: handshake.rx
        }
      })
    }

    socket.resume()
  }
}

function onEnd (message) {
  const socket = this._connections.get(message.alias)

  if (socket) socket.push(null)
}

function onIncoming (message) {
  const server = this._servers.get(message.serverAlias)

  if (server) server._firewall._onIncoming(message)
}

function onDestroy (message) {
  const socket = this._connections.get(message.alias)

  if (socket) {
    socket.destroy(message.error && new Error(message.error))
  }
}

function onData (message) {
  const socket = this._connections.get(message.alias)

  if (socket) {
    for (const chunk of message.data) socket.push(chunk)
  }
}

function onResult (message) {
  const query = this._queries.get(message.id)

  if (query) query._onResult(message)
}

function onFinished (message) {
  const query = this._queries.get(message.id)

  if (query) query._onFinished(message)
}

function onSignAnnounce (message) {
  const signee = this._signees.get(message.signee)

  if (signee) signee._onSignAnnounce(message)
}

function onSignUnannounce (message) {
  const signee = this._signees.get(message.signee)

  if (signee) signee._onSignUnannounce(message)
}

function onNoiseSend (message) {
  if (message.isInitiator) {
    const socket = this._connecting.get(message.remoteSocketAlias)

    if (socket) {
      const handshake = new Handshake(
        this,
        this._protocol,
        null,
        message.id,
        true,
        socket._keyPair,
        socket.remotePublicKey
      )

      this._handshakes.set(message.id, handshake)

      handshake._onNoiseSend(message)
    }
  } else {
    const handshake = this._handshakes.get(message.id)

    if (handshake) {
      handshake._onNoiseSend(message)
    }
  }
}

function onNoiseReceive (message) {
  if (message.isInitiator) {
    const handshake = this._handshakes.get(message.id)

    if (handshake) {
      handshake._onNoiseReceive(message)
    }
  } else {
    const server = this._servers.get(message.serverAlias)

    if (server) {
      const handshake = new Handshake(
        this,
        this._protocol,
        server._firewall,
        message.id,
        message.isInitiator,
        server._keyPair,
        null
      )

      this._handshakes.set(message.id, handshake)

      handshake._onNoiseReceive(message)
    }
  }
}
