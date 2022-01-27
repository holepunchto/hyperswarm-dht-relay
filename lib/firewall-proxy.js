const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { encode } = require('compact-encoding')

const { nextId } = require('./id')

class FirewallProxy {
  constructor (protocol, serverAlias) {
    this._protocol = protocol
    this._serverAlias = serverAlias

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

  await this._protocol.incoming({
    id,
    serverAlias: this._serverAlias,
    remotePublicKey,
    payload: encode(noisePayload, remoteHandshakePayload),
    handshakeId: remoteHandshakePayload.id
  })

  return new Promise((resolve) => {
    this._requests.set(id, resolve)
  })
}

function onDeny (message) {
  const deny = this._requests.get(message.id)

  if (deny) deny(true)
}

function onAccept (message) {
  const deny = this._requests.get(message.id)

  if (deny) deny(false)
}
