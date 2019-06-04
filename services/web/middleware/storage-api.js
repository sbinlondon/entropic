'use strict'

module.exports = createStorageApiMW

const Client = require('storage-api')

function createStorageApiMW () {
  return next => {
    return async context => {
      context.storageApi = new Client({ requestId: context.id })
      return next(context)
    }
  }
}
