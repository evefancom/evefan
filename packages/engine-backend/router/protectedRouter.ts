import {extractId, zStandard} from '@openint/cdk'
import {TRPCError} from '@openint/trpc'
import {R, z} from '@openint/util'
import {inngest, zEvent} from '../events'
import {protectedProcedure, trpc} from './_base'

export {type inferProcedureInput} from '@openint/trpc'

export const protectedRouter = trpc.router({
  dispatch: protectedProcedure.input(zEvent).mutation(async ({input}) => {
    if (
      input.name !== 'sync/resource-requested' &&
      input.name !== 'sync/pipeline-requested'
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Event name not supported ${input.name}`,
      })
    }
    // not sure what `viewer` is quite for here...
    await inngest.send(input)
  }),

  searchIntegrations: protectedProcedure
    .input(z.object({keywords: z.string().trim().nullish()}).optional())
    .query(async ({input: {keywords} = {}, ctx}) => {
      const ints = await ctx.services.listConnectorConfigs()
      const integrations = await ctx.services.metaService.searchIntegrations({
        keywords,
        limit: 10,
        connectorNames: R.uniq(ints.map((int) => int.connector.name)),
      })
      const intsByConnectorName = R.groupBy(ints, (int) => int.connector.name)
      return integrations.flatMap((ins) => {
        const [, connectorName, externalId] = extractId(ins.id)
        const standard = ctx.connectorMap[
          connectorName
        ]?.standardMappers?.integration?.(ins.external)
        const res = zStandard.integration.omit({id: true}).safeParse(standard)

        if (!res.success) {
          console.error('Invalid integration found', ins, res.error)
          return []
        }
        return (intsByConnectorName[connectorName] ?? []).map((int) => ({
          ins: {...res.data, id: ins.id, externalId},
          int: {id: int.id},
        }))
      })
    }),
  // TODO: Do we need this method at all? Or should we simply add params to args
  // to syncResource instead? For example, skipPipelines?
})
