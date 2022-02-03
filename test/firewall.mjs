import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('firewall deny', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const connect = t.test('connect and error')
    connect.plan(3)

    const server = b.createServer({
      firewall (remotePublicKey, remoteNoisePayload) {
        connect.alike(remotePublicKey, socket.publicKey)
        connect.alike(remoteNoisePayload, {
          version: 1,
          error: 0,
          firewall: 0,
          protocols: 3,
          holepunch: null,
          addresses: []
        })

        return true
      }
    })

    await server.listen()

    const socket = b.connect(server.publicKey)

    socket.once('error', (err) => {
      connect.is(err.message, 'Could not connect to peer')
    })

    await connect
  })))
)
