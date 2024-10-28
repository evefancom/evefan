'use client'

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
        console.log({connectionCount})

        const tabConfig = [
          {
            key: 'connections',
            title: `My Connections (${connectionCount})`,
            content: (
              <ConnectionsTabContent
                connectionCount={connectionCount}
                refetch={listConnectionsRes.refetch}
                isLoading={listConnectionsRes.isLoading}
                deleteResource={deleteResource.mutate}
                categoriesWithConnections={categoriesWithConnections}
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
              />
            ),
          },
        ]

        return (
          <div className={cn('gap-4 p-4 lg:p-8', className)}>
            <Tabs tabConfig={tabConfig} defaultValue="connections" />
          </div>
        )
      }}
    </WithConnectConfig>
  )
}
