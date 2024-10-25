import {zId} from '@openint/cdk'
import type {RouterOutput} from '@openint/engine-backend'
import type {z} from '@openint/util'
import {zRecord} from '@openint/util'

type Pipeline = RouterOutput['listPipelines'][number]
type Resource = RouterOutput['listConnections'][number]
type ConnectorConfig = RouterOutput['adminListConnectorConfigs'][number]
type ConnectorMeta = RouterOutput['listConnectorMetas'][string]

export const zClient = {
  pipeline: zRecord<Pipeline>().refine(
    (p) => zId('pipe').safeParse(p.id).success,
    {message: 'Invalid pipeline'},
  ),
  resource: zRecord<Resource>().refine(
    (r) => zId('reso').safeParse(r.id).success,
    {message: 'Invalid resource'},
  ),
  connector_config: zRecord<ConnectorConfig>().refine(
    (i) => zId('ccfg').safeParse(i.id).success,
    {message: 'Invalid connector config'},
  ),
  connector: zRecord<ConnectorMeta>().refine(
    (p) => p.__typename === 'connector',
    {message: 'Invalid connector meta'},
  ),
}
export type ZClient = {
  [k in keyof typeof zClient]: z.infer<(typeof zClient)[k]>
}
