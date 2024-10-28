import type {ZRaw} from '@openint/cdk'
import {extractId, zEndUserId, zId, zRaw, zStandard} from '@openint/cdk'
import {R, z} from '@openint/util'
import {inngest} from '../events'
import {zSyncOptions} from '../types'
import {protectedProcedure, trpc} from './_base'
import {zListParams} from './_schemas'

export {type inferProcedureInput} from '@openint/trpc'

const tags = ['Core']

export const pipelineRouter = trpc.router({
  listPipelines: protectedProcedure
    .meta({openapi: {method: 'GET', path: '/core/pipeline', tags}})
    .input(
      zListParams
        .extend({resourceIds: z.array(zId('reso')).optional()})
        .optional(),
    )
    .output(z.array(zRaw.pipeline))
    .query(async ({input = {}, ctx}) => {
      const pipelines = await ctx.services.metaService.findPipelines(input)
      return pipelines as Array<ZRaw['pipeline']>
    }),
  updatePipeline: protectedProcedure
    .meta({openapi: {method: 'PATCH', path: '/core/pipeline/{id}', tags}})
    .input(
      zRaw.pipeline.pick({
        id: true,
        metadata: true,
        disabled: true,
        streams: true,
      }),
    )
    .output(zRaw.pipeline)
    .mutation(async ({ctx, input: {id, ...input}}) =>
      ctx.services.patchReturning('pipeline', id, input),
    ),
  createPipeline: protectedProcedure
    .meta({openapi: {method: 'POST', path: '/core/pipeline', tags}})
    .input(
      zRaw.pipeline.pick({
        id: true,
        metadata: true,
        disabled: true,
        sourceId: true,
        streams: true,
        destinationId: true,
      }),
    )
    .output(zRaw.pipeline)
    .mutation(async ({ctx, input: {id, ...input}}) =>
      ctx.services.patchReturning('pipeline', id, input),
    ),
  deletePipeline: protectedProcedure
    .meta({openapi: {method: 'DELETE', path: '/core/pipeline/{id}', tags}})
    .input(z.object({id: zId('pipe')}))
    .output(z.literal(true))
    .mutation(async ({ctx, input}) => {
      await ctx.services.metaService.tables.pipeline.delete(input.id)
      return true as const
    }),
  listConnections: protectedProcedure
    .input(zListParams.extend({endUserId: zEndUserId.optional()}).optional())
    .query(async ({input = {}, ctx}) => {
      // Add info about what it takes to `reconnect` here for resources which
      // has disconnected
      const resources =
        await ctx.services.metaService.tables.resource.list(input)
      const [integrations, _pipelines] = await Promise.all([
        ctx.services.metaService.tables.integration.list({
          ids: R.compact(resources.map((c) => c.integrationId)),
        }),
        ctx.services.metaService.findPipelines({
          resourceIds: resources.map((c) => c.id),
        }),
      ])
      type ConnType = 'source' | 'destination'

      const intById = R.mapToObj(integrations, (ins) => [ins.id, ins])

      function parseResource(reso?: (typeof resources)[number] | null) {
        if (!reso) {
          return reso
        }
        const connectorName = extractId(reso.id)[1]
        const integrations = intById[reso.integrationId!]
        const mappers = ctx.connectorMap[connectorName]?.standardMappers
        const standardReso = zStandard.resource
          .omit({id: true})
          .nullish()
          .parse(mappers?.resource?.(reso.settings))
        const standardInt = zStandard.integration
          .omit({id: true})
          .nullish()
          .parse(integrations && mappers?.integration?.(integrations?.external))

        return {
          ...reso,
          ...standardReso,
          id: reso.id,
          displayName:
            reso.displayName ||
            standardReso?.displayName ||
            standardInt?.name ||
            '',
          integration:
            standardInt && integrations
              ? {...standardInt, id: integrations.id}
              : null,
        }
      }
      const pipelines = _pipelines.map((pipe) => ({
        ...pipe,
        syncInProgress:
          (pipe.lastSyncStartedAt && !pipe.lastSyncCompletedAt) ||
          (pipe.lastSyncStartedAt &&
            pipe.lastSyncCompletedAt &&
            pipe.lastSyncStartedAt > pipe.lastSyncCompletedAt),
      }))
      return resources
        .map(parseResource)
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => {
          const pipesOut = pipelines.filter((p) => p.sourceId === r.id)
          const pipesIn = pipelines.filter((p) => p.destinationId === r.id)
          const pipes = [...pipesOut, ...pipesIn]
          // TODO: Look up based on provider name
          const type: ConnType | null = r.id.startsWith('reso_postgres')
            ? 'destination'
            : 'source'
          return {
            ...r,
            syncInProgress: pipes.some((p) => p.syncInProgress),
            type,
            pipelineIds: pipes.map((p) => p.id),
            // TODO: Fix me
            lastSyncCompletedAt: pipes.find((p) => p.lastSyncCompletedAt)
              ?.lastSyncCompletedAt,
          }
        })
    }),
  syncPipeline: protectedProcedure
    .meta({openapi: {method: 'POST', path: '/core/pipeline/{id}/_sync', tags}})
    .input(z.object({id: zId('pipe')}).merge(zSyncOptions))
    .output(z.void())
    .mutation(async function syncPipeline({input: {id: pipeId, ...opts}, ctx}) {
      if (ctx.viewer.role === 'end_user') {
        await ctx.services.getPipelineOrFail(pipeId) // Authorization
      }
      if (opts?.async) {
        await inngest.send({
          name: 'sync/pipeline-requested',
          data: {pipelineId: pipeId},
        })
        return
      }
      const pipeline = await ctx.asOrgIfNeeded.getPipelineExpandedOrFail(pipeId)
      console.log('[syncPipeline]', pipeline)
      const clerkOrg = await ctx.clerk.organizations.getOrganization({
        organizationId: pipeline.source.connectorConfig.orgId,
      })

      const org = z
        .object({webhook_url: z.string().optional()})
        .optional()
        .parse(clerkOrg.privateMetadata)

      return ctx.services._syncPipeline(pipeline, {...opts, org})
    }),
})
