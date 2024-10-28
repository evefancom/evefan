'use client'

import {Loader2} from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import {zConnectorStage, zVerticalKey} from '@openint/cdk'
import type {RouterOutput} from '@openint/engine-backend'
import {_trpcReact} from '@openint/engine-frontend'
import {
  ConnectorCard as _ConnectorCard,
  ConnectorConfigCard as _ConnectorConfigCard,
  Button,
  LoadingText,
} from '@openint/ui'
import {inPlaceSort, R, titleCase} from '@openint/util'
import {ConnectorConfigSheet} from './ConnectorConfigSheet'

export type ConnectorConfig = RouterOutput['adminListConnectorConfigs'][number]

export default function ConnectorConfigsPage() {
  const connectorConfigsRes = _trpcReact.adminListConnectorConfigs.useQuery()
  const catalog = _trpcReact.listConnectorMetas.useQuery()
  if (!connectorConfigsRes.data || !catalog.data) {
    return <LoadingText className="block p-4" />
  }

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        Configured connectors
      </h2>
      {connectorConfigsRes.isFetching && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {connectorConfigsRes.data ? (
        <div className="flex flex-wrap">
          {connectorConfigsRes.data.map((ccfg) => {
            const connector = catalog.data[ccfg.connectorName]!
            if (!connector) return
            return (
              <ConnectorConfigCard
                key={ccfg.id}
                connector={connector}
                connectorConfig={ccfg}>
                <ConnectorConfigSheet
                  connectorConfig={ccfg}
                  connectorName={connector.name}
                />
              </ConnectorConfigCard>
            )
          })}
        </div>
      ) : (
        <div>No connectors configured</div>
      )}
      {/* Spacer */}
      <div className="mt-4" />
      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
        Available connectors
      </h2>
      {zVerticalKey.options.map((vertical) => {
        const stageByIndex = R.mapToObj.indexed(
          zConnectorStage.options,
          (o, i) => [o, i],
        )
        const connectors = inPlaceSort(
          Object.values(catalog.data).filter(
            (p) => p.verticals.includes(vertical) && p.stage !== 'hidden',
          ),
        ).desc((p) => stageByIndex[p.stage])
        if (!connectors.length) {
          return null
        }
        return (
          <div key={vertical}>
            <h3 className="mb-4 ml-4 text-xl font-semibold tracking-tight">
              {titleCase(vertical)}
            </h3>
            <div className="flex flex-wrap">
              {connectors.map((connector) => (
                <ConnectorCard
                  key={`${vertical}-${connector.name}`}
                  connector={connector}>
                  {connector.stage === 'alpha' ? (
                    <Button
                      className="mt-2"
                      variant="ghost"
                      onClick={() =>
                        window.open(
                          `mailto:hi@venice.is?subject=Request%20access%20to%20${connector.displayName}%20connectors&body=My%20use%20case%20is...`,
                        )
                      }>
                      Request access
                    </Button>
                  ) : (
                    <ConnectorConfigSheet connectorName={connector.name} />
                  )}
                </ConnectorCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ConnectorCard = (props: React.ComponentProps<typeof _ConnectorCard>) => (
  <_ConnectorCard Image={Image as any} showStageBadge {...props} />
)

const ConnectorConfigCard = (
  props: React.ComponentProps<typeof _ConnectorConfigCard>,
) => <_ConnectorConfigCard Image={Image as any} showStageBadge {...props} />
