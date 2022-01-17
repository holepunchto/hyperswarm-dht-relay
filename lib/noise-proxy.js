const { HandshakeProxy } = require('./handshake-proxy')
const { SocketProxy } = require('./socket-proxy')

class NoiseProxy {
  constructor (protocol) {
    this._protocol = protocol
  }

  createHandshake (socketId) {
    return (keyPair, remotePublicKey) => new HandshakeProxy(this._protocol, socketId, keyPair, remotePublicKey)
  }

  createSecretStream (socketId) {
    return (isInitiator, rawStream, options) => new SocketProxy(this._protocol, socketId, isInitiator, rawStream, options)
  }
}

module.exports = {
  NoiseProxy
}
