import Hyperswarm from 'hyperswarm'

export async function withSwarm (dht, cb) {
  const bootstrap = [
    { host: '127.0.0.1', port: dht.address().port }
  ]

  const swarm = new Hyperswarm({ bootstrap })

  try {
    await cb(swarm)
  } finally {
    await swarm.destroy()
  }
}
