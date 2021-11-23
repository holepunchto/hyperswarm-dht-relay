const sodium = require('sodium-universal')
const buffer = require('b4a')

function keyPair (seed) {
  const publicKey = buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
  const secretKey = buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

  if (seed) sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed)
  else sodium.crypto_sign_keypair(publicKey, secretKey)

  return { publicKey, secretKey }
}

function randomBytes (length) {
  const b = buffer.alloc(length)
  sodium.randombytes_buf(b)
  return b
}

function randomId () {
  return randomBytes(4)
}

module.exports = {
  keyPair,
  randomBytes,
  randomId
}
