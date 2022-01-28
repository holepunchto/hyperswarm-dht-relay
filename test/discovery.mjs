import test from 'brittle'

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

test('announce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')

    await b.announce(topic, b.defaultKeyPair).finished()

    for await (const result of a.lookup(topic)) {
      t.alike(result.peers, [
        {
          publicKey: b.defaultKeyPair.publicKey,
          relayAddresses: []
        }
      ])
    }
  })))
)

test('noncustodial announce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, async (b) => {
    t.plan(3)

    const topic = Buffer.alloc(32, 'topic')

    await b.announce(topic, b.defaultKeyPair).finished()

    for await (const result of a.lookup(topic)) {
      t.alike(result.peers, [
        {
          publicKey: b.defaultKeyPair.publicKey,
          relayAddresses: []
        }
      ])
    }
  })))
)

test('unannounce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT(async (b) => {
    const topic = Buffer.alloc(32, 'topic')

    await a.announce(topic, b.defaultKeyPair).finished()

    await b.unannounce(topic, b.defaultKeyPair)

    for await (const result of a.lookup(topic)) {
      t.absent(result)
    }

    t.pass()
  })))
)

test('noncustodial unannounce', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withDHT({ custodial: false }, async (b) => {
    const topic = Buffer.alloc(32, 'topic')

    await a.announce(topic, b.defaultKeyPair).finished()

    await b.unannounce(topic, b.defaultKeyPair)

    for await (const result of a.lookup(topic)) {
      t.absent(result)
    }

    t.pass()
  })))
)
