'use client'

import type React from 'react'
import type {Id, Vertical} from '@openint/cdk'
import {VERTICAL_BY_KEY, type VerticalKey} from '@openint/cdk'
import type {RouterOutput} from '@openint/engine-backend'
import {_trpcReact} from '../providers/TRPCProvider'

export type Connector = RouterOutput['listConnectorMetas'][string]

export type ConnectorConfig =
  RouterOutput['listConnectorConfigInfos'][number] & {
    connector: Connector
  }

export type ConfiguredIntegration =
  RouterOutput['listConfiguredIntegrations']['items'][number] & {
    ccfg: ConnectorConfig
  }
export type ConfiguredVertical = Vertical & {
  connectorConfigs: ConnectorConfig[]
}

export interface ConnectorConfigFilters {
  verticalKey?: VerticalKey
  connectorName?: string
  connectorConfigId?: Id['ccfg']
  // Allow filtering by integrations, not just connector configs?
  // integrationId
  // search text?
}

export function WithConnectConfig({
  children,
  verticalKey: verticalKey,
  ...props
}: ConnectorConfigFilters & {
  // etc.
  children: (props: {
    ccfgs: ConnectorConfig[]
    verticals: ConfiguredVertical[]
  }) => React.ReactElement | null
}) {
  const listConnectorConfigsRes = _trpcReact.listConnectorConfigInfos.useQuery({
    id: props.connectorConfigId,
    connectorName: props.connectorName,
  })

  const listConnectorsRes = _trpcReact.listConnectorMetas.useQuery()

  if (!listConnectorConfigsRes.data || !listConnectorsRes.data) {
    return null
  }

  const ccfgs = listConnectorConfigsRes.data
    ?.filter((ccfg) => !verticalKey || ccfg.verticals?.includes(verticalKey))
    .map((ccfg) => ({
      ...ccfg,
      connector: listConnectorsRes.data[ccfg.connectorName]!,
    }))


  const verticals = Object.values(VERTICAL_BY_KEY)
    .map((category) => {
      const categoryCcfgs = ccfgs.filter(
        (ccfg) => ccfg.connector?.verticals.includes(category.key),
      )
      return {...category, connectorConfigs: categoryCcfgs}
    })
    .filter((item) => item.connectorConfigs.length > 0)

  // console.log(category, {
  //   ccfgs,
  //   catalogRes: catalogRes.data,
  // })

  return children({ccfgs, verticals})
}
