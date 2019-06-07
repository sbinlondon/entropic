'use strict';

const { Response } = require('node-fetch');
const { json } = require('micro');

const { response, fork } = require('boltzmann');

module.exports = [
  fork.get('/v1/packages', packageList),
  fork.get('/v1/packages/package/:namespace([^@]+)@:host/:name', packageDetail),
  fork.put(
    '/v1/packages/package/:namespace([^@]+)@:host/:name',
    packageCreate
  ),
  fork.del(
    '/v1/packages/package/:namespace([^@]+)@:host/:name',
    packageDelete
  ),

  fork.get(
    '/v1/packages/package/:namespace([^@]+)@:host/:name/versions/:version',
    versionDetail
  ),
  fork.put(
    '/v1/packages/package/:namespace([^@]+)@:host/:name/versions/:version',
    versionCreate
  ),
  fork.del(
    '/v1/packages/package/:namespace([^@]+)@:host/:name/versions/:version',
    versionDelete
  ),

  fork.get('/v1/objects/object/:algo/*', getObject)
];

async function packageList(context) {
  const [err, response] = await context.storageApi.listPackages({
    page: Number(context.url.query.page) || 0
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate error
    return response.error()
  }

  const { objects, next, prev, total } = response
  return response.json({ objects, next, prev, total });
}

async function packageDetail(
  context,
  { host, namespace, name, retry = false }
) {
  const [err, str] = await context.storage.getPackage({namespace, host, name}).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    if (err.code === 'package.syncing') {
      return response.json({}, 202, {
        'retry-after': 1
      })
    }

    // TODO: enumerate errors
    return response.error(err.message, err.status)
  }
  return response.rawjson(str)
}

async function packageCreate(
  context,
  { host, namespace, name }
) {
  const { require_tfa = null } = await json(context.request);
}

async function packageDelete(context, { host, namespace, name }) {
  context.logger.info(
    `${namespace}@${host}/${name} marked as abandonware by ${context.user.name}`
  );

  return response.text('', 204);
}

async function versionDetail(context, { host, namespace, name, version }) {
  const [err, stream] = await context.storage.getPackageVersion({
    namespace,
    host,
    name,
    version
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors
    return response.error(err.message, err.status)
  }

  return response.rawjson(str)
}

async function versionCreate(context, { host, namespace, name, version }) {
  const [err, response] = await context.storage.createPackageVersion({
    namespace,
    host,
    name,
    version,
    context.request
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors
    return response.error(err.message, err.status)
  }

  return response.rawjson(response)
}

async function versionDelete(context, { host, namespace, name, version }) {
  const [err, response] = await context.storage.deletePackageVersion({
    namespace,
    host,
    name,
    version
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors
    return response.error(err.message, err.status)
  }

  return response.empty()
}

async function getObject(context, { algo, '*': digest }) {
  const [err, stream] = await context.storage.getObject({algo, digest}).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors
    return response.error(err.message, err.status)
  }

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'application/octet-stream'
    }
  });
}
