'use strict';

const NamespaceMember = require('../models/namespace-member');
const isLoggedIn = require('../decorators/is-logged-in');
const Namespace = require('../models/namespace');
const { response, fork } = require('boltzmann');
const Token = require('../models/token');
const User = require('../models/user');

module.exports = [
  fork.get('/v1/users/user/:username/memberships', memberships),
  fork.get('/v1/users/token', byToken)
];

async function memberships (context, { username }) {
  const status = {
    'active': 'active',
    'pending': 'pending'
  }[context.request.url.search.status] || 'active'

  const perPage = Number(process.env.PER_PAGE) || 100
  const page = Number(context.request.url.search.page) || 0
  const start = page * perPage

  const memberships = await Namespace.objects
    .filter({
      'namespace_members.accepted': status === 'active',
      'namespace_members.active': true,
      'namespace_members.user.name': username,
      'namespace_members.user.active': true,
      active: true
    })
    .slice(start, start + perPage + 1)
    .then()

  const hasNext = memberships.length > perPage
  const hasPrev = start > 0

  return response.json({
    objects: memberships,
    next: hasNext,
    prev: hasPrev
  })
}

async function byToken (context, params) {
  const token = context.request.headers.token
  if (!token) {
    return response.error('Must provide token', 400)
  }

  const user = await Token.lookupUser(token)
  if (!user) {
    return response.error('Unauthenticated', 401, {
      'www-authenticate': 'Bearer'
    })
  }

  return response.json({user})
}
