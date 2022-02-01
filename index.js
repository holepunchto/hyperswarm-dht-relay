const { Protocol } = require('./lib/protocol')
const { Node } = require('./lib/node')
const { NodeProxy } = require('./lib/node-proxy')

module.exports = Node

module.exports.relay = function relay (dht, stream) {
  const protocol = new Protocol(stream)

  return new Promise((resolve, reject) => {
    protocol.once('handshake', (keyPair) =>
      resolve(new NodeProxy(dht, stream, protocol, keyPair))
    )
  })
}
