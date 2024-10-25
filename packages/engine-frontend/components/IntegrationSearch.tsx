'use client'

import {Loader, Search} from 'lucide-react'
import React from 'react'
import {Input} from '@openint/ui'
import {ConnectionCard} from '@openint/ui/domain-components/ConnectionCard'
import type {ConnectorConfig} from '../hocs/WithConnectConfig'
import type {ConnectEventType} from '../hocs/WithConnectorConnect'
import {WithConnectorConnect} from '../hocs/WithConnectorConnect'
import {_trpcReact} from '../providers/TRPCProvider'

export function IntegrationSearch({
  className,
  connectorConfigs,
  onEvent,
}: {
  className?: string
  /** TODO: Make this optional so it is easier to use it as a standalone component */
  connectorConfigs: ConnectorConfig[]
  onEvent?: (event: {
    integration: {
      connectorConfigId: string
      id: string
    }
    type: ConnectEventType
  }) => void
}) {
  const [searchText, setSearchText] = React.useState('')

  const listIntegrationsRes = _trpcReact.listConfiguredIntegrations.useQuery({
    connector_config_ids: connectorConfigs.map((ccfg) => ccfg.id),
    search_text: searchText,
  })
  const ints = listIntegrationsRes.data?.items.map((int) => ({
    ...int,
    ccfg: connectorConfigs.find((ccfg) => ccfg.id === int.connector_config_id)!,
  }))

  const intsByCategory = ints?.reduce(
    (acc, int) => {
      int.ccfg.verticals.forEach((vertical) => {
        acc[vertical] = (acc[vertical] || []).concat(int)
      })
      return acc
    },
    {} as Record<string, typeof ints>,
  )

  return (
    <div className={className}>
      {/* Search integrations */}
      <div className="mb-2 bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form>
          <div className="relative">
            {/* top-2.5 is not working for some reason due to tailwind setup */}
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </form>
      </div>
      {/* Search results */}
      {listIntegrationsRes.isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-[#8A5DF6]" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto py-4">
          {Object.entries(intsByCategory ?? {}).map(
            ([category, categoryInts]) => (
              <div key={category}>
                <h3 className="mb-2 text-lg font-semibold">
                  {category.length < 5
                    ? category.toUpperCase()
                    : category
                        .split('-')
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ')}
                </h3>
                <div className="flex flex-row gap-4">
                  {categoryInts.map((int) => (
                    <WithConnectorConnect
                      key={int.id}
                      connectorConfig={{
                        id: int.connector_config_id,
                        connector: int.ccfg.connector,
                      }}
                      onEvent={(e) => {
                        onEvent?.({
                          type: e.type,
                          integration: {
                            connectorConfigId: int.connector_config_id,
                            id: int.id,
                          },
                        })
                      }}>
                      {({openConnect}) => (
                        <ConnectionCard
                          onClick={openConnect}
                          logo={int.ccfg.connector.logoUrl ?? ''}
                          name={int.name}
                        />
                      )}
                    </WithConnectorConnect>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
