import net from 'net'

import Stream from '../../../tcp.js'
import DHT, { relay } from '../../../index.js'

export async function withRelay (dht, cb) {
  const server = net.createServer().listen()

  server.on('connection', (socket) => relay(dht, new Stream(false, socket)))

  try {
    await cb(withDHT)
  } finally {
    server.close()
  }

  async function withDHT (options, cb) {
    if (typeof options === 'function') {
      cb = options
      options = {}
    }

    const socket = net.connect(server.address().port)

    const dht = new DHT(new Stream(true, socket), options)
    await dht.ready()

    try {
      await cb(dht)
    } finally {
      await dht.destroy()
    }
  }
}
