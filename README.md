# Hyperswarm Relay

> :warning: This project is in its infancy and is therefore considered experimental.

Relaying the Hyperswarm DHT over other transport protocols to bring decentralized networking to everyone. The supported transport protocols are:

- [TCP](https://nodejs.org/api/net.html) (default)
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## Installation

```sh
npm install @hyperswarm/dht-relay
```

## Usage

To construct a WebSocket relay:

```js
import { WebSocketServer } from 'ws'
import DHT from '@hyperswarm/dht'
import { Relay } from '@hyperswarm/dht-relay'
import ws from '@hyperswarm/dht-relay/ws'

const dht = new DHT()

const relay = Relay.fromTransport(ws, dht, new WebSocketServer({ port: 8080 }))
```

To connect to a WebSocket relay:

```js
import { Node } from '@hyperswarm/dht-relay'
import ws from '@hyperswarm/dht-relay/ws'

const node = Node.fromTransport(ws, new WebSocket(`ws://127.0.0.1:8080`))
```

From here, the API matches that of the Hyperswarm DHT: <https://github.com/hyperswarm/dht#api>

## Protocol

> :warning: The protocol currently exchanges public **and** private keys between peers and the relay due to limitations in the underlying crypto APIs. In the future, only public keys will be exchanged and the relay will instead forward the Noise handshake request to peers for them to perform using their private key.

A reference implementation of the relay protocol can be found in the [`lib/protocol.js`](lib/protocol.js) module.

### Messages

Each message is prefixed with its `uint24` length and its `uint` type listed in parentheses. All types are specified as their corresponding [compact-encoding](https://github.com/compact-encoding) codec.

#### `handshake` (`0`)

1.  `fixed(32)` The public key of the peer
2.  `fixed(64)` The secret key

#### `error` (`1`)

1.  `string` The error message

#### `ping` (`2`)

_Empty_

#### `pong` (`3`)

_Empty_

#### `connect` (`4`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `fixed(64)` The secret key
4.  `fixed(32)` The public key of the remote peer

#### `connection` (`5`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `fixed(32)` The public key of the remote peer
4.  `fixed(64)` The Noise handshake hash

#### `destroy` (`6`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection

#### `listen` (`7`)

1.  `fixed(32)` The public key of the server
2.  `fixed(64)` The secret key

#### `listening` (`8`)

1.  `fixed(32)` The public key of the server
2.  [`ipv4Address`][ipv4Address] The address of the server

#### `close` (`9`)

1.  `fixed(32)` The public key of the server

#### `closed` (`10`)

1.  `fixed(32)` The public key of the server

#### `data` (`11`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `array(buffer)` The data sent

#### `result` (`12`)

1.  `fixed(4)` The query ID
2.  `raw` The query specific data

#### `finished` (`13`)

1.  `fixed(4)` The query ID

#### `lookup` (`14`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to look up

#### `announce` (`15`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to announce
3.  `fixed(32)` The public key to announce on
4.  `fixed(64)` The secret key

#### `unannounce` (`16`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to unannounce
3.  `fixed(32)` The public key that was announced on
4.  `fixed(64)` The secret key

#### `sign` (`17`)

1.  `fixed(4)` The request ID
2.  `fixed(32)` The public key of the signer
3.  `buffer` The buffer to sign

#### `signature` (`18`)

1.  `fixed(4)` The request ID
2.  `buffer` The signature of the signer

## License

ISC

[ipv4Address]: https://github.com/compact-encoding/compact-encoding-net#ipv4address
