import Protomux from 'protomux'
import SecretStream from '@hyperswarm/secret-stream'
import { none } from 'compact-encoding'
import test from 'brittle'

import DHT, { relay } from '../index.js'

import { withDHT } from './helpers/with-dht.mjs'

test('relay over existing muxer', (t) =>
  withDHT(async (dht) => {
    const io = t.test('dummy messages')
    io.plan(3)

    const a = new SecretStream(true)
    const b = new SecretStream(false)

    a.rawStream.pipe(b.rawStream).pipe(a.rawStream)

    const mux = (stream) => {
      const m = new Protomux(stream)

      const p = m.createChannel({ protocol: 'dummy' })

      const d = p.addMessage({
        encoding: none,
        onmessage: () => io.pass('dummy message received')
      })

      p.open()
      d.send()

      return m
    }

    relay(dht, mux(a))

    const proxy = new DHT(mux(b))

    const server = dht.createServer()
    await server.listen()

    proxy.connect(server.publicKey).end('hello world')

    server.once('connection', (socket) => {
      socket.once('data', (data) => {
        io.alike(data.toString(), 'hello world')
        socket.end()
      })
    })

    await io

    b.end()
    a.end()

    await server.close()
  })
)
