import test from 'brittle'

import { withMatrix } from './helpers/with-matrix.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('lookup', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')
    const keyPair = a.constructor.keyPair()

    await a.announce(topic, keyPair).finished()

    const query = b.lookup(topic)

    for await (const result of query) {
      t.alike(result.peers, [
        {
          publicKey: keyPair.publicKey,
          relayAddresses: []
        }
      ])
    }
  })))
)

test.skip('announce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const r = t.test('results')
    r.plan(3)

    const topic = Buffer.alloc(32, options.custodial)

    await b.announce(topic, b.defaultKeyPair).finished()

    for await (const result of a.lookup(topic)) {
      r.alike(
        result.peers,
        [
          {
            publicKey: b.defaultKeyPair.publicKey,
            relayAddresses: []
          }
        ],
        `result from ${result.from.host}:${result.from.port}`
      )
    }
  }))))
)

test.skip('unannounce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const r = t.test('results')
    r.plan(1)

    const topic = Buffer.alloc(32, options.custodial)

    await a.announce(topic, b.defaultKeyPair).finished()

    await b.unannounce(topic, b.defaultKeyPair)

    for await (const result of a.lookup(topic)) {
      r.absent(result)
    }

    r.pass('no results')
  }))))
)
