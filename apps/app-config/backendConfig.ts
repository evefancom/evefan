import {clerkClient} from '@clerk/nextjs/server'
import type {LinkFactory} from '@openint/cdk'
import {logLink, renameAccountLink} from '@openint/cdk'
import type {PipelineInput} from '@openint/engine-backend'
import {getContextFactory} from '@openint/engine-backend'
import {makePostgresMetaService} from '@openint/meta-service-postgres'
import {joinPath} from '@openint/util'
// TODO: This is a mess. We need to clarify the dependency graph again
import {
  getOrganizationOmitPrivateMeta,
  getUserOmitPrivateMeta,
} from '../../packages/api/authRouter'
import {mergedConnectors} from './connectors/connectors.merged'
import {getServerUrl} from './constants'
import {env, envRequired} from './env'

export {
  DatabaseError,
  makePostgresClient,
} from '@openint/connector-postgres/makePostgresClient'
export {Papa} from '@openint/connector-spreadsheet'

export const backendEnv = env

/**
 * This requires the env vars to exist...
 * TODO: Separate it so that the entire config isn't constructed client side
 * and only the minimal needed methods are...
 */

// After upgrading from zod 3.19 to zod 3.20.2 CastInput is now broken
// @see https://share.cleanshot.com/vpzSPkjP
// It's probably better to keep typing simpler especially when working with 3rd party
// libs that can have major changes...
// export type VeniceInput = inferProcedureInput<
//   VeniceRouter['_def']['mutations']['syncPipeline']
// >[0]
export type VeniceInput = PipelineInput<
  (typeof mergedConnectors)[keyof typeof mergedConnectors],
  (typeof mergedConnectors)[keyof typeof mergedConnectors]
>

export const contextFactory = getContextFactory({
  connectors: Object.values(mergedConnectors),
  // routerUrl: 'http://localhost:3010/api', // apiUrl?
  // TODO: Rename to just serverUrl as we will need it for redirects and everything else
  apiUrl: joinPath(getServerUrl(null), '/api/trpc'),
  // TODO: Clean up the duplication .env and .env.NANGO_SECRET_KEY etc.
  env,
  jwtSecret: envRequired.JWT_SECRET,
  nangoSecretKey: envRequired.NANGO_SECRET_KEY,
  // TODO: Remove this now that we use nango for redirects?
  // Although updating nangoUrl right now happens by hand which is not ideal
  getRedirectUrl: (_, _ctx) => joinPath(getServerUrl(null), '/'),
  // TODO: Do we realy need to support anything other than postgres?
  getMetaService: (viewer) =>
    makePostgresMetaService({databaseUrl: envRequired.POSTGRES_URL, viewer}),
  // TODO: This probably needs to be internal to the engine-backend or even cdk
  // because of the need to support integration metadata specifying their desired links
  // aka transfomrations
  linkMap: {
    renameAccount: renameAccountLink as LinkFactory,
    log: logLink,
  },
  clerk: clerkClient,
  authProvider: {
    getOrganization: (orgId) => getOrganizationOmitPrivateMeta(orgId),
    getUser: (userId) => getUserOmitPrivateMeta(userId),
  },
})
