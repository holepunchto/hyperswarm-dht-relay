import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'

test('swarm join peer', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT((b) => withSwarm(b, async (swarm) => {
    const join = t.test('join, write, and close')
    join.plan(3)

    const server = a.createServer()
    await server.listen()

    server.once('connection', (socket) => {
      socket
        .once('close', () => join.pass('server socket closed'))
        .once('data', (data) => {
          join.alike(data, Buffer.from('hello'))
          socket.end()
        })
    })

    swarm.once('connection', (socket) => {
      socket
        .once('close', () => join.pass('client socket closed'))
        .end('hello')
    })

    swarm.joinPeer(server.publicKey)

    await join.then(() => server.close())
  }))))
)
