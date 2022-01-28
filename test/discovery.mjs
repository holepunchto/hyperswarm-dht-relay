import test from 'brittle'

import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/with-relay.mjs'
import { withNode } from './helpers/with-node.mjs'

test('lookup', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')
    const keyPair = dht.constructor.keyPair()

    await dht.announce(topic, keyPair).finished()

    const query = node.lookup(topic)

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

test('announce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')

    await node.announce(topic, node.defaultKeyPair).finished()

    for await (const result of dht.lookup(topic)) {
      t.alike(result.peers, [
        {
          publicKey: node.defaultKeyPair.publicKey,
          relayAddresses: []
        }
      ])
    }
  })))
)

test('noncustodial announce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, { custodial: false }, async (node) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')

    await node.announce(topic, node.defaultKeyPair).finished()

    for await (const result of dht.lookup(topic)) {
      t.alike(result.peers, [
        {
          publicKey: node.defaultKeyPair.publicKey,
          relayAddresses: []
        }
      ])
    }
  })))
)

test('unannounce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, async (node) => {
    const topic = Buffer.alloc(32, 'topic')

    await dht.announce(topic, node.defaultKeyPair).finished()

    await node.unannounce(topic, node.defaultKeyPair)

    for await (const result of dht.lookup(topic)) {
      t.absent(result)
    }

    t.pass()
  })))
)

test('noncustodial unannounce', (t) =>
  withDHT((dht) => withRelay(dht, (relay) => withNode(relay, { custodial: false }, async (node) => {
    const topic = Buffer.alloc(32, 'topic')

    await dht.announce(topic, node.defaultKeyPair).finished()

    await node.unannounce(topic, node.defaultKeyPair)

    for await (const result of dht.lookup(topic)) {
      t.absent(result)
    }

    t.pass()
  })))
)
