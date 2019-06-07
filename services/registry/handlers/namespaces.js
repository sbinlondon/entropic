'use strict';

const NamespaceMember = require('../models/namespace-member');
const isLoggedIn = require('../decorators/is-logged-in');
const Namespace = require('../models/namespace');
const { response, fork } = require('boltzmann');
const Package = require('../models/package');
const User = require('../models/user');

module.exports = [
  fork.get('/v1/namespaces', namespaces),
  fork.get('/v1/namespaces/namespace/:namespace([^@]+)@:host/members', members),
  fork.post(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/members/:invitee',
    invite
  ),
  fork.del(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/members/:invitee',
    remove
  ),
  fork.post(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/members/invitation',
    accept
  ),
  fork.del(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/members/invitation',
    decline
  ),
  // TODO: users need to be pulled into their own handler
  fork.get(
    '/v1/users/user/:user/memberships/pending',
    pendingMemberships
  ),
  fork.get('/v1/users/user/:user/memberships', memberships),
  fork.get(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/memberships',
    memberships
  ),
  fork.get(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/maintainerships/pending',
    pendingMaintainerships
  ),
  // probably belongs in the packages file, but whatever
  fork.get(
    '/v1/namespaces/namespace/:namespace([^@]+)@:host/maintainerships',
    maintainerships
  )
];

async function namespaces(context, params) {
  const [err, response] = await context.storageApi.listNamespaces({
    page: Number(context.url.query.page) || 0
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors.
    return response.error(err.message, err.code)
  }

  const { objects, next, prev, total } = response
  return response.json({ objects, next, prev, total });
}

async function members(context, { namespace, host }) {
  const [err, response] = await context.storageApi.listNamespaceMembers({
    page: Number(context.url.query.page) || 0,
    namespace,
    host
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    // TODO: enumerate errors.
    return response.error(err.message, err.code)
  }

  const { objects, next, prev, total } = response
  return response.json({ objects, next, prev, total });
}

async function invite(context, { invitee, namespace, host }) {
  const [err] = await context.storageApi.inviteNamespaceMember({
    bearer: context.user.name,
    invitee,
    namespace,
    host
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    const msg = {
      'member.invite.invitee_dne': `Unknown user for invite: "${invitee}".`,
      'member.invite.namespace_dne': `Unknown namespace: "${namespace}@${host}".`,
      'member.invite.bearer_unauthorized': `You are not authorized to add members to "${namespace}@${host}"`,
      'member.invite.invitee_already_member': `${invitee} is already a member of ${namespace}@${host}`,
      'member.invite.pending': `${invitee} has already been invited to join ${namespace}@${host}`,
      'member.invite.declined': `${invitee} has already been invited to join ${namespace}@${host}`,
    }[err.code]

    return response.error(
      msg || `Caught error inviting member to "${namespace}@${host}"`,
      err.status
    );
  }

  context.logger.info(
    `${invitee} invited to join ${namespace}@${host} by ${context.user.name}`
  );
  return response.message(`${invitee} invited to join ${namespace}@${host}.`);
}

async function remove(context, { invitee, namespace, host }) {
  const [err] = await context.storageApi.removeNamespaceMember({
    bearer: context.user.name,
    invitee,
    namespace,
    host
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    const msg = {
      'member.invite.invitee_dne': `Unknown user for invite: "${invitee}".`,
      'member.invite.namespace_dne': `Unknown namespace: "${namespace}@${host}".`,
      'member.invite.bearer_unauthorized': `You are not authorized to remove members from "${namespace}@${host}"`,
      'member.invite.invitee_not_member': `"${invitee}" is not a member of "${namespace}@${host}" and has no pending invitation`,
    }[err.code]

    return response.error(
      msg || `Caught error removing member from "${namespace}@${host}"`,
      err.status
    );
  }

  context.logger.info(
    `${invitee} removed from ${namespace}@${host} by ${context.user.name}`
  );

  return response.message(`${invitee} removed from ${namespace}@${host}.`);
}

async function accept(context, { namespace, host }) {
  const [err] = await context.storageApi.acceptNamespaceInvite({
    bearer: context.user.name,
    invitee: context.user.name,
    namespace,
    host
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    const msg = {
      'member.invite.invitee_dne': `Unknown user for invite: "${invitee}".`,
      'member.invite.namespace_dne': `Unknown namespace: "${namespace}@${host}".`,
      'member.invite.bearer_unauthorized': `You are not authorized to accept an invite for "${invitee}" on "${namespace}@${host}"`,
      'member.invite.invite_dne': `invitation not found`,
    }[err.code]

    return response.error(
      msg || `Caught error accepting "${namespace}@${host}" invite for "${context.user.name}"`,
      err.status
    );
  }

  context.logger.info(
    `${context.user.name} accepted the invitation to join ${namespace}@${host}`
  );
  return response.message(
    `${context.user.name} is now a member of ${namespace}@${host}`
  );
}

async function decline(context, { namespace, host }) {
  const [err] = await context.storageApi.acceptNamespaceInvite({
    bearer: context.user.name,
    invitee: context.user.name,
    namespace,
    host
  }).then(
    xs => [null, xs],
    xs => [xs, null]
  )

  if (err) {
    const msg = {
      'member.invite.invitee_dne': `Unknown user for invite: "${invitee}".`,
      'member.invite.namespace_dne': `Unknown namespace: "${namespace}@${host}".`,
      'member.invite.bearer_unauthorized': `You are not authorized to decline an invite for "${invitee}" on "${namespace}@${host}"`,
      'member.invite.invite_dne': `invitation not found`,
    }[err.code]

    return response.error(
      msg || `Caught error declining "${namespace}@${host}" invite for "${context.user.name}"`,
      err.status
    );
  }

  context.logger.info(
    `${context.user.name} declined the invitation to join ${namespace}@${host}`
  );
  return response.message(
    `You have declined the invitation to join ${namespace}@${host}`
  );
}

// user
async function pendingMemberships(context, { user }) {
  const [err, response] = await context.storageApi.listMemberships({
    page: Number(context.url.query.page) || 0,
    status: 'pending',
    for: user,
    bearer: context.user.name
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

// user
async function memberships(context, { user }) {
  const [err, response] = await context.storageApi.listMemberships({
    page: Number(context.url.query.page) || 0,
    status: 'active',
    for: user,
    bearer: context.user.name
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

async function pendingMaintainerships(context, { namespace, host }) {
  const [err, response] = await context.storageApi.listMaintainerships({
    page: Number(context.url.query.page) || 0,
    status: 'pending',
    namespace,
    host,
    bearer: context.user.name
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

async function maintainerships(context, params) {
  const [err, response] = await context.storageApi.listMaintainerships({
    page: Number(context.url.query.page) || 0,
    status: 'active',
    namespace,
    host,
    bearer: context.user.name
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
