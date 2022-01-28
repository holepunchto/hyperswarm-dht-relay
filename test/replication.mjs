import test from 'brittle'

import { withCore } from './helpers/with-core.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('core replication', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT((b) => withCore((remote) => withCore(remote.key, async (local) => {
    const replication = t.test('replication')
    replication.plan(1)

    const server = b.createServer()
    await server.listen()

    server.on('connection', async (socket) => {
      remote.replicate(socket)

      await remote.append(['hello', 'world'])
      await replication

      socket.end()
    })

    const socket = b.connect(server.address().publicKey)

    socket.on('open', async () => {
      local.replicate(socket)

      replication.alike(
        [
          await local.get(0),
          await local.get(1)
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

test('noncustodial core replication', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, (b) => withCore((remote) => withCore(remote.key, async (local) => {
    const replication = t.test('replication')
    replication.plan(1)

    const server = b.createServer()
    await server.listen()

    server.on('connection', async (socket) => {
      remote.replicate(socket)

      await remote.append(['hello', 'world'])
      await replication

      socket.end()
    })

    const socket = b.connect(server.address().publicKey)

    socket.on('open', async () => {
      local.replicate(socket)

      replication.alike(
        [
          await local.get(0),
          await local.get(1)
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
