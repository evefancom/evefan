import {
  initSDK,
  type ClientOptions,
  type SdkDefinition,
  type SDKTypes,
} from '@opensdks/runtime'
import type {OpenIntHeaders} from '@openint/api'
import oasMeta from './openapi.meta'
import type oasTypes from './openapi.types'

export type OpenIntSdkTypes = SDKTypes<
  oasTypes,
  Omit<ClientOptions, 'headers'> & {headers: OpenIntHeaders}
>

export const openIntSdkDef = {
  types: {} as OpenIntSdkTypes,
  oasMeta,
} satisfies SdkDefinition<OpenIntSdkTypes>

export function initOpenIntSDK(opts: OpenIntSdkTypes['options']) {
  return initSDK(openIntSdkDef, opts)
}

export type OpenIntSDK = ReturnType<typeof initOpenIntSDK>
