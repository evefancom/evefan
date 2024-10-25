/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {initTRPC} from '@trpc/server'
import type {AnyConnectorImpl, AnyEntityPayload} from '@openint/cdk'
import {fromMaybePromise, R, Rx, rxjs, z, zodToJsonSchema} from '@openint/util'
import type {ABMessage, ABMessageStream} from './protocol/protocol'
import {abMessage} from './protocol/protocol'
import type {AirbyteStream} from './protocol/protocol.gen'
import {readJson} from './utils'

const trpcServer = initTRPC.create()
const procedure = trpcServer.procedure

export function makeAirbyteConnector(connector: AnyConnectorImpl) {
  const connSpec = z.object({
    settings: connector.schemas.resourceSettings ?? z.object({}),
    // For now, unclear whether it should actually live in airbyte config
    // or perhaps it should just have a `OpenIntConnectorConfigId` field
    // so the data is not duplicated across dozens of integrations
    // but then we'd have to think about "auth", or at least the connectorConfigId would have to be
    // made a secret field too
    config: connector.schemas.connectorConfig ?? z.object({}),
  })

  type ConnectionSpecification = z.infer<typeof connSpec>

  /** Implements https://docs.airbyte.com/understanding-airbyte/airbyte-protocol-docker/ */
  const router = trpcServer.router({
    spec: procedure.subscription(
      (): ABMessageStream<'SPEC'> =>
        rxjs.of(
          abMessage('SPEC', {
            // Default version is 0.2.0
            protocol_version: '0.2.0',
            documentationUrl: `https://github.com/useVenice/venice/tree/main/integrations/integration-${connector.name}`,
            // Add all the other stuff we support
            connectionSpecification: zodToJsonSchema(connSpec),
          }),
        ),
    ),
    check: procedure
      .input(z.object({config: z.string()}))
      .subscription(({input: args}): ABMessageStream<'CONNECTION_STATUS'> => {
        const config = readJson<ConnectionSpecification>(args.config)
        return rxjs.from(
          fromMaybePromise(
            connector.checkResource?.({
              settings: config.settings,
              config: config.config,
              options: {skipCache: true},
              context: {webhookBaseUrl: ''},
            }),
          )
            // TODO: does checkResource return resourceUpdate non-standard also?
            .then(() => abMessage('CONNECTION_STATUS', {status: 'SUCCEEDED'}))
            .catch((err) =>
              abMessage('CONNECTION_STATUS', {
                status: 'FAILED',
                message: `${err}`,
              }),
            ),
        )
      }),
    discover: procedure
      .input(z.object({config: z.string()}))
      .subscription(({input: args}): ABMessageStream<'CATALOG'> => {
        if (!connector.sourceSync) {
          throw new Error(`${connector.name} is not a source`)
        }
        const config = readJson<ConnectionSpecification>(args.config)
        const union = connector.schemas.sourceOutputEntity as
          | z.ZodDiscriminatedUnion<string, []>
          | undefined
        return rxjs.of(
          abMessage('CATALOG', {
            config,
            streams:
              union?.options.map(
                (o): AirbyteStream => ({
                  // @ts-expect-error
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  name: o.shape[union.discriminator].value as string,
                  json_schema: zodToJsonSchema(o),
                  // Only full refresh for now
                  supported_sync_modes: ['full_refresh'],
                  source_defined_primary_key: [['_id']],
                }),
              ) ?? [],
          }),
        )
      }),
    read: procedure
      .input(
        z.object({
          config: z.string(),
          catalog: z.string(),
          state: z.string().optional(),
        }),
      )
      .subscription(({input: args}): ABMessageStream<'RECORD' | 'STATE'> => {
        if (!connector.sourceSync) {
          throw new Error(`${connector.name} is not a source`)
        }

        const config = readJson<ConnectionSpecification>(args.config)
        const state = args.state ? readJson(args.state) : {}
        // const catalog = readJson<ConfiguredAirbyteCatalog>(args.catalog)
        // TODO: Add configuredCatalog into provider sourceSync

        return connector
          .sourceSync({
            endUser: null,
            config: config.config,
            settings: config.settings,

            instance: connector.newInstance?.({
              config: config.config,
              settings: config.settings,
              fetchLinks: [], // TODO: Add fetchLinks when we need to actually impl this.
              onSettingsChange: () => {},
            }),
            state,
            streams: {}, // can implement the catalog now...
          })
          .pipe(
            Rx.map((op): ABMessage<'RECORD' | 'STATE' | 'LOG'> => {
              switch (op.type) {
                case 'data':
                  return R.pipe(op.data as AnyEntityPayload, (data) =>
                    abMessage('RECORD', {
                      stream: data.entityName,
                      // How do we do change data capture here to sync deleted entities via Airbyte?
                      // @ts-expect-error
                      data: {...data.entity, _id: data.id},
                      emitted_at: Date.now(),
                    }),
                  )
                case 'stateUpdate':
                  return abMessage('STATE', {
                    type: 'LEGACY',
                    data: op.sourceState,
                  })
                default:
                  return abMessage('LOG', {message: op.type, level: 'WARN', op})
              }
            }),
          )
      }),
  })

  return router
}
