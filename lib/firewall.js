const { noisePayload } = require('@hyperswarm/dht/lib/messages')
const { decode } = require('compact-encoding')

class Firewall {
  constructor (protocol, deny, handshakes) {
    this._protocol = protocol
    this._deny = deny
    this._handshakes = handshakes

    this._onIncoming = onIncoming.bind(this)
  }

  async deny (remotePublicKey, remoteHandshakePayload) {
    return this._deny(remotePublicKey, remoteHandshakePayload)
  }
}

module.exports = {
  Firewall
}

async function onIncoming (message) {
  const remoteHandshakePayload = decode(noisePayload, message.payload)

  if (await this.deny(message.remotePublicKey, remoteHandshakePayload)) {
    if (message.handshakeId) this._handshakes.delete(message.handshakeId)

    await this._protocol.deny({ id: message.id })
  } else {
    await this._protocol.accept({ id: message.id })
  }
}
