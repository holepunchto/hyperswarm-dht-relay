import createTestnet from '@hyperswarm/testnet'

export async function withDHT (cb) {
  const testnet = await createTestnet(4)

  try {
    await cb(testnet.nodes[0])
  } finally {
    await testnet.destroy()
  }
}
