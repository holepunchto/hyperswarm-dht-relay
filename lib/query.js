const { Readable } = require('streamx')
const buffer = require('b4a')

const { Protocol } = require('./protocol')

const crypto = require('./crypto')

class Query extends Readable {
  constructor (socket, protocol, target, encoding) {
    super({ map: map(encoding) })

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this.target = target
    this.id = crypto.randomId()

    this._onClose = onClose.bind(this)
    this._onResult = onResult.bind(this)
    this._onFinished = onFinished.bind(this)

    this._socket
      .on('close', this._onClose)

    this._protocol
      .on('result', this._onResult)
      .on('finished', this._onFinished)

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

  this._protocol
    .off('result', this._onResult)
    .off('finished', this._onFinished)

  this.emit('close')
}

function onResult (message) {
  if (buffer.equals(message.id, this.id)) this.push(message.data)
}

function onFinished (message) {
  if (buffer.equals(message.id, this.id)) this.push(null)
}
