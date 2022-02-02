const { Readable } = require('streamx')

const { nextId } = require('./id')

class Query extends Readable {
  constructor (protocol, target, encoding) {
    super({ map: map(encoding) })

    this._protocol = protocol

    this.target = target
    this.id = nextId()

    this._onStreamClose = onStreamClose.bind(this)

    this._protocol._stream
      .once('close', this._onStreamClose)

    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)

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

function onStreamClose () {
  this.destroy()
}

function onResult (message) {
  this.push(message.data)
}

function onFinished () {
  this.push(null)
}
