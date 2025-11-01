import test from 'brittle'

import { withMatrix } from './helpers/with-matrix.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('client mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const connect = t.test('connect')
    connect.plan(6)

    const io = t.test('read and write')
    io.plan(2)

    const server = a.createServer()
    await server.listen()

    const socket = b.connect(server.publicKey)

    socket
      .once('connect', () => connect.pass('client connected'))
      .once('open', () => {
        connect.alike(socket.publicKey, b.defaultKeyPair.publicKey)
        connect.alike(socket.remotePublicKey, server.publicKey)

        socket
          .once('data', (data) => io.alike(data.toString(), 'pong'))
          .end('ping')
      })

    server.once('connection', (socket) => {
      connect.pass('server connected')
      connect.alike(socket.publicKey, server.publicKey)
      connect.alike(socket.remotePublicKey, b.defaultKeyPair.publicKey)

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  }))))
)

test('server mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true/*, false */] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const connect = t.test('connect')
    connect.plan(6)

    const io = t.test('read and write')
    io.plan(2)

    const server = b.createServer()
    await server.listen()

    const socket = a.connect(server.publicKey)

    socket
      .once('connect', () => connect.pass('client connected'))
      .once('open', () => {
        connect.alike(socket.publicKey, a.defaultKeyPair.publicKey)
        connect.alike(socket.remotePublicKey, server.publicKey)

        socket
          .once('data', (data) => io.alike(data.toString(), 'pong'))
          .end('ping')
      })

    server.once('connection', (socket) => {
      connect.pass('server connected')
      connect.alike(socket.publicKey, server.publicKey)
      connect.alike(socket.remotePublicKey, a.defaultKeyPair.publicKey)

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  }))))
)

test('connect to nonexisting key', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const e = t.test('error')
    e.plan(1)

    b.connect(Buffer.alloc(32, 'public key')).once('error', (err) => {
      e.is(err.message, 'PEER_NOT_FOUND: Peer not found')
    })

    await e
  })))
)
