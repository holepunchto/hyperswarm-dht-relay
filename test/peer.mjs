import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withPeer } from './helpers/with-peer.mjs'

test('join a swarm in client mode', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, async (peer) => {
    const topic = Buffer.alloc(32)

    const join = t.test('join')
    join.plan(1)

    peer.on('connection', (socket, info) => {
      join.alike(info.publicKey, swarm.keyPair.publicKey)
    })

    const discovery = swarm.join(topic, { client: false })
    await discovery.flushed()

    peer.join(topic, { server: false })
    await peer.flush()

    await join
  }))))
)

test.solo('join a swarm in server mode', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, async (peer) => {
    const topic = Buffer.alloc(32)

    const join = t.test('join')
    join.plan(1)

    peer.on('connection', (socket, info) => {
      join.alike(info.publicKey, swarm.keyPair.publicKey)
    })

    const discovery = peer.join(topic, { client: false })
    await discovery.flushed()

    swarm.join(topic, { server: false })
    await swarm.flush()

    await join
  }))))
)
