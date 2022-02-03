import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('client mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = a.createServer()
    await server.listen()

    const socket = b.connect(server.publicKey)

    socket.once('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.publicKey)

      socket
        .once('data', (data) => io.alike(data.toString(), 'pong'))
        .end('ping')
    })

    server.once('connection', (socket) => {
      connect.pass('server connected')

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('noncustodial client mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, async (b) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = a.createServer()
    await server.listen()

    const socket = b.connect(server.publicKey)

    socket.once('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.publicKey)

      socket
        .once('data', (data) => io.alike(data.toString(), 'pong'))
        .end('ping')
    })

    server.once('connection', (socket) => {
      connect.pass('server connected')

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('server mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = b.createServer()
    await server.listen()

    const socket = a.connect(server.publicKey)

    socket.once('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.publicKey)

      socket
        .once('data', (data) => io.alike(data.toString(), 'pong'))
        .end('ping')
    })

    server.once('connection', (socket) => {
      connect.pass('server connected')

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('noncustodial server mode', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, async (b) => {
    const connect = t.test('connect')
    connect.plan(3)

    const io = t.test('read and write')
    io.plan(2)

    const server = b.createServer()
    await server.listen()

    const socket = a.connect(server.publicKey)

    socket.once('open', () => {
      connect.pass('client connected')
      connect.alike(socket.remotePublicKey, server.publicKey)

      socket
        .once('data', (data) => io.alike(data.toString(), 'pong'))
        .end('ping')
    })

    server.once('connection', (socket) => {
      connect.pass('server connected')

      socket.once('data', (data) => {
        io.alike(data.toString(), 'ping')
        socket.end('pong')
      })
    })

    await Promise.all([connect, io]).then(() => server.close())
  })))
)

test('connect to nonexisting key', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const e = t.test('error')
    e.plan(1)

    b.connect(Buffer.alloc(32, 'public key')).once('error', (err) => {
      e.is(err.message, 'Could not find peer')
    })

    await e
  })))
)
