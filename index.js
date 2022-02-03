const { Protocol } = require('./lib/protocol')
const { Node } = require('./lib/node')
const { NodeProxy } = require('./lib/node-proxy')

module.exports = Node

module.exports.relay = function relay (dht, stream) {
  const protocol = new Protocol(stream)

  return new Promise((resolve) => {
    const onHandshake = (message) => {
      const node = new NodeProxy(dht, protocol, {
        publicKey: message.publicKey,
        secretKey: message.secretKey
      })

      resolve(node)
    }

    protocol
      .once('handshake', onHandshake)
      .heartbeat()
  })
}
