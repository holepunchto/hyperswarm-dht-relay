const EventEmitter = require('events')

const { Protocol } = require('./protocol')
const { ServerProxy } = require('./server-proxy')

class NodeProxy extends EventEmitter {
  constructor (dht, socket, protocol) {
    super()

    this._dht = dht
    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this._servers = new Set()
    this._connections = new Map()

    this._onError = onError.bind(this)
    this._onClose = onClose.bind(this)
    this._onConnect = onConnect.bind(this)
    this._onListen = onListen.bind(this)
    this._onDestroy = onDestroy.bind(this)
    this._onData = onData.bind(this)

    this._socket
      .on('error', this._onError)
      .on('close', this._onClose)

    this._protocol
      .on('connect', this._onConnect)
      .on('listen', this._onListen)
      .on('destroy', this._onDestroy)
      .on('data', this._onData)
  }

  destroy () {
    this._socket.destroy()
  }
}

module.exports = {
  NodeProxy
}

function onError (err) {
  this.emit('error', err)
}

async function onClose () {
  this._socket
    .off('error', this._onError)
    .off('close', this._onClose)

  this._protocol
    .off('connect', this._onConnect)
    .off('listen', this._onListen)
    .off('destroy', this._onDestroy)
    .off('data', this._onData)

  for (const server of this._servers) await server.close()
  for (const socket of this._connections.values()) socket.destroy()

  this.emit('close')
}

function onConnect (message) {
  const key = message.remotePublicKey.toString('hex')

  if (this._connections.has(key)) return

  const socket = this._dht.connect(message.remotePublicKey)
  this._connections.set(key, socket)

  const onError = async (err) => {
    await this._protocol.error(err)
  }

  const onClose = async () => {
    socket
      .off('error', onError)
      .off('close', onClose)
      .off('open', onOpen)
      .off('data', onData)

    this._connections.delete(key)

    await this._protocol.destroy(socket)
  }

  const onOpen = async () => {
    await this._protocol.connection(socket)
  }

  const onData = async (data) => {
    await this._protocol.data({ remotePublicKey: socket.remotePublicKey, data })
  }

  socket
    .on('error', onError)
    .on('close', onClose)
    .on('open', onOpen)
    .on('data', onData)
}

function onListen () {
  const server = new ServerProxy(this._dht, this._socket, this._protocol)
  this._servers.add(server)

  server.once('close', () => this._servers.delete(server))
}

function onDestroy (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) return socket.destroy()
}

function onData (message) {
  const socket = this._connections.get(
    message.remotePublicKey.toString('hex')
  )

  if (socket) socket.write(message.data)
}
