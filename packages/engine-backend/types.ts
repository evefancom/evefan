import type {AnyConnectorImpl, Id, LinkFactory} from '@openint/cdk'
import {z} from '@openint/util'

// MARK: - Input types

type _inferInput<T> = T extends z.ZodTypeAny ? z.input<T> : never

// Would be nice to improve the typing of this... Make stuff non-optional
/** https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types */
export type ConnectorConfigInput<
  T extends AnyConnectorImpl = AnyConnectorImpl,
> = T extends AnyConnectorImpl
  ? {
      id: Id<T['name']>['ccfg']
      config?: Partial<_inferInput<T['schemas']['connectorConfig']>>
    }
  : never

// Is there a way to infer this? Or would that be too much?
export type ResourceInput<T extends AnyConnectorImpl = AnyConnectorImpl> =
  T extends AnyConnectorImpl
    ? {
        id: Id<T['name']>['reso']
        connectorConfigId?: Id<T['name']>['ccfg']
        connectorConfig?: ConnectorConfigInput<T>
        settings?: Partial<_inferInput<T['schemas']['resourceSettings']>> &
          object
      }
    : never

export interface PipelineInput<
  PSrc extends AnyConnectorImpl = AnyConnectorImpl,
  PDest extends AnyConnectorImpl = AnyConnectorImpl,
  TLinks extends Record<string, LinkFactory> = {},
> {
  id: Id['pipe']
  source?: PSrc extends AnyConnectorImpl ? ResourceInput<PSrc> : never
  sourceState?: PSrc extends AnyConnectorImpl
    ? Partial<_inferInput<PSrc['schemas']['sourceState']>>
    : never
  destination?: PDest extends AnyConnectorImpl ? ResourceInput<PDest> : never
  destinationState?: PDest extends AnyConnectorImpl
    ? Partial<_inferInput<PDest['schemas']['destinationState']>>
    : never
  /** Used to initialize links */
  linkOptions?: Array<
    // prettier-ignore
    {
      [K in Extract<keyof TLinks, string>]: undefined extends Parameters<TLinks[K]>[0]
        ? [name: K, args: Parameters<TLinks[K]>[0]] | [name: K] | K
        : [name: K, args: Parameters<TLinks[K]>[0]]
    }[Extract<keyof TLinks, string>]
  >
  watch?: boolean
}

export const zSyncOptions = z
  .object({
    async: z
      .boolean()
      .nullish()
      .describe(
        'Run sync in the background, not compatible with other options for now...',
      ),

    metaOnly: z
      .boolean()
      .nullish()
      .describe('Only sync resource metadata and skip pipelines '),

    fullResync: z
      .boolean()
      .nullish()
      .describe('Remove `state` of pipeline and trigger a full resync'),

    todo_upstreamRefresh: z.boolean().nullish().describe(`
    Triggers provider to refresh data from its source
    https://plaid.com/docs/api/products/transactions/#transactionsrefresh
    This may also load historical transactions. For example,
    Finicity treats historical transaction as premium service.
  `),

    // See coda's implmementation. Requires adding a new message to the sync protocol
    // to remove all data from a particular source_id
    todo_removeUnsyncedData: z.boolean().nullish().describe(`
    See coda's implmementation. Requires adding a new message to the sync protocol
    to remove all data from a particular source_id`),
  })
  .openapi({ref: 'SyncOptions'})
