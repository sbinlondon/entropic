'use strict'

module.exports = class Client {
  constructor ({ url = process.env.STORAGE_API_URL, requestId }) {
    this.url = url
    this.requestId = requestId
  }
}
