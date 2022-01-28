import { WebSocket } from 'ws'
import { Node } from '../../lib/node.js'

import * as ws from '../../ws.js'

export async function withNode (relay, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  const node = Node.fromTransport(ws, new WebSocket(`ws://127.0.0.1:${relay._socket.address().port}`), options)
  await node.ready()

  try {
    await cb(node)
  } finally {
    await node.destroy()
  }
}
