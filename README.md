# Hyperswarm Relay

> :warning: This project is in its infancy and is therefore considered experimental.

Relaying the Hyperswarm DHT over WebSockets to bring decentralized networking to everyone.

## Protocol

A reference implementation of the relay protocol can be found in the [`lib/protocol.js`](lib/protocol.js) module.

### Messages

#### `Error` (`1`)

1.  `string` The error message

#### `Ping` (`2`)

_Empty_

#### `Pong` (`3`)

_Empty_

#### `Connect` (`4`)

1.  `fixed32` The public key of the remote peer

#### `Connection` (`5`)

1.  `fixed32` The public key of the peer
1.  `fixed32` The public key of the remote peer
1.  `fixed64` The Noise handshake hash

#### `Destroy` (`6`)

1.  `fixed32` The public key of the remote peer

#### `Listen` (`7`)

_Empty_

#### `Listening` (`8`)

1.  `fixed32` The public key of the server
2.  `ipv4Address` The address of the server

#### `Close` (`9`)

1.  `fixed32` The public key of the server

#### `Data` (`10`)

1.  `fixed32` The public key of the remote peer
2.  `buffer` The data sent

## License

ISC
