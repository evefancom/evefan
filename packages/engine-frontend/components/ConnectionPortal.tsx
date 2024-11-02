'use client'

import {Loader} from 'lucide-react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'
import type {Id} from '@openint/cdk'
import type {UIPropsNoChildren} from '@openint/ui'
import {useToast} from '@openint/ui'
import {Tabs} from '@openint/ui/components/Tabs'
import {cn} from '@openint/ui/utils'
import {R} from '@openint/util'
import {WithConnectConfig} from '../hocs/WithConnectConfig'
import {_trpcReact} from '../providers/TRPCProvider'
import {AddConnectionTabContent} from './AddConnectionTabContent'
import {ConnectionsTabContent} from './ConnectionsTabContent'

type ConnectEventType = 'open' | 'close' | 'error'

export interface ConnectionPortalProps extends UIPropsNoChildren {
  onEvent?: (event: {type: ConnectEventType; ccfgId: Id['ccfg']}) => void
}

// TODO: Wrap this in memo so it does not re-render as much as possible.
// Also it would be nice if there was an easy way to automatically prefetch on the server side
// based on calls to useQuery so it doesn't need to be separately handled again on the client...
export function ConnectionPortal({className}: ConnectionPortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const {toast} = useToast()
  const ctx = _trpcReact.useContext()
  const listConnectionsRes = _trpcReact.listConnections.useQuery({})

  const deleteResource = _trpcReact.deleteResource.useMutation({
    onSuccess: () => {
      toast({title: 'Connection deleted', variant: 'success'})
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete connection',
        description: `${err.message}`,
        variant: 'destructive',
      })
    },
    onSettled: () => {
      ctx.listConnections.invalidate()
    },
  })

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams ?? {})
    params.set('connectTab', tab)
    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    })
  }

  return (
    <WithConnectConfig>
      {({ccfgs, verticals: categories}) => {
        if (!ccfgs.length) {
          return <div>No connectors configured</div>
        }

        const connectorConfigById = R.mapToObj(ccfgs, (i) => [i.id, i])
        const connections = (listConnectionsRes.data || [])
          .map((conn) => {
            const ccfg = connectorConfigById[conn.connectorConfigId]
            if (!ccfg) {
              console.warn('Missing connector config for connection', conn)
            }
            return ccfg ? {...conn, connectorConfig: ccfg} : null
          })
          .filter((c): c is NonNullable<typeof c> => !!c)

        const categoriesWithConnections = categories.map((category) => ({
          ...category,
          connections: connections.filter((c) =>
            category.connectorConfigs.includes(c.connectorConfig),
          ),
        }))
        const connectionCount = connections.length

        const tabConfig = [
          {
            key: 'connections',
            title: `My Connections (${connectionCount})`,
            content: (
              <ConnectionsTabContent
                connectionCount={connectionCount}
                isLoading={listConnectionsRes.isLoading}
                deleteResource={deleteResource.mutate}
                categoriesWithConnections={categoriesWithConnections}
                onConnect={() => navigateToTab('add-connection')}
              />
            ),
          },
          {
            key: 'add-connection',
            title: 'Add a Connection',
            content: (
              <AddConnectionTabContent
                connectorConfigFilters={{}}
                refetch={listConnectionsRes.refetch}
                onSuccessCallback={() => {
                  navigateToTab('connections')
                }}
              />
            ),
          },
        ]

        return (
          <div
            className={cn(
              'flex size-full flex-col gap-4 p-4 lg:p-8',
              className,
            )}>
            {listConnectionsRes.isLoading ||
            listConnectionsRes.isFetching ||
            listConnectionsRes.isRefetching ? (
              <div className="flex h-full min-h-[500px] flex-1 items-center justify-center">
                <Loader className="size-8 animate-spin text-button" />
              </div>
            ) : (
              <Tabs
                tabConfig={tabConfig}
                value={searchParams?.get('connectTab') ?? 'connections'}
                onValueChange={navigateToTab}
              />
            )}
          </div>
        )
      }}
    </WithConnectConfig>
  )
}
