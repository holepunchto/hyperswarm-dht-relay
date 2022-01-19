import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withNode } from './helpers/with-node.mjs'

test('announce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    const topic = Buffer.alloc(32, 'topic')
    const keyPair = dht.constructor.keyPair()

    await dht.announce(topic, keyPair).finished()

    const query = node.announce(topic, node.defaultKeyPair)

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

test('noncustodial announce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, { custodial: false }, async (node) => {
    const topic = Buffer.alloc(32, 'topic')
    const keyPair = dht.constructor.keyPair()

    await dht.announce(topic, keyPair).finished()

    const query = node.announce(topic, node.defaultKeyPair)

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
