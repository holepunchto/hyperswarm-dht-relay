#!/usr/bin/env node

const http = require('http')
const https = require('https')
const fs = require('fs')
const DHT = require('@hyperswarm/dht')
const { WebSocketServer } = require('ws')
const { relay } = require('@hyperswarm/dht-relay')
const Stream = require('@hyperswarm/dht-relay/ws')
const graceful = require('graceful-http')
const goodbye = require('graceful-goodbye')

const behindProxy = argv('behind-proxy', Boolean)
const port = argv('port', Number, 49443)
const host = argv('host', String)
const ssl = {
  cert: argv('cert', String),
  key: argv('key', String)
}

if ((ssl.cert && !ssl.key) || (!ssl.cert && ssl.key)) throw new Error('Requires both --cert and --key')

const node = new DHT()

if (ssl.cert) ssl.cert = fs.readFileSync(ssl.cert) // eg fullchain.pem
if (ssl.key) ssl.key = fs.readFileSync(ssl.key) // eg privkey.pem

const isSecure = ssl.cert && ssl.key
const server = (isSecure ? https : http).createServer({ ...ssl })
const wss = new WebSocketServer({ server })
let connections = 0

wss.on('connection', function (socket, req) {
  const remoteInfo = getRemoteAddress(req) + ':' + req.socket.remotePort

  connections++
  console.log('Connection opened (' + connections + ')', remoteInfo)

  socket.on('close', function () {
    connections--
    console.log('Connection closed (' + connections + ')', remoteInfo)
  })

  relay(node, new Stream(false, socket))
})

server.listen(port, host, function () {
  const addr = server.address()
  console.log('Relay is listening at host', addr.address + ' (' + addr.family + ')', 'on port', addr.port)
})

const close = graceful(server)

goodbye(async function () {
  await close()
  await node.destroy()
})

function getRemoteAddress (req) {
  if (behindProxy) return (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return req.socket.remoteAddress
}

function argv (name, type, defaultValue = null) {
  const i = process.argv.indexOf('--' + name)
  if (i === -1) return defaultValue

  if (type === Boolean) return true

  const hasValue = i < process.argv.length - 1
  if (hasValue) {
    let value = process.argv[i + 1]

    if (type === Number) {
      value = parseInt(value, 10)
      if (Number.isNaN(value)) throw new Error('Invalid CLI value for argument --' + name)
      return value
    }

    if (type === String) return (value || '').toString()

    throw new Error('Invalid CLI type for argument --' + name)
  }

  return defaultValue
}
