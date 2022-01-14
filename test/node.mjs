import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withNode } from './helpers/with-node.mjs'

test('client mode', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = dht.createServer()
    await server.listen()

    const socket = node.connect(server.address().publicKey)

    socket.on('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.address().publicKey)

      socket.write('ping')
      socket.once('data', (data) => io.alike(data.toString(), 'pong'))
    })

    server.on('connection', (socket) => {
      connect.pass('server connected')

      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('noncustodial client mode', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, { custodial: false }, async (node) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = dht.createServer()
    await server.listen()

    const socket = node.connect(server.address().publicKey)

    socket.on('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.address().publicKey)

      socket.write('ping')
      socket.once('data', (data) => {
        io.alike(data.toString(), 'pong')
      })
    })

    server.on('connection', (socket) => {
      connect.pass('server connected')

      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('server mode', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = node.createServer()
    await server.listen()

    const socket = dht.connect(server.address().publicKey)

    socket.on('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.address().publicKey)

      socket.write('ping')
      socket.once('data', (data) => io.alike(data.toString(), 'pong'))
    })

    server.on('connection', (socket) => {
      connect.pass('server connected')

      socket.on('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.write('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)
