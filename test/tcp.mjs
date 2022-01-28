import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/tcp/with-relay.mjs'

test('tcp', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const connect = t.test('connect')
    connect.plan(1)

    const io = t.test('read and write')
    io.plan(2)

    const server = a.createServer()
    await server.listen()

    const socket = b.connect(server.address().publicKey)

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

    await Promise.all([connect, io]).then(() => server.close())
  })))
)
