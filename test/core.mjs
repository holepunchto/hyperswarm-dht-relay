import test from 'brittle'

import { withCore } from './helpers/with-core.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withPeer } from './helpers/with-peer.mjs'

test('core replication', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, (peer) => withCore((remoteCore) => withCore(remoteCore.key, async (localCore) => {
    const topic = Buffer.alloc(32, 'topic')

    const replication = t.test('replication')
    replication.plan(1)

    peer.on('connection', async (socket, info) => {
      localCore.replicate(socket)

      replication.alike(
        [
          await localCore.get(0),
          await localCore.get(1)
        ],
        [
          Buffer.from('hello'),
          Buffer.from('world')
        ]
      )
    })

    swarm.on('connection', async (socket, info) => {
      remoteCore.replicate(socket)

      await remoteCore.append(['hello', 'world'])
      await replication

      socket.end()
    })

    const discovery = swarm.join(topic, { client: false })
    await discovery.flushed()

    peer.join(topic, { server: false })
    await peer.flush()

    await replication
  }))))))
)
