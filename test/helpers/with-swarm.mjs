import Hyperswarm from 'hyperswarm'

export async function withSwarm (dht, cb) {
  const swarm = new Hyperswarm({ dht })

  try {
    await cb(swarm)
  } finally {
    await swarm.destroy()
  }
}
