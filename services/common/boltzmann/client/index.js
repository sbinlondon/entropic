'use strict'

const fetch = require('node-fetch')
const os = require('os')

const hostname = os.hostname()

const e = encodeURIComponent

module.exports = class Client {
  constructor ({
    url = process.env.STORAGE_API_URL,
    requestId,
    userAgent,
    hostname = hostname,
    logger
  }) {
    this.url = url
    this.requestId = requestId
    this.userAgent = `${hostname}(${userAgent})`
    this.logger = logger
  }

  // TODO: add GET /providers
  async getProviders () {
    return this.request('/v1/providers')
  }

  // TODO: add GET /providers/provider/:provider
  async getProvider (name) {
    return this.request(`/v1/providers/provider/${e(name)}`)
  }

  // TODO: add GET /providers/provider/:provider/auth/:id
  async getAuthentication({ remoteId, provider }) {
    return this.request(`/v1/providers/provider/${e(name)}/auth/${e(remoteId)}`)
  }

  // TODO: add POST /users/signup
  async signup({username, email, remoteAuth}) {
    // remoteAuth is {token, id, provider}
    return this.request(`/users`, {
      method: 'POST',
      body: {
        username,
        email,
        remoteAuth
      }
    })
  }

  async getToken (key) {
    return this.request('/v1/users/tokens/token', {
      headers: { 'token': key }
    })
  }

  // TODO: add GET /users/tokens
  async getTokens({for: user, page}) {
    return this.request('/v1/users/tokens', {
      headers: { bearer: user },
      query: page ? { page } : null
    })
  }

  // TODO: add POST /users/tokens
  async createToken({for: user, description}) {
    return this.request('/v1/users/token', {
      method: 'POST',
      headers: { bearer: user },
      body: { description }
    })
  }

  // TODO: add DELETE /users/tokens/token/tk1;tk2;tk3
  async deleteToken({for: user, valueHashes}) {
    const hashes = [].concat(valueHashes).map(e).join(';')
    return this.request(`/v1/users/tokens/token/${hashes}`, {
      method: 'DELETE',
      headers: { bearer: user }
    })
  }

  // TODO: add POST /cli-sessions/session/:session
  async resolveCLISession({session, value}) {
    return this.request(`/v1/cli-sessions/session/${e(session)}`, {
      method: 'POST',
      body: { value }
    })
  }

  // TODO: add GET /cli-sessions/session/:session
  async fetchCLISession({session}) {
    return this.request(`/v1/cli-sessions/session/${e(session)}`)
  }

  // TODO: add POST /cli-sessions
  async createCLISession({description}) {
    return this.request(`/v1/cli-sessions`, {
      method: 'POST',
      body: { description }
    })
  }

  async getActiveMaintainers({namespace, host, name, page}) {
  }

  async inviteMaintainer({namespace, host, name, from, to}) {
  }

  async removeMaintainer({namespace, host, name, from, to}) {
  }

  async declineMaintainerInvite({namespace, host, name, member, bearer}) {
  
  }

  // XXX: ambiguous: this is for namespaces, but it could read as "for packages".
  async listMaintainerships ({namespace, host, status = 'active', page, bearer}) {
  }

  async listNamespaces({page}) {
  }

  async listNamespaceMembers({page, namespace, host}) {
  }

  async inviteNamespaceMember({namespace, host, invitee, bearer}) {
  }

  async removeNamespaceMember({namespace, host, invitee, bearer}) {
  }

  async acceptNamespaceInvite({namespace, host, invitee, bearer}) {
  }

  async declineNamespaceInvite({namespace, host, invitee, bearer}) {
  }

  async listMemberships ({for: user, page, status = 'active', bearer}) {
  }

  async listPackages({page}) {
  }

  async getPackage({namespace, host, name}) {
  }

  async replacePackage({namespace, host, name, require_tfa}) {
  }

  async deletePackage({namespace, host, name}) {
  }

  async getPackageVersion({namespace, host, name, version}) {
  }

  async createPackageVersion({namespace, host, name, version, request}) {
  }

  async deletePackageVersion({namespace, host, name, version}) {
  }

  async getObject({algo, digest}) {
  }

  async request(path, {method = 'GET', headers = {}, body = null, rawBody = null, json = true} = {}) {
    const start = Date.now()
    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: {
        ...headers,
        'user-agent': this.userAgent,
        'request-id': this.requestId
      },
      body: rawBody ? rawBody : body ? JSON.stringify(body) : null
    })

    if (!response.ok) {
      const body = await response.text()
      let message = body
      let code = 'unknown'
      try {
        const parsed = JSON.parse(body)
        message = parsed.message || body
        code = parsed.code || code
      } catch {
      }

      logger.error(`caught ${response.status} from ${method} ${path}: message=${message}, code=${code}`)
      throw Object.assign(new Error(message), {
        status: response.status,
        headers: response.headers,
        body,
        code
      })
    }


    logger.info(`${method} ${path} in ${Date.now() - start}ms`)
    if (json) {
      return response.json()
    }

    return response
  }
}
