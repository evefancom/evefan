import type {EndUserId, Id, IDS} from '@openint/cdk/id.types'
import type {ZRaw} from '@openint/cdk/models'
import type {NoInfer, ObjectPartialDeep} from '@openint/util'

export interface MetaTable<
  TID extends string = string,
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  get(id: TID): Promise<T | undefined | null>
  list(options: {
    ids?: TID[]
    /** Maybe remove this? not applicable everywhere */
    endUserId?: EndUserId | null
    /** Maybe remove this? not applicable everywhere */
    connectorConfigId?: Id['ccfg'] | null
    /** Maybe remove this? not applicable everywhere */
    connectorName?: string | null
    /** Used for search */
    keywords?: string | null
    /** Pagination, not necessarily supported */
    limit?: number
    offset?: number
  }): Promise<readonly T[]>
  set(id: TID, data: Omit<T, 'id'>): Promise<void>
  patch?(id: TID, partial: ObjectPartialDeep<NoInfer<T>>): Promise<void>
  delete(id: TID): Promise<void>
}

export interface EndUserResultRow {
  id: EndUserId
  resourceCount?: number
  firstCreatedAt?: unknown
  lastUpdatedAt?: unknown
}
/** TODO: Rename to DB Adapter */
export interface MetaService {
  tables: {
    [k in keyof ZRaw]: MetaTable<Id[(typeof IDS)[k]], ZRaw[k]>
  }
  // TODO: Make the following methods optional
  // and default to dumb listing all rows from table and in memory filter
  // if the corresponding methods are not implemented
  // This is useful for things like memory
  searchEndUsers: (options: {
    keywords?: string | null
    limit?: number
    offset?: number
  }) => Promise<readonly EndUserResultRow[]>
  searchIntegrations: (options: {
    /** Leave empty to list the top integrations */
    keywords?: string | null
    /** is there a stronger type here than string? */
    connectorNames?: string[]
    limit?: number
    offset?: number
  }) => Promise<ReadonlyArray<ZRaw['integration']>>
  /** TODO: Implement limit & offset */
  findPipelines: (options: {
    resourceIds?: Array<Id['reso']>
    secondsSinceLastSync?: number
    includeDisabled?: boolean
  }) => Promise<ReadonlyArray<ZRaw['pipeline']>>
  /** Id is used to check RLS policy right now for end user */
  listConnectorConfigInfos: (opts?: {
    id?: Id['ccfg'] | null
    connectorName?: string | null
  }) => Promise<
    ReadonlyArray<{
      id: Id['ccfg']
      envName?: string | null
      displayName?: string | null
    }>
  >
  /** Missing default pipeline */
  findResourcesMissingDefaultPipeline: () => Promise<
    ReadonlyArray<{id: Id['reso']}>
  >
}
