import test from 'brittle'
import net from 'net'

import { Relay } from '../lib/relay.js'
import { Node } from '../lib/node.js'
import { withDHT } from './helpers/with-dht.mjs'

test('tcp', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    const connect = t.test('connect')
    connect.plan(1)

    const io = t.test('read and write')
    io.plan(2)

    const server = dht.createServer()
    await server.listen()

    const socket = node.connect(server.address().publicKey)

    socket.on('open', () => {
      connect.alike(socket.remotePublicKey, server.address().publicKey)

      socket.write('ping')
      socket.once('data', (data) => io.alike(data.toString(), 'pong'))
    })

    server.on('connection', (socket) => {
      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    await Promise.all([connect, io])
  })))
)

async function withRelay (dht, cb) {
  const relay = new Relay(dht, net.createServer().listen(0))
  await relay.ready()

  try {
    await cb(relay)
  } finally {
    await relay.close()
  }
}

async function withNode (relay, cb) {
  const node = new Node(net.connect(relay._socket.address().port))
  await node.ready()

  try {
    await cb(node)
  } finally {
    await node.destroy()
  }
}
