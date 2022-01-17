const { HandshakeProxy } = require('./handshake-proxy')
const { SocketProxy } = require('./socket-proxy')

function createHandshake (protocol, socketId) {
  return (keyPair, remotePublicKey) => new HandshakeProxy(protocol, socketId, keyPair, remotePublicKey)
}

function createSecretStream (protocol, socketId) {
  return (isInitiator, rawStream, options) => new SocketProxy(protocol, socketId, isInitiator, rawStream, options)
}

module.exports = {
  createHandshake,
  createSecretStream
}
