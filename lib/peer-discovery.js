const buffer = require('b4a')

class PeerDiscovery {
  constructor (topic, protocol) {
    this._topic = topic
    this._protocol = protocol
  }

  async flushed () {
    this._protocol.flush({ topic: this._topic })

    await new Promise((resolve) => {
      const onFlushed = (message) => {
        if (buffer.equals(message.topic, this._topic)) {
          this._protocol.off('flushed', onFlushed)
          resolve()
        }
      }

      this._protocol.on('flushed', onFlushed)
    })
  }
}

module.exports = {
  PeerDiscovery
}
