# Hyperswarm Relay

> :warning: This project is in its infancy and is therefore considered experimental.

Relaying the Hyperswarm DHT over other transport protocols to bring decentralized networking to everyone. The supported transport protocols are:

- [TCP](https://nodejs.org/api/net.html) (default)
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## Protocol

A reference implementation of the relay protocol can be found in the [`lib/protocol.js`](lib/protocol.js) module.

### Messages

#### `Handshake` (`0`)

1.  `fixed32` The public key of the peer
2.  `fixed64` The secret key of the peer

#### `Error` (`1`)

1.  `string` The error message

#### `Ping` (`2`)

_Empty_

#### `Pong` (`3`)

_Empty_

#### `Connect` (`4`)

1.  `fixed32` The public key of the connection
2.  `fixed64` The secret key of the connection
1.  `fixed32` The public key of the remote peer

#### `Connection` (`5`)

1.  `fixed32` The public key of the connection
2.  `fixed32` The public key of the remote peer
3.  `fixed64` The Noise handshake hash

#### `Destroy` (`6`)

1.  `fixed32` The public key of the connection

#### `Listen` (`7`)

1.  `fixed32` The public key of the server
2.  `fixed64` The secret key of the server

#### `Listening` (`8`)

1.  `fixed32` The public key of the server
2.  `ipv4Address` The address of the server

#### `Close` (`9`)

1.  `fixed32` The public key of the server

#### `Closed` (`10`)

1.  `fixed32` The public key of the server

#### `Data` (`11`)

1.  `fixed32` The public key of the connection
2.  `buffer` The data sent

#### `Result` (`12`)

1.  `uint` The query ID
2.  `raw` THe query specific data

#### `Finished` (`13`)

1.  `uint` The query ID

#### `Lookup` (`14`)

1.  `uint` The query ID
2.  `fixed32` The topic to look up

#### `Announce` (`15`)

1.  `uint` The query ID
2.  `fixed32` The topic to announce
3.  `fixed32` The public key to announce on
4.  `fixed64` The secret key

#### `Unannounce` (`15`)

1.  `uint` The query ID
2.  `fixed32` The topic to unannounce
3.  `fixed32` The public key that was announced on
4.  `fixed64` The secret key

## License

ISC
