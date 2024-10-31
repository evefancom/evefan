'use client'

import NangoFrontend from '@nangohq/frontend'
import {useMutation} from '@tanstack/react-query'
import {Link2, Loader2, RefreshCw, Trash2} from 'lucide-react'
import React from 'react'
import type {
  ConnectorClient,
  Id,
  OpenDialogFn,
  UseConnectHook,
} from '@openint/cdk'
import {
  CANCELLATION_TOKEN,
  extractConnectorName,
  extractId,
  oauthConnect,
  zVerticalKey,
} from '@openint/cdk'
import type {RouterInput, RouterOutput} from '@openint/engine-backend'
import type {SchemaFormElement, UIProps, UIPropsNoChildren} from '@openint/ui'
import {
  Button,
  ConnectorConfigCard,
  DeprecatedIntegrationCard,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ResourceCard,
  SchemaForm,
  useToast,
} from '@openint/ui'
import {cn} from '@openint/ui/utils'
import {R, titleCase, z} from '@openint/util'
import {_trpcReact} from './providers/TRPCProvider'

type ConnectEventType = 'open' | 'close' | 'error'

export interface OpenIntConnectProps extends UIPropsNoChildren {
  /** Whether to display the existing connections */
  showExisting?: boolean
  clientConnectors: Record<string, ConnectorClient>
  onEvent?: (event: {type: ConnectEventType; ccfgId: Id['ccfg']}) => void
  /** Only connect to this connector config */
  connectorConfigId?: Id['ccfg'] | null
  connectorName?: string | null
}

type UseConnectScope = Parameters<UseConnectHook>[0]
interface DialogConfig {
  Component: Parameters<UseConnectScope['openDialog']>[0]
  options: Parameters<UseConnectScope['openDialog']>[1]
}

/**
 * TODO: Figure out if we can reuse the same dialog such that when a provider is selected
 * we can replace the dialog content.
 * Alternatively if there's something like a mobile app navigation where it's part of a
 * "back" stack...
 */
export function OpenIntConnectButton({
  children,
  className,
  ...props
}: OpenIntConnectProps & {className?: string; children?: React.ReactNode}) {
  const [open, setOpen] = React.useState(false)
  return (
    // non modal dialog do not add pointer events none to the body
    // which workaround issue with multiple portals (dropdown, dialog) conflicting
    // as well as other modals introduced by things like Plaid
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className={className} variant="default">
            Connect
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-screen flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>New connection</DialogTitle>
          <DialogDescription>
            Choose a connector config to start
          </DialogDescription>
        </DialogHeader>
        <OpenIntConnect
          className="flex-1 overflow-scroll"
          {...props}
          onEvent={(event) => {
            // How do we close the dialog when an connector config has been chosen?
            // This is problematic because if OpenIntConnect itself gets removed from dom
            // then any dialog it presents goes away also
            // Tested forceMount though and it doesn't quite work... So we might want something like a hidden
            props.onEvent?.(event)
          }}
        />
        {/* Children here */}
        <DialogFooter className="shrink-0">{/* Cancel here */}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// TODO: Wrap this in memo so it does not re-render as much as possible.
// Also it would be nice if there was an easy way to automatically prefetch on the server side
// based on calls to useQuery so it doesn't need to be separately handled again on the client...
export function OpenIntConnect(props: OpenIntConnectProps) {
  const listConnectorConfigsRes = _trpcReact.listConnectorConfigInfos.useQuery({
    id: props.connectorConfigId,
    connectorName: props.connectorName,
  })
  const listIntegrationsRes = _trpcReact.listConfiguredIntegrations.useQuery({
    // id: props.connectorConfigId,
    // connectorName: props.connectorName,
  })
  const catalogRes = _trpcReact.listConnectorMetas.useQuery()

  if (
    !listConnectorConfigsRes.data ||
    !listIntegrationsRes.data ||
    !catalogRes.data
  ) {
    return <div>Loading...</div>
  }
  return (
    <_OpenIntConnect
      connectorConfigInfos={listConnectorConfigsRes.data ?? []}
      catalog={catalogRes.data}
      integrations={listIntegrationsRes.data.items}
      {...props}
    />
  )
}

type ConnectorConfigInfos = RouterOutput['listConnectorConfigInfos']
type Catalog = RouterOutput['listConnectorMetas']
type Integrations = RouterOutput['listConfiguredIntegrations']['items']
type ConnectorMeta = Catalog[string]

// TODOD: Dedupe this with app-config/constants
const __DEBUG__ = Boolean(
  typeof window !== 'undefined' && window.location.hostname === 'localhost',
)

/** Need _OpenIntConnect connectorConfigIds to not have useConnectHook execute unreliably  */
export function _OpenIntConnect({
  catalog,
  clientConnectors,
  onEvent,
  showExisting,
  className,
  connectorConfigInfos,
  integrations,
  debugConnectorConfigs,
  ...uiProps
}: OpenIntConnectProps & {
  connectorConfigInfos: ConnectorConfigInfos
  catalog: Catalog
  integrations: Integrations
  debugConnectorConfigs?: boolean
}) {
  const nangoPublicKey =
    _trpcReact.getPublicEnv.useQuery().data?.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  const nangoFrontend = React.useMemo(
    () =>
      nangoPublicKey &&
      new NangoFrontend({publicKey: nangoPublicKey, debug: __DEBUG__}),
    [nangoPublicKey],
  )

  // OpenIntConnect should be fetching its own connectorConfigIds as well as resources
  // this way it can esure those are refreshed as operations take place
  // This is esp true when we are operating in client envs (js embed)
  // and cannot run on server-side per-se

  const listConnectionsRes = _trpcReact.listConnections.useQuery(
    {},
    {enabled: showExisting},
  )

  console.log('[OpenIntConnect] integrations', integrations)
  const connectorConfigs = connectorConfigInfos
    .map(({id, ...info}) => {
      const connector = catalog[extractConnectorName(id)]
      if (!connector) {
        console.warn('Missing connector for connector config', id)
      }
      return connector ? {...info, id, connector} : null
    })
    .filter((i): i is NonNullable<typeof i> => !!i)
  const connectorConfigById = R.mapToObj(connectorConfigs, (i) => [i.id, i])

  const configuredIntegrations = integrations
    .map((int) => {
      const connector = catalog[extractConnectorName(int.connector_config_id)]
      if (!connector) {
        console.warn('Missing connectorMeta', int.connector_config_id)
      }
      return connector ? {...int, connector} : null
    })
    .filter((i): i is NonNullable<typeof i> => !!i)

  // TODO: seems that we are still displaying some data from cache, fix me here...
  // Also maybe connect should be deployed to a different domain to prevent unexpected state persistence
  // that can cause sublte bugs
  const connections = ((showExisting && listConnectionsRes.data) || [])
    .map((conn) => {
      const ccfg = connectorConfigById[conn.connectorConfigId]
      if (!ccfg) {
        console.warn('Missing connector config for connection', conn)
      }
      return ccfg ? {...conn, connectorConfig: ccfg} : null
    })
    .filter((c): c is NonNullable<typeof c> => !!c)

  console.log('[OpenIntConnect] connector configs', connectorConfigs)
  console.log('[OpenIntConnect] connections', connections)

  const [_dialogConfig, setDialogConfig] = React.useState<DialogConfig | null>(
    null,
  )
  // TODO: Fix me by actually implementing it...
  const openDialog: OpenDialogFn = React.useCallback(
    (render, options) => {
      setDialogConfig({Component: render, options})
    },
    [setDialogConfig],
  )

  // Do we actually need this here or can this go inside a ConnectCard somehow?
  const connectFnMap = R.pipe(
    connectorConfigInfos,
    R.map((ccfgInfo) => extractConnectorName(ccfgInfo.id)),
    R.uniq,
    R.mapToObj((connectorName: string) => {
      let fn = clientConnectors[connectorName]?.useConnectHook?.({openDialog})
      const nangoProvider = catalog[connectorName]?.nangoProvider
      if (!fn && nangoProvider) {
        console.log('adding nnango provider for', nangoProvider)
        fn = (_, {connectorConfigId}) => {
          if (!nangoFrontend) {
            throw new Error('Missing nango public key')
          }
          return oauthConnect({connectorConfigId, nangoFrontend, connectorName})
        }
      }
      return [connectorName, fn]
    }),
  )

  const categories = zVerticalKey.options
    .map((category) => {
      const ccfgs = connectorConfigs.filter(
        (ccfg) => ccfg.connector?.verticals.includes(category),
      )
      return {
        key: category,
        name: titleCase(category),
        connectorConfigs: ccfgs,
        connections: connections.filter((c) =>
          ccfgs.includes(c.connectorConfig),
        ),
      }
    })
    .filter((item) => item.connectorConfigs.length > 0)

  if (!connectorConfigs.length) {
    return <div>No connectors configured</div>
  }
  return (
    <div className={cn('', className)}>
      {/* Listing by categories */}
      {categories.map((category) => (
        <div key={category.key}>
          <h3 className="mb-4 ml-4 text-xl font-semibold tracking-tight">
            {category.name}
          </h3>
          {category.connectorConfigs.map((int) => (
            <div key={int.id}>Connect with {int.id}</div>
          ))}
          {/* Show existing */}
          {category.connections.map((conn) => (
            <ResourceCard
              {...uiProps}
              key={conn.id}
              resource={conn}
              connector={conn.connectorConfig.connector}>
              <ResourceDropdownMenu
                connectorConfig={conn.connectorConfig}
                resource={conn}
                connectFn={connectFnMap[conn.connectorConfig.connector.name]}
                onEvent={(e) => {
                  onEvent?.({type: e.type, ccfgId: conn.connectorConfig.id})
                }}
              />
              {/* <ProviderConnectButton
            connectorConfig={conn.connectorConfig}
            resource={conn}
            connectFn={connectFnMap[conn.connectorConfig.connector.name]}
            onEvent={(e) => {
              onEvent?.({type: e.type, ccfgId: conn.connectorConfig.id})
            }}
          /> */}
            </ResourceCard>
          ))}
        </div>
      ))}

      <hr />
      {/* Show existing */}
      {
        // connections.map((conn) => (
        //   <ResourceCard
        //     {...uiProps}
        //     key={conn.id}
        //     resource={conn}
        //     connector={conn.connectorConfig.connector}>
        //     <ResourceDropdownMenu
        //       connectorConfig={conn.connectorConfig}
        //       resource={conn}
        //       connectFn={connectFnMap[conn.connectorConfig.connector.name]}
        //       onEvent={(e) => {
        //         onEvent?.({type: e.type, ccfgId: conn.connectorConfig.id})
        //       }}
        //     />
        //     {/* <ProviderConnectButton
        //       connectorConfig={conn.connectorConfig}
        //       resource={conn}
        //       connectFn={connectFnMap[conn.connectorConfig.connector.name]}
        //       onEvent={(e) => {
        //         onEvent?.({type: e.type, ccfgId: conn.connectorConfig.id})
        //       }}
        //     /> */}
        //   </ResourceCard>
        // ))
      }
      {/* Add new  */}
      {debugConnectorConfigs &&
        connectorConfigs.map((ccfg) => (
          <ConnectorConfigCard
            {...uiProps}
            key={ccfg.id}
            connectorConfig={ccfg}
            connector={ccfg.connector}>
            <ProviderConnectButton
              connectorConfig={ccfg}
              connectFn={connectFnMap[ccfg.connector.name]}
              onEvent={(e) => {
                onEvent?.({type: e.type, ccfgId: ccfg.id})
              }}
            />
          </ConnectorConfigCard>
        ))}
      {!debugConnectorConfigs &&
        configuredIntegrations.map((int) => (
          <DeprecatedIntegrationCard
            {...uiProps}
            key={int.id}
            integration={{
              ...int,
              connectorName: int.connector_name,
              // connectorConfigId: int.connector_config_id,
            }}>
            <ProviderConnectButton
              connectorConfig={{
                id: int.connector_config_id,
                connector: int.connector,
              }}
              connectFn={connectFnMap[int.connector_name]}
              onEvent={(e) => {
                onEvent?.({type: e.type, ccfgId: int.connector_config_id})
              }}
            />
          </DeprecatedIntegrationCard>
        ))}
    </div>
  )
}

type Resource = RouterOutput['listConnections'][number]

export const ProviderConnectButton = ({
  onEvent,
  className,
  ...props
}: UIProps & {
  connectorConfig: {id: Id['ccfg']; connector: ConnectorMeta}
  resource?: Resource
  connectFn?: ReturnType<UseConnectHook>
  onEvent?: (event: {type: ConnectEventType}) => void
}) => (
  <WithProviderConnect {...props}>
    {({loading, label, openConnect: open, variant}) => (
      <DialogTrigger asChild>
        <Button
          className={cn('mt-2', className)}
          disabled={loading}
          variant={variant}
          onClick={(e) => {
            onEvent?.({type: 'open'})
            if (!props.connectFn) {
              // Allow the default behavior of opening the dialog
              return
            }
            // Prevent dialog from automatically opening
            // as we invoke provider client side JS
            e.preventDefault()
            open()
          }}>
          {label}
        </Button>
      </DialogTrigger>
    )}
  </WithProviderConnect>
)

export const WithProviderConnect = ({
  connectorConfig: ccfg,
  resource,
  connectFn,
  children,
}: {
  connectorConfig: {id: Id['ccfg']; connector: ConnectorMeta}
  resource?: Resource
  connectFn?: ReturnType<UseConnectHook>
  onEvent?: (event: {type: ConnectEventType}) => void
  children: (props: {
    openConnect: () => void
    label: string
    variant: 'default' | 'ghost'
    loading: boolean
  }) => React.ReactNode
}) => {
  // console.log('ConnectCard', int.id, int.connector)

  const resourceExternalId = resource ? extractId(resource.id)[2] : undefined

  // TODO: Handle preConnectInput schema and such... for example for Plaid
  const preConnect = _trpcReact.preConnect.useQuery(
    [ccfg.id, {resourceExternalId}, {}],
    {enabled: ccfg.connector.hasPreConnect},
  )
  const postConnect = _trpcReact.postConnect.useMutation()
  const createResource = _trpcReact.createResource.useMutation()

  const {toast} = useToast()

  const connect = useMutation(
    // not sure if it's the right idea to have create and connect together in
    // one mutation, starting to feel a bit confusing...
    async (input?: RouterInput['createResource']) => {
      // For postgres and various connectors that does not require client side JS
      if (input) {
        return createResource.mutateAsync(input)
      }
      // For plaid and other connectors that requires client side JS
      // TODO: Test this...
      // How to make sure does not actually refetch we if we already have data?
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const connInput = ccfg.connector.hasPreConnect
        ? (await preConnect.refetch()).data
        : {}
      console.log(`[OpenIntConnect] ${ccfg.id} connInput`, connInput)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const connOutput = connectFn
        ? await connectFn?.(connInput, {connectorConfigId: ccfg.id})
        : connInput
      console.log(`[OpenIntConnect] ${ccfg.id} connOutput`, connOutput)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const postConnOutput = ccfg.connector.hasPostConnect
        ? await postConnect.mutateAsync([connOutput, ccfg.id, {}])
        : connOutput
      console.log(`[OpenIntConnect] ${ccfg.id} postConnOutput`, postConnOutput)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return postConnOutput
    },
    {
      onSuccess(msg) {
        if (msg) {
          toast({
            title: `Success (${ccfg.connector.displayName})`,
            description: `${msg}`,
            variant: 'success',
          })
        }
        setOpen(false)
      },
      onError: (err) => {
        if (err === CANCELLATION_TOKEN) {
          return
        }
        toast({
          title: `Failed to connect to ${ccfg.connector.displayName}`,
          description: `${err}`,
          variant: 'destructive',
        })
      },
    },
  )

  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<SchemaFormElement>(null)

  // console.log('ccfg', int.id, 'open', open)
  return (
    // non modal dialog do not add pointer events none to the body
    // which workaround issue with multiple portals (dropdown, dialog) conflicting
    // as well as other modals introduced by things like Plaid
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {children({
        // Children is responsible for rendering dialog triggers as needed
        openConnect: () => {
          connect.mutate(undefined)
        },
        loading: connect.isLoading,
        variant: resource?.status === 'disconnected' ? 'default' : 'ghost',
        label: resource ? 'Reconnect' : 'Connect',
      })}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect to {ccfg.connector.name}</DialogTitle>
          <DialogDescription>
            Using connector config ID: {ccfg.id}
          </DialogDescription>
        </DialogHeader>
        <SchemaForm
          ref={formRef}
          schema={z.object({})}
          jsonSchemaTransform={(schema) =>
            ccfg.connector.schemas.resourceSettings ?? schema
          }
          formData={{}}
          // formData should be non-null at this point, we should fix the typing
          loading={connect.isLoading}
          onSubmit={({formData}) => {
            console.log('resource form submitted', formData)
            connect.mutate({connectorConfigId: ccfg.id, settings: formData})
          }}
          hideSubmitButton
        />
        {/* Children here */}
        <DialogFooter>
          <Button
            disabled={connect.isLoading}
            onClick={() => formRef.current?.submit()}
            type="submit">
            {connect.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * TODO: Add loading indicator when mutations are happening as a result of
 * selecting dropdown menu action
 */
export function ResourceDropdownMenu(
  props: UIProps & {
    connectorConfig: {
      id: Id['ccfg']
      connector: ConnectorMeta
    }
    resource: Resource
    connectFn?: ReturnType<UseConnectHook>
    onEvent?: (event: {type: ConnectEventType}) => void
  },
) {
  const {toast} = useToast()
  const [open, setOpen] = React.useState(false)

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
  const deleteResource = _trpcReact.deleteResource.useMutation({
    onSuccess: () => {
      setOpen(false)
      toast({title: 'Connection deleted', variant: 'success'})
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete connection',
        description: `${err.message}`,
        variant: 'destructive',
      })
    },
  })
  const syncResource = _trpcReact.dispatch.useMutation({
    onSuccess: () => {
      setOpen(false)
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

  // TODO: Implement delete
  return (
    // Not necessarily happy that we have to wrap the whole thing here inside
    // WithProviderConnect but also don't know of a better option
    <WithProviderConnect {...props}>
      {(connectProps) => (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">Options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>{props.resource.id}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => {
                  // Need to explicitly close dropdown menu
                  // otherwise pointer:none will remain on the body for some reason
                  // if a dialog inside opens immediately... (e.g. editing postgres)
                  setOpen(false)
                  connectProps.openConnect()
                }}>
                <Link2 className="mr-2 h-4 w-4" />
                <span>{connectProps.label}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => syncResourceMutate()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Sync</span>
              </DropdownMenuItem>
              {/* Rename */}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => deleteResource.mutate({id: props.resource.id})}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </WithProviderConnect>
  )
}
