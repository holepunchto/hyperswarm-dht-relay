const { Readable } = require('streamx')

const { nextId } = require('./id')

class Query extends Readable {
  constructor (socket, protocol, target, encoding) {
    super({ map: map(encoding) })

    this._socket = socket
    this._protocol = protocol

    this.target = target
    this.id = nextId()

    this._onClose = onClose.bind(this)
    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)

    this._socket
      .on('close', this._onClose)

    const closing = new Promise((resolve, reject) => {
      const onClose = () => {
        this.off('error', onError)
        resolve()
      }

      const onError = (event) => {
        this.off('close', onClose)
        reject(event)
      }

      this
        .once('close', onClose)
        .once('error', onError)
    })

    this.finished = async function finished () {
      await closing
    }
  }
}

module.exports = {
  Query
}

function map (encoding) {
  return function mapQuery (buffer) {
    return encoding.decode({ start: 0, end: buffer.byteLength, buffer })
  }
}

function onClose () {
  this._socket
    .off('close', this._onClose)

  this.destroy()
}

function onResult (message) {
  this.push(message.data)
}

function onFinished () {
  this.push(null)
}
