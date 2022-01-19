const { HandshakeProxy } = require('./handshake-proxy')
const { SocketProxy } = require('./socket-proxy')

function createHandshake (protocol, socketId, serverId) {
  return function createHandshake (keyPair, remotePublicKey) {
    return new HandshakeProxy(protocol, socketId, serverId, keyPair, remotePublicKey)
  }
}

function createSecretStream (protocol, socketId, serverId) {
  return function createSecretStream (isInitiator, rawStream, options) {
    return new SocketProxy(protocol, socketId, serverId, isInitiator, rawStream, options)
  }
}

module.exports = {
  createHandshake,
  createSecretStream
}
