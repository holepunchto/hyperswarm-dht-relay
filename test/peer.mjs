import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withSwarm } from './helpers/with-swarm.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withPeer } from './helpers/with-peer.mjs'

test('client mode', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, async (peer) => {
    const topic = Buffer.alloc(32)

    const join = t.test('join')
    join.plan(1)

    const io = t.test('read and write')
    io.plan(2)

    peer.on('connection', (socket, info) => {
      join.alike(info.publicKey, swarm.keyPair.publicKey)

      socket.write('ping')
      socket.once('data', (data) => io.alike(data.toString(), 'pong'))
    })

    swarm.on('connection', (socket, info) => {
      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    const discovery = swarm.join(topic, { client: false })
    await discovery.flushed()

    peer.join(topic, { server: false })
    await peer.flush()

    await join
    await io
  }))))
)

test('server mode', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, async (peer) => {
    const topic = Buffer.alloc(32)

    const join = t.test('join')
    join.plan(1)

    const io = t.test('read and write')
    io.plan(2)

    peer.on('connection', (socket, info) => {
      join.alike(info.publicKey, swarm.keyPair.publicKey)

      socket.write('ping')
      socket.once('data', (data) => io.alike(data.toString(), 'pong'))
    })

    swarm.on('connection', (socket, info) => {
      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    const discovery = peer.join(topic, { client: false })
    await discovery.flushed()

    swarm.join(topic, { server: false })
    await swarm.flush()

    await join
    await io
  }))))
)

test('direct connection', (t) =>
  withDHT((dht) => withSwarm(dht, (swarm) => withRelay(dht, (relay) => withPeer(relay, async (peer) => {
    await swarm.listen()

    const connection = peer.connect(swarm.keyPair.publicKey)

    const connect = t.test('connect')
    connect.plan(1)

    connection.on('open', () => connect.pass())

    await connect
  }))))
)
