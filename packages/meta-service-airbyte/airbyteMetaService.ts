import {initAirbyteSDK} from '@opensdks/sdk-airbyte'
import {z} from 'zod'
import type {MetaService} from '@openint/engine-backend'
import {makePostgresMetaService} from '@openint/meta-service-postgres'

// import {createApiClient} from './api/airbyte-private-api.gen'

const zAirbyteMetaConfig = z.object({
  postgresUrl: z.string(),
  apiUrl: z.string(),
  auth: z.object({
    username: z.string(),
    password: z.string(),
  }),
  _temp_workspaceId: z.string(),
})

export const makeAirbyteMetaService = z
  .function()
  .args(zAirbyteMetaConfig)
  .implement((cfg): MetaService => {
    const service = makePostgresMetaService({
      databaseUrl: cfg.postgresUrl,
      viewer: {role: 'system'},
    })

    const airbyte = initAirbyteSDK({
      headers: {authorization: `Bearer ${'TODO'}`},
    })

    void airbyte.config
      .POST('/v1/connections/list', {
        body: {workspaceId: ''},
        // workspaceId: cfg._temp_workspaceId,
      })
      .then((res) => res.data as any)

    return {
      ...service,
      tables: {
        ...service.tables,
        pipeline: {
          ...service.tables.pipeline,
          list: () =>
            airbyte.config
              .POST('/v1/connections/list', {
                body: {workspaceId: ''},
                // workspaceId: cfg._temp_workspaceId,
              })
              .then((res) => res.data.connections as any),
        },
      },
    }
  })
