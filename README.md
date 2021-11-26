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

const node = new DHT()

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

#### `Handshake` (`0`)

1.  `fixed(32)` The public key of the peer
2.  `fixed(64)` The secret key

#### `Error` (`1`)

1.  `string` The error message

#### `Ping` (`2`)

_Empty_

#### `Pong` (`3`)

_Empty_

#### `Connect` (`4`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `fixed(64)` The secret key
4.  `fixed(32)` The public key of the remote peer

#### `Connection` (`5`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `fixed(32)` The public key of the remote peer
4.  `fixed(64)` The Noise handshake hash

#### `Destroy` (`6`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection

#### `Listen` (`7`)

1.  `fixed(32)` The public key of the server
2.  `fixed(64)` The secret key

#### `Listening` (`8`)

1.  `fixed(32)` The public key of the server
2.  [`ipv4Address`][ipv4Address] The address of the server

#### `Close` (`9`)

1.  `fixed(32)` The public key of the server

#### `Closed` (`10`)

1.  `fixed(32)` The public key of the server

#### `Data` (`11`)

1.  `fixed(4)` The ID of the socket
2.  `fixed(32)` The public key of the connection
3.  `array(buffer)` The data sent

#### `Result` (`12`)

1.  `fixed(4)` The query ID
2.  `raw` The query specific data

#### `Finished` (`13`)

1.  `fixed(4)` The query ID

#### `Lookup` (`14`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to look up

#### `Announce` (`15`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to announce
3.  `fixed(32)` The public key to announce on
4.  `fixed(64)` The secret key

#### `Unannounce` (`15`)

1.  `fixed(4)` The query ID
2.  `fixed(32)` The topic to unannounce
3.  `fixed(32)` The public key that was announced on
4.  `fixed(64)` The secret key

## License

ISC

[ipv4Address]: https://github.com/compact-encoding/compact-encoding-net#ipv4address
