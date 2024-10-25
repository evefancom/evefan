'use client'

import { RefreshCw} from 'lucide-react'
import type {RouterOutput} from '@openint/engine-backend'
import {useToast, type UIProps} from '@openint/ui'
import type {ConnectorConfig} from '../hocs/WithConnectConfig'
import {WithConnectorConnect} from '../hocs/WithConnectorConnect'
import {useOptionalOpenIntConnectContext} from '../providers/OpenIntConnectProvider'
import {_trpcReact} from '../providers/TRPCProvider'

type ConnectEventType = 'open' | 'close' | 'error'

type Resource = RouterOutput['listConnections'][number]

/**
 * TODO: Add loading indicator when mutations are happening as a result of
 * selecting dropdown menu action
 */
export function AgResourceRowActions(
  props: UIProps & {
    connectorConfig: ConnectorConfig
    resource: Resource
    onEvent?: (event: {type: ConnectEventType}) => void
  },
) {
  const {toast} = useToast()

  const {debug} = useOptionalOpenIntConnectContext()

  // Add me when we introduce displayName field
  // const updateResource = trpcReact.updateResource.useMutation({
  //   onSuccess: () => {
  //     setOpen(false)
  //     toast({title: 'Resource updated', variant: 'success'})
  //   },
  //   onError: (err) => {
  //     toast({
  //       title: 'Failed to save resource',
  //       description: `${err.message}`,
  //       variant: 'destructive',
  //     })
  //   },
  // })

  const ctx = _trpcReact.useContext()
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
  const syncResource = _trpcReact.dispatch.useMutation({
    onSuccess: () => {
      toast({title: 'Sync requested', variant: 'success'})
    },
    onError: (err) => {
      toast({
        title: 'Failed to start sync',
        description: `${err.message}`,
        variant: 'destructive',
      })
    },
  })
  // Is there a way to build the variables into useMutation already?
  const syncResourceMutate = () =>
    syncResource.mutate({
      name: 'sync/resource-requested',
      data: {resourceId: props.resource.id},
    })

  // TODO: Turn this into a menu powered by the command abstraction?
  return (
    // Not necessarily happy that we have to wrap the whole thing here inside
    // WithProviderConnect but also don't know of a better option
    <WithConnectorConnect {...props}>
      {() => (
        <div className="flex flex-row items-center space-x-2">
          {debug && (
            <button
              type="button"
              onClick={(e) => {
                syncResourceMutate()
                e.preventDefault()
              }}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap group border bg-white border-stroke enabled:active:bg-background-mid enabled:active:border-1 focus:border-1 hover:border-[#8192FF] enabled:hover:bg-background-mid disabled:bg-background-mid disabled:border-stroke disabled:cursor-not-allowed disabled:text-black-light disabled:opacity-50 h-9 py-2 px-3 rounded-lg"
            >
              <RefreshCw className="text-black-light w-5 h-5" />
              <p className="antialiased text-sm tracking-[-0.01em] text-[#8192FF]">Update</p>
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteResource.mutate({id: props.resource.id})}
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap group border bg-white border-stroke enabled:active:bg-background-mid enabled:active:border-1 focus:border-1 hover:border-[#8192FF] enabled:hover:bg-background-mid disabled:bg-background-mid disabled:border-stroke disabled:cursor-not-allowed disabled:text-black-light disabled:opacity-50 h-9 py-2 px-3 rounded-lg"
          >
            <RefreshCw className="text-black-light w-5 h-5" />
            <p className="antialiased text-sm tracking-[-0.01em] text-[#8192FF]">Disconnect</p>
          </button>
        </div>
      )}
    </WithConnectorConnect>
  )
}
