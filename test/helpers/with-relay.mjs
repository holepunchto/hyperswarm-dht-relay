import { WebSocketServer } from 'ws'
import { Relay } from '../../lib/relay.js'

import * as ws from '../../ws.js'

export async function withRelay (dht, cb) {
  const relay = Relay.fromTransport(ws, new WebSocketServer({ port: 0 }), dht)
  await relay.ready()

  try {
    await cb(relay)
  } finally {
    await relay.close()
  }
}
