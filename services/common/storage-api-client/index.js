'use strict'

module.exports = class Client {
  constructor ({ host = process.env.STORAGE_HOST, requestId }) {
    this.host = host
    this.requestId = requestId
  }

  
}
