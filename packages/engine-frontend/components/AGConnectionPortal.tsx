'use client'

import {AlertTriangle} from 'lucide-react'
import React from 'react'
import type {Id} from '@openint/cdk'
import type {UIPropsNoChildren} from '@openint/ui'
import {Card, ResourceCard} from '@openint/ui'
import {cn} from '@openint/ui/utils'
import {R} from '@openint/util'
import {WithConnectConfig} from '../hocs/WithConnectConfig'
import {_trpcReact} from '../providers/TRPCProvider'
import {AgResourceRowActions} from './AgResourceRowActions'
import {ConnectDialog} from './ConnectDialog'

type ConnectEventType = 'open' | 'close' | 'error'

export interface AGConnectionPortalProps extends UIPropsNoChildren {
  onEvent?: (event: {type: ConnectEventType; ccfgId: Id['ccfg']}) => void
}

// Custom comparison function for React.memo
const areEqual = (
  prevProps: AGConnectionPortalProps,
  nextProps: AGConnectionPortalProps,
) => {
  console.log('areEqual', prevProps, nextProps)
  return (
    prevProps.onEvent === nextProps.onEvent &&
    prevProps.className === nextProps.className
  )
}

// Define the component as a functional component
const AGConnectionPortalComponent: React.FC<AGConnectionPortalProps> = ({
  onEvent,
  className,
}) => {
  const listConnectionsRes = _trpcReact.listConnections.useQuery({})

  const [openDialog, setOpenDialog] = React.useState(false)

  // This can be called by the same window like
  // postMessage({ type: 'triggerConnectDialog', value: false }, '*');
  // or by the parent window like
  // const iframe = document.getElementById('openint-connect-iframeId');
  // iframe?.contentWindow.postMessage({type: 'triggerConnectDialog', value: true },'*');

  const handleMessage = React.useCallback(async (event: MessageEvent) => {
    if (event.data.type === 'triggerConnectDialog') {
      console.log('triggerConnectDialog', event.data.value)
      if (event.data.value) {
        await listConnectionsRes.refetch().then(() => {
          setOpenDialog(event.data.value)
        })
      }
    }
  }, [])

  React.useEffect(() => {
    console.log('Adding message event listener')
    window.addEventListener('message', handleMessage)
    return () => {
      console.log('Removing message event listener')
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  console.log('Render AGConnectionPortal, openDialog:', openDialog)

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

        if (categoriesWithConnections.length > 1) {
          console.warn(
            'AG Connection Portal only currently supports 1 category being rendered via postMessage',
          )
        }

        return (
          <div className={cn('mb-4', className)}>
            {/* Listing by categories */}
            {categoriesWithConnections.map((category) => (
              <div key={category.key}>
                {category.connections.map((conn) => (
                  <ResourceCard
                    key={conn.id}
                    resource={conn}
                    connector={conn.connectorConfig.connector}
                    className="mb-4">
                    <AgResourceRowActions
                      connectorConfig={conn.connectorConfig}
                      resource={conn}
                      onEvent={(e) => {
                        onEvent?.({
                          type: e.type,
                          ccfgId: conn.connectorConfig.id,
                        })
                      }}
                    />
                  </ResourceCard>
                ))}
                {category.connections.length === 0 && (
                  <Card className="drop-shadow-small flex w-full flex-col items-center justify-center space-y-3 rounded-lg border border-solid border-[#e0e0e5] bg-[#f8f8fc] p-6 text-center">
                    <div className="flex flex-row gap-2">
                      <AlertTriangle className="size-8 text-[#C27B1A]" />
                      <h3 className="text-black-dark mb-2 text-[24px] font-semibold leading-[36px] tracking-tight antialiased">
                        {`No data source connected`}
                      </h3>
                    </div>
                  </Card>
                )}
                {openDialog && (
                  <ConnectDialog
                    connectorConfigFilters={{verticalKey: category.key}}
                    open={openDialog}
                    setOpen={setOpenDialog}
                    connectorNames={category.connections.map(
                      (c) => c.connectorName,
                    )}
                    // trigger refetch of connections
                    onEvent={() => listConnectionsRes.refetch()}
                  />
                )}
              </div>
            ))}
          </div>
        )
      }}
    </WithConnectConfig>
  )
}

// Export the component using React.memo
export const AGConnectionPortal = React.memo(
  AGConnectionPortalComponent,
  areEqual,
)
