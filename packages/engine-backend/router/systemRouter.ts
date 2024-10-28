import {zId, zWebhookInput} from '@openint/cdk'
import {z} from '@openint/util'
import {adminProcedure, systemProcedure, trpc} from './_base'

export const systemRouter = trpc.router({
  ensureDefaultPipelines: adminProcedure.mutation(async ({ctx}) => {
    const resources =
      await ctx.services.metaService.findResourcesMissingDefaultPipeline()
    return await Promise.all(
      resources.map((reso) =>
        ctx.services
          .ensurePipelinesForResource(reso.id)
          .then((pipelineIds) => ({resourceId: reso.id, pipelineIds}))
          .catch((err) => {
            console.error(
              'Failed to ensuring default pipelines for resource',
              reso.id,
              err,
            )
            return false
          }),
      ),
    )
  }),
  handleWebhook: systemProcedure
    .input(z.tuple([zId('ccfg'), zWebhookInput]))
    .mutation(async ({input: [ccfgId, input], ctx}) => {
      const int = await ctx.services.getConnectorConfigOrFail(ccfgId)

      if (!int.connector.schemas.webhookInput || !int.connector.handleWebhook) {
        console.warn(`${int.connector.name} does not handle webhooks`)
        return
      }
      const res = await int.connector.handleWebhook(
        int.connector.schemas.webhookInput.parse(input),
        int.config,
      )
      await Promise.all(
        res.resourceUpdates.map((resoUpdate) =>
          // Provider is responsible for providing envName / userId
          // This may be relevant for OneBrick resources for example
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ctx.services._syncResourceUpdate(int, resoUpdate),
        ),
      )

      return res.response?.body
    }),
})
