// import '@openint/app-config/register.node'
import {clerkClient} from '@clerk/nextjs/server'
import {makePostgresClient} from '@openint/app-config/backendConfig'
import {kApikeyMetadata} from '@openint/app-config/constants'
import {envRequired} from '@openint/app-config/env'
import type {Viewer} from '@openint/cdk'
import {encodeApiKey, hasRole} from '@openint/cdk'
import {makeUlid} from '@openint/util'

export const {getPool, sql} = makePostgresClient({
  databaseUrl: envRequired.POSTGRES_URL,
  transformFieldNames: false,
})

export async function getOrCreateApikey(viewer: Viewer) {
  const orgId = hasRole(viewer, ['org', 'user']) ? viewer.orgId : null
  const userId = hasRole(viewer, ['user']) ? viewer.userId : null

  if (orgId) {
    const res = await clerkClient.organizations.getOrganization({
      organizationId: orgId,
    })
    if (typeof res.privateMetadata[kApikeyMetadata] === 'string') {
      return encodeApiKey(orgId, res.privateMetadata[kApikeyMetadata])
    }
    const key = `key_${makeUlid()}`
    // updateMetadata will do a deepMerge, unlike simple update
    await clerkClient.organizations.updateOrganizationMetadata(orgId, {
      privateMetadata: {[kApikeyMetadata]: key},
    })
    return encodeApiKey(orgId, key)
  }
  if (userId) {
    const res = await clerkClient.users.getUser(userId)
    if (typeof res.privateMetadata[kApikeyMetadata] === 'string') {
      return encodeApiKey(userId, res.privateMetadata[kApikeyMetadata])
    }
    const key = `key_${makeUlid()}`
    // updateMetadata will do a deepMerge, unlike simple update
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {[kApikeyMetadata]: key},
    })
    return encodeApiKey(userId, key)
  }
  throw new Error('Only users and organizations can have apikeys')
}
