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
  return {openapi: {...meta, path: `/unified/ats${meta.path}`}}
}

const procedure = verticalProcedure(adapters)

export const atsRouter = trpc.router({
  listJobs: procedure
    .meta(oapi({method: 'GET', path: '/job'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.job)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listJobOpenings: procedure
    .meta(oapi({method: 'GET', path: '/job/{jobId}/opening'}))
    .input(z.object({jobId: z.string()}).extend(zPaginationParams.shape).nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.opening)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listOffers: procedure
    .meta(oapi({method: 'GET', path: '/offer'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.offer)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listCandidates: procedure
    .meta(oapi({method: 'GET', path: '/candidate'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.candidate)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
  listDepartments: procedure
    .meta(oapi({method: 'GET', path: '/department'}))
    .input(zPaginationParams.nullish())
    .output(zPaginatedResult.extend({items: z.array(unified.department)}))
    .query(async ({input, ctx}) => proxyCallAdapter({input, ctx})),
})

export type ATSAdapter<TInstance> = AdapterFromRouter<
  typeof atsRouter,
  TInstance
>
