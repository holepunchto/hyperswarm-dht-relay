const EventEmitter = require('events')
const SecretStream = require('@hyperswarm/secret-stream')

const { Handshake } = require('./handshake')
const { Protocol } = require('./protocol')
const { Query } = require('./query')
const { Server } = require('./server')
const { Signee } = require('./signee')
const { Stream } = require('./stream')

const { announcers } = require('./codecs')
const { keyPair } = require('./crypto')
const { nextId } = require('./id')

class Node extends EventEmitter {
  constructor (stream, options = {}) {
    super()

    this._protocol = new Protocol(stream)
    this._custodial = options.custodial !== false

    this.defaultKeyPair = options.keyPair || keyPair()

    this._opening = new Map()
    this._servers = new Map()
    this._queries = new Map()
    this._connecting = new Map()
    this._connections = new Map()
    this._handshakes = new Map()
    this._signees = new Map()
    this._destroyed = false

    this._onStreamClose = onStreamClose.bind(this)

    this._protocol._stream
      .once('close', this._onStreamClose)

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
      .handshake.send({
        custodial: this._custodial,
        publicKey: this.defaultKeyPair.publicKey,
        secretKey: this.defaultKeyPair.secretKey
      })

    this.ready = async function ready () {
      await this._protocol.ready()
    }
  }

  get destroyed () {
    return this._destroyed !== null
  }

  connect (remotePublicKey, options = {}) {
    const { keyPair = this.defaultKeyPair } = options

    const alias = nextId()

    const stream = new Stream(
      this,
      this._protocol,
      alias,
      null,
      true,
      keyPair,
      remotePublicKey
    )

    this._connecting.set(alias, stream)

    const onClose = () => {
      stream
        .off('open', onOpen)

      this._connecting.delete(stream._alias)
      this._connections.delete(stream._remoteAlias)
    }

    const onOpen = () => {
      this._connecting.delete(stream._alias)
      this._connections.set(stream._remoteAlias, stream)
    }

    stream
      .once('close', onClose)
      .once('open', onOpen)

    this._protocol.connect.send({
      custodial: this._custodial,
      alias,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
      remotePublicKey
    })

    if (this._custodial) return stream

    const encryptedStream = new SecretStream(true, null, {
      publicKey: keyPair.publicKey,
      remotePublicKey,
      autoStart: false
    })

    encryptedStream
      .once('close', onClose)

    stream.noiseStream = encryptedStream

    return encryptedStream
  }

  createServer (options = {}, listener) {
    if (typeof options === 'function') {
      listener = options
      options = {}
    }

    options = { ...options, custodial: this._custodial }

    const alias = nextId()

    const server = new Server(this, this._protocol, alias, options)

    this._opening.set(alias, server)

    const onClose = () => {
      server
        .off('listening', onListening)

      this._opening.delete(server._alias)
      this._servers.delete(server._remoteAlias)
      this._signees.delete(server._alias)
    }

    const onListening = () => {
      this._opening.delete(server._alias)
      this._servers.set(server._remoteAlias, server)
    }

    server
      .once('close', onClose)
      .once('listening', onListening)

    if (listener) server.on('connection', listener)

    return server
  }

  lookup (topic) {
    const query = new Query(this._protocol, topic, announcers)

    this._queries.set(query.id, query)

    const onClose = () => {
      this._queries.delete(query.id)
    }

    query
      .once('close', onClose)

    this._protocol.lookup.send({ id: query.id, topic })

    return query
  }

  announce (topic, keyPair) {
    const query = new Query(this._protocol, topic, announcers)

    this._queries.set(query.id, query)
    this._signees.set(query.id, new Signee(this._protocol, topic, keyPair))

    const onClose = () => {
      this._queries.delete(query.id)
      this._signees.delete(query.id)
    }

    query
      .once('close', onClose)

    this._protocol.announce.send({
      custodial: this._custodial,
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey
    })

    return query
  }

  unannounce (topic, keyPair) {
    const query = new Query(this._protocol, topic, announcers)

    this._queries.set(query.id, query)
    this._signees.set(query.id, new Signee(this._protocol, topic, keyPair))

    const onClose = () => {
      this._queries.delete(query.id)
      this._signees.delete(query.id)
    }

    query
      .once('close', onClose)

    this._protocol.unannounce.send({
      custodial: this._custodial,
      id: query.id,
      topic,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey
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

    if (this._destroyed) return

    this._destroyed = true
    this._protocol._stream.destroy()
  }

  static keyPair (seed) {
    return keyPair(seed)
  }
}

module.exports = {
  Node
}

function onStreamClose () {
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
}

function onConnection (message) {
  const server = this._servers.get(message.serverAlias)

  if (server) server._onConnection(message)
}

function onIncoming (message) {
  const server = this._servers.get(message.serverAlias)

  if (server) server._firewall._onIncoming(message)
}

function onDestroy (message) {
  let stream

  if (message.paired) {
    stream = this._connections.get(message.alias)
  } else {
    stream = this._connecting.get(message.remoteAlias)
  }

  if (stream) stream._onDestroy(message)
}

function onListening (message) {
  const server = this._opening.get(message.remoteAlias)

  if (server) server._onListening(message)
}

function onClosed (message) {
  const server = this._servers.get(message.alias)

  if (server) server._onClosed(message)
}

function onOpen (message) {
  const stream = this._connecting.get(message.remoteAlias)

  if (stream) stream._onOpen(message)
}

function onEnd (message) {
  const stream = this._connections.get(message.alias)

  if (stream) stream.push(null)
}

function onData (message) {
  const stream = this._connections.get(message.alias)

  if (stream) {
    if (stream._timeout !== null) {
      stream._timeout.refresh()
    }

    for (const chunk of message.data) {
      if (stream._keepAlive === null || chunk.length > 0) {
        stream.push(chunk)
      }
    }
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
    const stream = this._connecting.get(message.remoteStreamAlias)

    if (stream) {
      const handshake = new Handshake(
        this,
        this._protocol,
        null,
        message.id,
        true,
        stream._keyPair,
        stream.remotePublicKey
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
