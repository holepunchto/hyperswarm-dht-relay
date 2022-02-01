import { WebSocketServer, WebSocket } from 'ws'

import DHT, { relay } from '../../../index.js'
import Stream from '../../../ws.js'

export async function withRelay (dht, cb) {
  const server = new WebSocketServer({ port: 0 })

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

    const socket = new WebSocket(`ws://localhost:${server.address().port}`)

    const dht = new DHT(new Stream(true, socket), options)
    await dht.ready()

    try {
      await cb(dht)
    } finally {
      await dht.destroy()
    }
  }
}
