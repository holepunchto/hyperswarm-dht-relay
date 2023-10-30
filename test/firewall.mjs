import test from 'brittle'

import { withMatrix } from './helpers/with-matrix.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('firewall deny', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const connect = t.test('connect and error')
    connect.plan(4)

    const server = b.createServer({
      firewall (remotePublicKey, remoteNoisePayload) {
        connect.alike(remotePublicKey, socket.publicKey)
        connect.alike(server.publicKey, socket.remotePublicKey)

        const {
          version,
          error
        } = remoteNoisePayload

        connect.is(version, 1)
        connect.is(error, 0)

        return true
      }
    })

    await server.listen()

    const socket = b.connect(server.publicKey)

    socket.once('error', (err) => {
      connect.is(err.message, 'PEER_CONNECTION_FAILED: Could not connect to peer')
    })

    await connect
  }))))
)

test('throw in firewall hook', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const connect = t.test('connect and error')
    connect.plan(1)

    const server = b.createServer({
      firewall () {
        throw new Error()
      }
    })

    await server.listen()

    const socket = b.connect(server.publicKey)

    socket.once('error', (err) => {
      connect.is(err.message, 'PEER_CONNECTION_FAILED: Could not connect to peer')
    })

    await connect
  }))))
)
