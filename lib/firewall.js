const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { decode } = require('compact-encoding')

class Firewall {
  constructor (node, protocol, deny) {
    this._node = node
    this._protocol = protocol

    this.deny = deny

    this._onIncoming = onIncoming.bind(this)
  }
}

module.exports = {
  Firewall
}

async function onIncoming (message) {
  const remoteHandshakePayload = decode(noisePayload, message.payload)

  if (await this.deny(message.remotePublicKey, remoteHandshakePayload)) {
    if (message.handshakeId) this._node._handshakes.delete(message.handshakeId)

    await this._protocol.deny({ id: message.id })
  } else {
    await this._protocol.accept({ id: message.id })
  }
}
