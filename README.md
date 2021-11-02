# Hyperswarm Relay

> :warning: This project is in its infancy and is therefore considered experimental.

Relaying Hyperswarm over WebSockets to bring decentralized networking to everyone.

## Protocol

A reference implementation of the relay protocol can be found in the [`lib/protocol.js`](lib/protocol.js) module.

### Messages

#### `Error` (`1`)

1.  `string` The error message

#### `Ping` (`2`)

_Empty_

#### `Pong` (`3`)

_Empty_

#### `Listen` (`4`)

_Empty_

#### `Join` (`5`)

1.  `uint8` Flags
    - `server`: `1`
    - `client`: `2`
2.  `fixed32` The topic to join

#### `Leave` (`6`)

1.  `fixed32` The topic to leave

#### `Connection` (`7`)

1.  `fixed32` The public key of the peer

#### `Data` (`8`)

1.  `fixed32` The public key of the sending peer
2.  `buffer` The data sent

#### `Flush` (`9`)

1.  `uint8` Flags
    - `topic`: `1`
2.  (if `topic` is set) `fixed32` The topic to flush

#### `Flushed` (`10`)

1.  `uint8` Flags
    - `topic`: `1`
2.  (if `topic` is set) `fixed32` The topic that was flushed

## License

ISC
