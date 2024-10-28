import {inArray} from 'drizzle-orm'
import {configDb, schema} from '@openint/db'
import {z} from '@openint/util'
import {protectedProcedure, trpc} from './_base'
import {zListParams} from './_schemas'

export {type inferProcedureInput} from '@openint/trpc'

const tags = ['Core']

export const syncRouter = trpc.router({
  listSyncRuns: protectedProcedure
    .meta({openapi: {method: 'GET', path: '/core/sync_run', tags}})
    .input(zListParams.optional())
    .output(z.array(z.unknown()))
    .query(async ({ctx}) => {
      const resources = await ctx.services.metaService.tables.resource.list({})
      if (resources.length === 0) {
        return []
      }
      const runs = await configDb.query.sync_run.findMany({
        where: inArray(
          schema.sync_run.resource_id,
          resources.map((r) => r.id),
        ),
      })
      return runs
    }),
})
