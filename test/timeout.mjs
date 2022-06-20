import test from 'brittle'

import { withMatrix } from './helpers/with-matrix.mjs'
import { withDHT } from './helpers/with-dht.mjs'
import { withRelay } from './helpers/ws/with-relay.mjs'

test('timeout', (t) =>
  withDHT((a) => withRelay(a, (withDHT) => withMatrix({ custodial: [true, false] }, (options) => withDHT(options, async (b) => {
    t.comment(`custodial = ${options.custodial}`)

    const timeout = t.test('timeout')
    timeout.plan(2)

    const server = a.createServer()
    await server.listen()

    const socket = b.connect(server.publicKey)

    let i = 0

    socket.setTimeout(200)
    socket
      .once('error', (err) => {
        timeout.is(err.message, 'Stream timed out')
        timeout.is(i, 10, 'all messages received')
      })

    server.once('connection', (socket) => {
      socket.on('error', () => {})

      const tick = () => {
        if (++i < 10) socket.write(`${i}`)
        else clearInterval(interval)
      }

      const interval = setInterval(tick, 50)
    })

    await timeout.then(() => server.close())
  }))))
)
