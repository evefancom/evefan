import type {Link as FetchLink} from '@opensdks/runtime'
import type {z} from '@opensdks/util-zod'
import type {
  Destination,
  EntityPayload,
  ResoUpdateData,
  Source,
  StateUpdateData,
  SyncOperation,
} from '@openint/sync'
import type {MaybePromise} from '@openint/util'
import {R} from '@openint/util'
import type {
  CheckResourceContext,
  CheckResourceOptions,
  ConnectContext,
  ConnectOptions,
  ConnectorMetadata,
  OpenDialogFn,
  ResourceUpdate,
  WebhookReturnType,
  zPassthroughInput,
} from './connector-meta.types'
import type {EndUserId, Id} from './id.types'
import {makeId} from './id.types'
import type {ZStandard} from './models'

/**
 * Equivalent to to airbyte's low code connector spec,
 *  plus the SPEC message in airbyte protocol spec
 */

export interface ConnectorSchemas {
  name: z.ZodLiteral<string>
  connectorConfig?: z.ZodTypeAny
  resourceSettings?: z.ZodTypeAny
  integrationData?: z.ZodTypeAny
  webhookInput?: z.ZodTypeAny
  preConnectInput?: z.ZodTypeAny
  connectInput?: z.ZodTypeAny
  /** aka postConnectInput... Should we rename? */
  connectOutput?: z.ZodTypeAny
  /** Maybe can be derived from webhookInput | postConnOutput | inlineInput? */

  // MARK: @deprecated. Use the etl vertical instead

  /** Will soon be deprecated @deprecated. Use the etl vertical instead */
  sourceState?: z.ZodTypeAny

  /** @deprecated. Use sourceOutputEntities */
  sourceOutputEntity?: z.ZodTypeAny
  /** Will soon be deprecated @deprecated. Use the etl vertical instead */
  sourceOutputEntities?: Record<string, z.ZodTypeAny>
  /** Will soon be deprecated @deprecated. Use the etl vertical instead */
  destinationState?: z.ZodTypeAny
  /** Will soon be deprecated @deprecated. Use the etl vertical instead */
  destinationInputEntity?: z.ZodTypeAny
}

export type AnyConnectorHelpers = ConnHelpers

export type EntityMapper<
  T extends {remote: unknown; settings: unknown} = {
    remote: unknown
    settings: unknown
  },
  TUnified = unknown,
> = (remote: T['remote'], settings: T['settings']) => TUnified

export type ConnHelpers<TSchemas extends ConnectorSchemas = ConnectorSchemas> =
  ReturnType<typeof connHelpers<TSchemas>>

export interface ConnectorDef<
  TSchemas extends ConnectorSchemas = ConnectorSchemas,
  T extends ConnHelpers<TSchemas> = ConnHelpers<TSchemas>,
> {
  name: TSchemas['name']['_def']['value']
  schemas: TSchemas
  metadata?: ConnectorMetadata

  standardMappers?: {
    integration?: (
      data: T['_types']['integrationData'],
    ) => Omit<ZStandard['integration'], 'id'>
    resource?: (
      settings: T['_types']['resourceSettings'],
    ) => Omit<ZStandard['resource'], 'id'>

    // TODO: Migrate to vertical format, as only verticals deal with mapping entities
    entity?:
      | Partial<{
          // Simpler
          [k in T['_types']['sourceOutputEntity']['entityName']]: (
            entity: Extract<T['_types']['sourceOutputEntity'], {entityName: k}>,
            settings: T['_types']['resourceSettings'],
          ) => EntityPayload | null
        }>
      // More powerful
      | ((
          entity: T['_types']['sourceOutputEntity'],
          settings: T['_types']['resourceSettings'],
        ) => EntityPayload | null)
  }

  streams?: {
    $defaults: {
      /** Only singular primary key supported for the moment */
      // TODO: Fix me up.
      primaryKey: string // PathsOf<T['_remoteEntity']>
      /** Used for incremental sync. Should only be string entities */
      cursorField?: string // PathsOf<T['_remoteEntity']>
    }
  }
}

export interface ConnectorClient<
  TDef extends ConnectorSchemas = ConnectorSchemas,
  T extends ConnHelpers<TDef> = ConnHelpers<TDef>,
> {
  useConnectHook?: (scope: {
    // userId: DeprecatedUserId | undefined
    openDialog: OpenDialogFn
  }) => (
    connectInput: T['_types']['connectInput'],
    context: ConnectOptions & {
      // TODO: Does this belong here?
      connectorConfigId: Id['ccfg']
    },
  ) => Promise<T['_types']['connectOutput']>
}

export interface ConnectorServer<
  TDef extends ConnectorSchemas,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TInstance = any,
  T extends ConnHelpers<TDef> = ConnHelpers<TDef>,
> {
  // MARK: - Connect

  preConnect?: (
    config: T['_types']['connectorConfig'],
    context: ConnectContext<T['_types']['resourceSettings']>,
    // TODO: Turn this into an object instead
    input: T['_types']['preConnectInput'],
  ) => Promise<T['_types']['connectInput']>

  postConnect?: (
    connectOutput: T['_types']['connectOutput'],
    config: T['_types']['connectorConfig'],
    context: ConnectContext<T['_types']['resourceSettings']>,
  ) => MaybePromise<
    Omit<
      ResourceUpdate<
        T['_types']['sourceOutputEntity'],
        T['_types']['resourceSettings']
      >,
      'endUserId'
    >
  >

  checkResource?: (
    input: OmitNever<{
      settings: T['_types']['resourceSettings']
      config: T['_types']['connectorConfig']
      options: CheckResourceOptions
      context: CheckResourceContext
      instance?: TInstance
    }>,
  ) => MaybePromise<
    Omit<
      ResourceUpdate<
        T['_types']['sourceOutputEntity'],
        T['_types']['resourceSettings']
      >,
      'endUserId'
    >
  >

  // This probably need to also return an observable
  revokeResource?: (
    settings: T['_types']['resourceSettings'],
    config: T['_types']['connectorConfig'],
    instance: TInstance,
  ) => Promise<unknown>

  // MARK: - Sync

  sourceSync?: (
    input: OmitNever<{
      instance: TInstance
      endUser: {id: EndUserId} | null | undefined
      /* Enabled streams */
      streams: {
        [k in T['_streamName']]?:
          | boolean
          | null
          | {disabled?: boolean; fields?: string[]}
      }
      state: T['_types']['sourceState']
      /** @deprecated, use `instance` instead */
      config: T['_types']['connectorConfig']
      /** @deprecated, use `instance` instead */
      settings: T['_types']['resourceSettings']
    }>,
  ) => Source<T['_types']['sourceOutputEntity']>

  destinationSync?: (
    input: OmitNever<{
      /** Needed for namespacing when syncing multiple source into same destination */
      source: {id: Id['reso'], connectorName: string} | undefined
      endUser: {id: EndUserId, orgId: string} | null | undefined
      config: T['_types']['connectorConfig']
      settings: T['_types']['resourceSettings']
      state: T['_types']['destinationState']
    }>,
  ) => Destination<T['_types']['destinationInputEntity']>

  // pagination params
  listIntegrations?: (params: unknown) => Promise<{
    has_next_page: boolean
    next_cursor: string | null
    // Institution

    items: Array<{
      id: string
      name: string
      logo_url?: string | null
      updated_at: string
      raw_data: T['_intOpType']['data']
    }>
  }>

  metaSync?: (
    input: OmitNever<{
      config: T['_types']['connectorConfig']
      // options: T['_types']['sourceState']
    }>,
  ) => Source<T['_intOpType']['data']>

  // MARK - Webhook
  // Need to add a input schema for each provider to verify the shape of the received
  // webhook requests...
  handleWebhook?: (
    webhookInput: T['_types']['webhookInput'],
    config: T['_types']['connectorConfig'],
  ) => MaybePromise<
    WebhookReturnType<
      T['_types']['sourceOutputEntity'],
      T['_types']['resourceSettings']
    >
  >

  /**
   * Work around typescript not having contextual typing support for classes that implement interfaces
   * We recommend against using classes (which might be more convenient) due to the lack
   * of contextual typing for interfaces. @see https://github.com/microsoft/TypeScript/issues/1373
   */
  newInstance?: (opts: {
    config: T['_types']['connectorConfig']
    settings: T['_types']['resourceSettings']
    fetchLinks: FetchLink[]
    /** @deprecated, use fetchLinks instead for things like token refreshes or connection status update */
    onSettingsChange: (
      newSettings: T['_types']['resourceSettings'],
    ) => MaybePromise<void>
  }) => TInstance

  /** Passthrough request proxy */
  proxy?: (instance: TInstance, req: Request) => Promise<Response>

  passthrough?: (
    instance: TInstance,
    input: z.infer<typeof zPassthroughInput>,
  ) => unknown
}

export interface ConnectorImpl<TSchemas extends ConnectorSchemas>
  extends ConnectorDef<TSchemas>,
    ConnectorServer<TSchemas>,
    ConnectorClient<TSchemas> {
  // helpers: IntHelpers<TSchemas>
}

export type AnyConnectorImpl = ConnectorImpl<ConnectorSchemas>

// MARK: - Runtime helpers

/** TODO: Helpers should receive the whole Def as input so we can do the re-mapping at the source layer */

export function connHelpers<TSchemas extends ConnectorSchemas>(
  schemas: TSchemas,
) {
  type _types = {
    [k in keyof TSchemas as k extends 'verticals' | 'sourceOutputEntities'
      ? never
      : k]: _infer<TSchemas[k]>
  }
  type _streams = {
    [k in keyof TSchemas['sourceOutputEntities']]: _infer<
      TSchemas['sourceOutputEntities'][k]
    >
  }
  type _streamName = keyof _streams

  type IntOpData = Extract<
    SyncOperation<{
      id: string
      entityName: 'integration'
      entity: _types['integrationData']
    }>,
    {type: 'data'}
  >
  type resoUpdate = ResoUpdateData<
    _types['resourceSettings'],
    _types['integrationData']
  >
  type stateUpdate = StateUpdateData<
    _types['sourceState'],
    _types['destinationState']
  >
  type Src = Source<_types['sourceOutputEntity'], resoUpdate, stateUpdate>

  type Op = SyncOperation<_types['sourceOutputEntity'], resoUpdate, stateUpdate>
  type InputOp = SyncOperation<
    _types['destinationInputEntity'],
    resoUpdate,
    stateUpdate
  >

  type OpData = Extract<Op, {type: 'data'}>
  type OpRes = Extract<Op, {type: 'resoUpdate'}>
  type OpState = Extract<Op, {type: 'stateUpdate'}>
  type _resourceUpdateType = ResourceUpdate<
    _types['sourceOutputEntity'],
    _types['resourceSettings']
  >
  type _webhookReturnType = WebhookReturnType<
    _types['sourceOutputEntity'],
    _types['resourceSettings']
  >
  return {
    ...schemas,
    _types: {} as _types,
    _streams: {} as _streams,
    _streamName: {} as _streamName,
    _resUpdateType: {} as resoUpdate,
    _stateUpdateType: {} as stateUpdate,
    _opType: {} as Op,
    _intOpType: {} as IntOpData,
    _sourceType: {} as Src,
    _inputOpType: {} as InputOp,
    _resourceUpdateType: {} as _resourceUpdateType,
    _webhookReturnType: {} as _webhookReturnType,

    // Fns
    _type: <K extends keyof _types>(_k: K, v: _types[K]) => v,
    _op: <K extends Op['type']>(
      ...args: {} extends Omit<Extract<Op, {type: K}>, 'type'>
        ? [K]
        : [K, Omit<Extract<Op, {type: K}>, 'type'>]
    ) => ({...args[1], type: args[0]}) as unknown as Extract<Op, {type: K}>,
    _opRes: (id: string, rest: Omit<OpRes, 'id' | 'type'>) =>
      R.identity<Op>({
        // We don't prefix in `_opData`, should we actually prefix here?
        ...rest,
        // TODO: ok so this is a sign that we should be prefixing using a link of some kind...
        id: makeId('reso', schemas.name.value, id),
        type: 'resoUpdate',
      }) as OpRes,
    _opState: (
      sourceState?: OpState['sourceState'],
      destinationState?: OpState['destinationState'],
    ) =>
      R.identity<Op>({
        sourceState,
        destinationState,
        type: 'stateUpdate',
      }) as OpState,
    _opData: <K extends OpData['data']['entityName']>(
      entityName: K,
      id: string,
      entity: string extends OpData['data']['entityName']
        ? Record<string, unknown> | null
        : Extract<OpData['data'], {entityName: K}>['entity'] | null,
    ) =>
      ({
        // TODO: Figure out why we need an `unknown` cast here
        data: {entityName, id, entity} as unknown as OpData['data'],
        type: 'data',
      }) satisfies OpData,
    _intOpData: (
      id: ExternalId,
      integrationData: _types['integrationData'],
    ): IntOpData => ({
      type: 'data',
      data: {
        // We don't prefix in `_opData`, should we actually prefix here?
        id: makeId('int', schemas.name.value, id),
        entityName: 'integration',
        entity: integrationData,
      },
    }),
    _webhookReturn: (
      resourceExternalId: _resourceUpdateType['resourceExternalId'],
      rest: Omit<_resourceUpdateType, 'resourceExternalId'>,
    ): _webhookReturnType => ({
      resourceUpdates: [{...rest, resourceExternalId}],
    }),
  }
}

// MARK: - Generic Helpers, perhaps move to separate file?

type _infer<T> = T extends z.ZodTypeAny ? z.infer<T> : never
type OmitNever<T> = Omit<T, NeverKeys<T>>
/** Surprisingly tricky, see. https://www.zhenghao.io/posts/ts-never */
type NeverKeys<T> = Exclude<
  {[K in keyof T]: [T[K]] extends [never] ? K : never}[keyof T],
  undefined
>
