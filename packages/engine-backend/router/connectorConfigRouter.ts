import {
  extractConnectorName,
  extractId,
  makeId,
  makeOauthConnectorServer,
  oauthBaseSchema,
  zId,
  zRaw,
  zVerticalKey,
} from '@openint/cdk'
import {TRPCError} from '@openint/trpc'
import {makeUlid, z} from '@openint/util'
import {adminProcedure, protectedProcedure, trpc} from './_base'

export {type inferProcedureInput} from '@openint/trpc'

const tags = ['Core']

export const connectorConfigRouter = trpc.router({
  adminListConnectorConfigs: adminProcedure
    .meta({openapi: {method: 'GET', path: '/core/connector_config', tags}})
    .input(z.void())
    .output(z.array(zRaw.connector_config))
    .query(async ({ctx}) => ctx.services.list('connector_config', {})),
  // TODO: Right now this means client has to be responsible for creating
  // connector config IDs, we should support creating connector config with connectorName instead
  adminUpsertConnectorConfig: adminProcedure
    .meta({
      openapi: {method: 'POST', tags, path: '/core/connector_config'},
    })
    .input(
      zRaw.connector_config
        .pick({
          id: true,
          connectorName: true,
          orgId: true,
          config: true,
          displayName: true,
          defaultPipeOut: true,
          defaultPipeIn: true,
          disabled: true,
        })
        .partial()
        // Due to insert on conflict update it appears that orgId is actually required
        // it will simply fail on the required field and never gets to on conflict update
        // this makes me wonder if UPSERT should always be the default....
        .required({orgId: true}),
    )
    .output(zRaw.connector_config)
    .mutation(async ({input: {id: _id, connectorName, ...input}, ctx}) => {
      const id = _id
        ? _id
        : connectorName && input.orgId
          ? makeId('ccfg', connectorName, makeUlid())
          : null
      if (!id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Missing id or connectorName/orgId',
        })
      }
      const connector = ctx.connectorMap[extractConnectorName(id)]

      if (!connector) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Missing provider for ${extractConnectorName(id)}`,
        })
      }
      if (connector.metadata?.nangoProvider) {
        await makeOauthConnectorServer({
          ccfgId: id,
          nangoClient: ctx.nango,
          nangoProvider: connector.metadata.nangoProvider,
        }).upsertConnectorConfig(
          oauthBaseSchema.connectorConfig.parse(input.config),
        )
      }
      // console.log('saving connector config', id, input)

      return ctx.services.patchReturning('connector_config', id, input)
    }),

  adminUpdateConnectorConfig: adminProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/core/connector_config/{id}',
        tags,
      },
    })
    .input(
      zRaw.connector_config.pick({
        id: true,
        metadata: true,
        displayName: true,
        disabled: true,
      }),
    )
    .output(zRaw.connector_config)
    .mutation(async ({input: {id, ...input}, ctx}) => {
      // console.log('updating connector config', id, input)
      return ctx.services.patchReturning('connector_config', id, input)
    }),

  // Need a tuple for some reason... otherwise seems to not work in practice.
  adminDeleteConnectorConfig: adminProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/core/connector_config/{id}',
        tags,
      },
    })
    .input(z.object({id: zId('ccfg')}))
    .output(z.void())
    .mutation(async ({input: {id: ccfgId}, ctx}) => {
      const provider = ctx.connectorMap[extractConnectorName(ccfgId)]
      if (provider?.metadata?.nangoProvider) {
        await ctx.nango
          .DELETE('/config/{providerConfigKey}', {
            params: {path: {providerConfigKey: ccfgId}},
          })
          .catch(async (err) => {
            await ctx.nango.GET('/config/{providerConfigKey}', {
              params: {path: {providerConfigKey: ccfgId}, query: {}},
            })
            // What happens to error case? Do we get 404? Wish openAPI spec specifies this...
            throw err
          })
      }
      return ctx.services.metaService.tables.connector_config.delete(ccfgId)
    }),

  adminGetConnectorConfig: adminProcedure
    .meta({
      openapi: {method: 'GET', path: '/core/connector_config/{id}', tags},
    })
    .input(z.object({id: zId('ccfg')}))
    .output(zRaw.connector_config)
    .query(async ({input: {id: ccfgId}, ctx}) => {
      const {connector: _, ...int} =
        await ctx.services.getConnectorConfigOrFail(ccfgId)
      return int
    }),

  listConnectorConfigInfos: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/core/connector_config_info',
        tags,
        description:
          'For end user authentication and list a limited set of non private data',
      },
    })
    .input(
      z.object({
        type: z.enum(['source', 'destination']).nullish(),
        id: zId('ccfg').nullish(),
        connectorName: z.string().nullish(),
      }),
    )
    .output(
      z.array(
        zRaw.connector_config
          .pick({
            id: true,
            envName: true,
            displayName: true,
            connectorName: true,
          })
          .extend({
            isSource: z.boolean(),
            isDestination: z.boolean(),
            verticals: z.array(zVerticalKey),
          }),
      ),
    )
    .query(async ({input: {type, id, connectorName}, ctx}) => {
      const ccfgInfos = await ctx.services.metaService.listConnectorConfigInfos(
        {id, connectorName},
      )

      return ccfgInfos
        .map(({id, envName, displayName}) => {
          const connector = ctx.connectorMap[extractId(id)[1]]
          return connector
            ? {
                id,
                envName,
                displayName,
                connectorName: connector.name,
                isSource: !!connector.sourceSync,
                isDestination: !!connector.destinationSync,
                verticals: connector.metadata?.verticals ?? [],
              }
            : null
        })
        .filter((int): int is NonNullable<typeof int> =>
          Boolean(
            int &&
              (!type ||
                (type === 'source' && int.isSource) ||
                (type === 'destination' && int.isDestination)),
          ),
        )
    }),
})
