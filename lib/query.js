const { Readable } = require('streamx')

const { Protocol } = require('./protocol')

const kNextQueryId = Symbol('kNextQueryId')

class Query extends Readable {
  constructor (socket, protocol, target, encoding) {
    super({ map: map(encoding) })

    this._socket = socket
    this._protocol = protocol || new Protocol(socket)

    this.target = target
    this.id = this._nextId()

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
        reject(event.data)
      }

      this
        .once('close', onClose)
        .once('error', onError)
    })

    this.finished = async function finished () {
      await closing
    }
  }

  _nextId () {
    const nextId = this._socket[kNextQueryId] || 1
    this._socket[kNextQueryId] = nextId + 1
    return nextId
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
  if (message.id === this.id) this.push(message.data)
}

function onFinished (message) {
  if (message.id === this.id) this.push(null)
}
