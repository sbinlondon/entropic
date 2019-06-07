'use strict'

module.exports = createStorageApi

const StorageAPI = require('storage-api')

function createStorageApi ({
  url = process.env.STORAGE_API_URL || 'http://localhost:3002'
} = {}) {
  return next => {
    return async function (context) {
      context.storageApi = new StorageAPI({
        url,
        requestId: context.id
      })

      return next(context)
    }
  }
}
