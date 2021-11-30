import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withNode } from './helpers/with-node.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'

test.skip('swarm join peer', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, (node) => withSwarm(node, async (swarm) => {
    const join = t.test('join, write, and close')
    join.plan(3)

    const server = dht.createServer()
    await server.listen()

    server.on('connection', (socket) => {
      socket
        .on('close', () => join.pass('server socket closed'))
        .on('data', (data) => {
          join.alike(data, Buffer.from('hello'))
          socket.end()
        })
    })

    swarm.on('connection', (socket) => {
      socket
        .on('close', () => join.pass('client socket closed'))
        .end('hello')
    })

    swarm.joinPeer(server.address().publicKey)

    await join.then(() => server.close())
  }))))
)
