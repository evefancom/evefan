'use client'

import {Loader, Search} from 'lucide-react'
import {useState} from 'react'
import type {Id} from '@openint/cdk'
import {Input, parseCategory} from '@openint/ui'
import {CheckboxFilter} from '@openint/ui/components/CheckboxFilter'
import {IntegrationCard} from '@openint/ui/domain-components/IntegrationCard'
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
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])

  const listIntegrationsRes = _trpcReact.listConfiguredIntegrations.useQuery({
    connector_config_ids: connectorConfigs.map((ccfg) => ccfg.id),
    search_text: searchText,
  })
  const ints = listIntegrationsRes.data?.items.map((int) => ({
    ...int,
    ccfg: connectorConfigs.find((ccfg) => ccfg.id === int.connector_config_id)!,
  }))

  const categories = Array.from(
    new Set(connectorConfigs.flatMap((ccfg) => ccfg.verticals)),
  )

  const intsByCategory = ints?.reduce(
    (acc, int) => {
      ;(int.verticals ?? int.ccfg.verticals).forEach((vertical) => {
        if (categoryFilter.length === 0 || categoryFilter.includes(vertical)) {
          acc[vertical] = (acc[vertical] || []).concat(int)
        }
      })
      return acc
    },
    {} as Record<string, typeof ints>,
  )

  const onApplyFilter = (selected: string[]) => {
    setCategoryFilter(selected)
  }

  return (
    <div className={className}>
      {/* Search integrations */}
      <div className="mb-2 bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-row gap-2">
          <div className="relative w-[450px]">
            {/* top-2.5 is not working for some reason due to tailwind setup */}
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-8"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {categories.length > 1 && (
            <CheckboxFilter options={categories} onApply={onApplyFilter} />
          )}
        </div>
      </div>
      {/* Search results */}
      {listIntegrationsRes.isLoading ? (
        <div className="flex h-full min-h-[500px] items-center justify-center">
          <Loader className="size-5 animate-spin text-[#8A5DF6]" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto py-4">
          {(ints && ints.length > 0) ||
          Object.keys(intsByCategory ?? {}).length > 0 ? (
            Object.entries(intsByCategory ?? {}).map(
              ([category, categoryInts]) => (
                <div key={category}>
                  <h3 className="mb-2 text-lg font-semibold">
                    {parseCategory(category)}
                  </h3>
                  <div className="flex flex-row gap-4">
                    {categoryInts.map((int) => (
                      <WithConnectorConnect
                        key={int.id}
                        connectorConfig={{
                          id: int.connector_config_id,
                          connector: int.ccfg.connector,
                        }}
                        integration={{id: int.id as Id['int']}}
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
                          <IntegrationCard
                            onClick={openConnect}
                            logo={
                              int.logo_url ?? int.ccfg.connector.logoUrl ?? ''
                            }
                            name={int.name}
                          />
                        )}
                      </WithConnectorConnect>
                    ))}
                  </div>
                </div>
              ),
            )
          ) : (
            <div>
              <p className="text-lg font-semibold">
                No available connectors, please check that you have configured
                connectors available or review your filter values.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
