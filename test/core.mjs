import test from 'brittle'

import { withCore } from './helpers/with-core.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withNode } from './helpers/with-node.mjs'

test('core replication', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, (node) => withCore((remoteCore) => withCore(remoteCore.key, async (localCore) => {
    const replication = t.test('replication')
    replication.plan(1)

    const server = dht.createServer()
    await server.listen()

    server.on('connection', async (socket) => {
      remoteCore.replicate(socket)

      await remoteCore.append(['hello', 'world'])
      await replication

      socket.end()
    })

    const socket = node.connect(server.address().publicKey)

    socket.on('open', async () => {
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

    await replication.then(() => server.close())
  })))))
)
