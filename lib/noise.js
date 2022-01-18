const { HandshakeProxy } = require('./handshake-proxy')
const { SocketProxy } = require('./socket-proxy')

function createHandshake (protocol, socketId) {
  return function createHandshake (keyPair, remotePublicKey) {
    return new HandshakeProxy(protocol, socketId, keyPair, remotePublicKey)
  }
}

function createSecretStream (protocol, socketId) {
  return function createSecretStream (isInitiator, rawStream, options) {
    return new SocketProxy(protocol, socketId, isInitiator, rawStream, options)
  }
}

module.exports = {
  createHandshake,
  createSecretStream
}
