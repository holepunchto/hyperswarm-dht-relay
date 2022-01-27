const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode } = require('compact-encoding')

const { nextId } = require('./id')

class FirewallProxy {
  constructor (protocol, serverAlias, handshakes) {
    this._protocol = protocol
    this._serverAlias = serverAlias
    this._handshakes = handshakes

    this.deny = deny.bind(this)

    this._requests = new Map()

    this._onDeny = onDeny.bind(this)
    this._onAccept = onAccept.bind(this)
  }
}

module.exports = {
  FirewallProxy
}

async function deny (remotePublicKey, remoteHandshakePayload) {
  const id = nextId()

  const handshakeId = remoteHandshakePayload.id

  await this._protocol.incoming({
    id,
    serverAlias: this._serverAlias,
    remotePublicKey,
    payload: encode(noisePayload, remoteHandshakePayload),
    handshakeId
  })

  return new Promise((resolve) => {
    this._requests.set(id, onResolve.bind(this, resolve, id, handshakeId))
  })
}

function onResolve (resolve, id, handshakeId, deny) {
  this._requests.delete(id)

  if (handshakeId && deny) this._handshakes.delete(handshakeId)

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
