const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { decode } = require('compact-encoding')
const safetyCatch = require('safety-catch')

class Firewall {
  constructor (node, protocol, deny) {
    this._node = node
    this._protocol = protocol
    this._deny = deny

    this._onIncoming = onIncoming.bind(this)
  }
}

module.exports = {
  Firewall
}

async function onIncoming (message) {
  const remoteHandshakePayload = decode(noisePayload, message.payload)

  let deny = true
  try {
    deny = await this._deny(message.remotePublicKey, remoteHandshakePayload)
  } catch (err) {
    safetyCatch(err)
  }

  if (deny) this._protocol.deny.send({ id: message.id })
  else this._protocol.accept.send({ id: message.id })
}
