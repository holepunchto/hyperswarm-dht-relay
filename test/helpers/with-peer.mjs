import { WebSocket } from 'ws'
import { Peer } from '../../lib/peer.js'

export async function withPeer (relay, cb) {
  const peer = new Peer(new WebSocket(`ws://127.0.0.1:${relay._socket.address().port}`))
  await peer.ready()

  try {
    await cb(peer)
  } finally {
    await peer.close()
  }
}
