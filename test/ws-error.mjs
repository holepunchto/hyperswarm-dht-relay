import test from 'brittle'

import { Protocol } from '../lib/protocol.js'
import Stream from '../lib/transport/ws.js'

// A browser WebSocket that fails before it opens: it is already closed
// when its bare error event fires.
class FailingSocket extends EventTarget {
  constructor (url) {
    super()
    this.url = url
    this.readyState = 0
  }

  send () {}

  close () {}

  fail (event = new Event('error')) {
    this.readyState = 3
    this.dispatchEvent(event)
    this.dispatchEvent(new Event('close'))
  }
}

test('a socket that fails before it opens leaves no unhandled rejection', async (t) => {
  const rejections = []
  const onRejection = (reason) => rejections.push(reason)
  process.on('unhandledRejection', onRejection)
  t.teardown(() => process.off('unhandledRejection', onRejection))

  const socket = new FailingSocket('wss://relay.example/')
  const protocol = new Protocol(new Stream(true, socket))
  socket.fail()
  await new Promise((resolve) => setTimeout(resolve, 50))

  t.alike(rejections, [])
  await t.exception(protocol.ready(), /WebSocket error wss:\/\/relay\.example\//)
})

test('a Node ws error event keeps its failure as the cause and its message', async (t) => {
  const socket = new FailingSocket('ws://127.0.0.1:1/')
  const protocol = new Protocol(new Stream(true, socket))
  const failure = new Error('connect ECONNREFUSED 127.0.0.1:1')
  const event = new Event('error')
  event.error = failure
  event.message = failure.message
  socket.fail(event)

  const error = await protocol.ready().catch((error) => error)
  t.is(error.message, 'WebSocket error ws://127.0.0.1:1/: connect ECONNREFUSED 127.0.0.1:1')
  t.is(error.cause, failure)
})
