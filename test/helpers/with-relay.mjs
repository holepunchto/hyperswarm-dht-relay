import { WebSocketServer } from 'ws'
import { Relay } from '../../lib/relay.js'

export async function withRelay (dht, cb) {
  const bootstrap = [
    { host: '127.0.0.1', port: dht.address().port }
  ]

  const relay = new Relay(new WebSocketServer({ port: 0 }), { swarm: { bootstrap } })
  await relay.ready()

  try {
    await cb(relay)
  } finally {
    await relay.close()
  }
}
