import DHT from '@hyperswarm/dht'

export async function withDHT (cb) {
  const dht = new DHT({ ephemeral: true, bootstrap: [] })
  await dht.ready()

  const aux = []
  const bootstrap = [
    { host: '127.0.0.1', port: dht.address().port }
  ]

  for (let i = 0; i < 3; i++) {
    const dht = aux[i] = new DHT({ ephemeral: false, bootstrap })
    await dht.ready()
  }

  try {
    await cb(dht)
  } finally {
    for (const dht of aux) await dht.destroy()
    await dht.destroy()
  }
}
