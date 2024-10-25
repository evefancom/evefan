import type {AdapterFromRouter, RouterMeta} from '@openint/vdk'
import {
  proxyCallAdapter,
  trpc,
  verticalProcedure,
  z,
  zPaginatedResult,
  zPaginationParams,
} from '@openint/vdk'
import adapters from './adapters'
import * as unified from './unifiedModels'

export {unified}

function oapi(meta: NonNullable<RouterMeta['openapi']>): RouterMeta {
  return {openapi: {...meta, path: `/unified/etl${meta.path}`}}
}

const procedure = verticalProcedure(adapters)

export const router = trpc.router({
  // We are gonna start with a simplified pipeline

  readStream: procedure
    .meta(oapi({method: 'GET', path: '/read/{stream}'}))
    .input(
      zPaginationParams.extend({
        stream: z.string(),
        fields: z.array(z.string()).optional(),
      }),
    )
    .output(zPaginatedResult.extend({items: z.array(unified.record_data)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),

  // We could technically implement the airbyte protocol, but this is rather complicated
  discover: procedure
    .meta(oapi({method: 'GET', path: '/discover'}))
    .input(z.void())
    .output(unified.message_catalog)
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  read: procedure
    .meta(oapi({method: 'POST', path: '/read'}))
    .input(
      z.object({
        // config is already implicitly via resource itself
        catalog: unified.configured_catalog,
        state: unified.global_state,
      }),
    )
    .output(z.array(unified.message_record))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  write: procedure
    .meta(oapi({method: 'POST', path: '/write'}))
    // NOTE: We array wrapped in object of a bug in trpc-openapi in generating array as POST body (array gets omitted)
    .input(z.object({messages: z.array(unified.message_record)}))
    .output(z.array(unified.message))
    .mutation(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
})

export type Adapter<TInstance> = AdapterFromRouter<typeof router, TInstance>
