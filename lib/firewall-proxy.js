const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode } = require('compact-encoding')

const { nextId } = require('./id')

class FirewallProxy {
  constructor (node, protocol, serverAlias) {
    this._node = node
    this._protocol = protocol
    this._serverAlias = serverAlias

    this._deny = deny.bind(this)

    this._requests = new Map()

    this._onDeny = onDeny.bind(this)
    this._onAccept = onAccept.bind(this)
  }
}

module.exports = {
  FirewallProxy
}

function deny (remotePublicKey, remoteHandshakePayload) {
  const id = nextId()

  this._protocol.incoming.send({
    id,
    serverAlias: this._serverAlias,
    remotePublicKey,
    payload: encode(noisePayload, remoteHandshakePayload)
  })

  return new Promise((resolve) => {
    this._requests.set(id, onResolve.bind(this, resolve, id))
  })
}

function onResolve (resolve, id, deny) {
  this._requests.delete(id)

  resolve(deny)
}

function onDeny (message) {
  const resolve = this._requests.get(message.id)

  if (resolve) resolve(true)
}

function onAccept (message) {
  const resolve = this._requests.get(message.id)

  if (resolve) resolve(false)
}
