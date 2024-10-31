'use client'

import NangoFrontend from '@nangohq/frontend'
import {useMutation} from '@tanstack/react-query'
import {InfoIcon, Loader2} from 'lucide-react'
import React from 'react'
import type {Id} from '@openint/cdk'
import {CANCELLATION_TOKEN, extractId, oauthConnect} from '@openint/cdk'
import type {RouterInput, RouterOutput} from '@openint/engine-backend'
import type {SchemaFormElement} from '@openint/ui'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SchemaForm,
  useToast,
} from '@openint/ui'
import {z} from '@openint/util'
import {
  useOpenIntConnectContext,
  useOptionalOpenIntConnectContext,
} from '../providers/OpenIntConnectProvider'
import {_trpcReact} from '../providers/TRPCProvider'

export type ConnectEventType = 'open' | 'close' | 'error'

type Resource = RouterOutput['listConnections'][number]

type Catalog = RouterOutput['listConnectorMetas']

type ConnectorMeta = Catalog[string]

const __DEBUG__ = Boolean(
  typeof window !== 'undefined' && window.location.hostname === 'localhost',
)

export const WithConnectorConnect = ({
  connectorConfig: ccfg,
  integration,
  resource,
  onEvent,
  children,
}: {
  connectorConfig: {id: Id['ccfg']; connector: ConnectorMeta}
  integration?: {
    id: Id['int']
  }
  resource?: Resource
  onEvent?: (event: {type: ConnectEventType}) => void
  children: (props: {
    openConnect: () => void
    label: string
    variant: 'default' | 'ghost'
    loading: boolean
  }) => React.ReactNode
}) => {
  // console.log('WithConnectorConnect', int.id, int.connector)
  const {clientConnectors} = useOpenIntConnectContext()
  // TODO: Restore connectFnMap so that we respect the rules of hooks to always render all hooks
  // and not skip rendering or conditionally rendering hooks

  const useConnectHook = clientConnectors[ccfg.connector.name]?.useConnectHook
  const nangoProvider = ccfg.connector.nangoProvider

  const nangoPublicKey =
    _trpcReact.getPublicEnv.useQuery().data?.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  const nangoFrontend = React.useMemo(
    () =>
      nangoPublicKey &&
      new NangoFrontend({publicKey: nangoPublicKey, debug: __DEBUG__}),
    [nangoPublicKey],
  )

  const connectFn =
    useConnectHook?.({
      // TODO: Implement me
      openDialog: () => {},
    }) ??
    (nangoProvider
      ? (connInput, {connectorConfigId}) => {
          if (!nangoFrontend) {
            throw new Error('Missing nango public key')
          }
          return oauthConnect({
            connectorConfigId,
            nangoFrontend,
            connectorName: ccfg.connector.name,
            resourceId: resource?.id,
            authOptions: connInput,
          })
        }
      : undefined)

  const resourceExternalId = resource ? extractId(resource.id)[2] : undefined
  const integrationExternalId = integration
    ? extractId(integration.id)[2]
    : undefined

  // TODO: Handle preConnectInput schema and such... for example for Plaid
  const preConnect = _trpcReact.preConnect.useQuery(
    [ccfg.id, {resourceExternalId, integrationExternalId}, {}],
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
            title: `Successfully connected to ${ccfg.connector.displayName}`,
            // description: `${msg}`,
            variant: 'success',
          })
        }
        setOpen(false)
        onEvent?.({type: 'close'})
      },
      onError: (err) => {
        if (err === CANCELLATION_TOKEN) {
          return
        }
        console.log(ccfg.connector.displayName + ' connection error:', err)
        toast({
          title: `Failed to connect to ${ccfg.connector.displayName}`,
          // description: `${err}`,
          variant: 'destructive',
        })
        onEvent?.({type: 'error'})
      },
    },
  )

  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<SchemaFormElement>(null)

  // console.log('ccfg', int.id, 'open', open)
  const {debug} = useOptionalOpenIntConnectContext()

  // TODO: Refactor Dialog logic to introduce `UserInputDialog` that lets you ask user needed
  // information by providing a schema and asynchronously return result via a Promise
  // such a dialog should be globally mounted and not be part of the current component tree
  // to avoid issue of being dismissed unintentionally when component is unmounted
  return (
    // non modal dialog do not add pointer events none to the body
    // which workaround issue with multiple portals (dropdown, dialog) conflicting
    // as well as other modals introduced by things like Plaid
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {children({
        // Children is responsible for rendering dialog triggers as needed
        openConnect: () => {
          onEvent?.({type: 'open'})
          // noop, allow the dialog to open instead via Trigger?
          if (!connectFn) {
            // The whole dialog trigger thing is a bit funky to work with
            // it requires the children to know whether a dialog would pop up or not
            // and a hard api to work with. We sacrifice some accessiblity by
            // using explicit callback rather than DialogTrigger component
            setOpen(true)
            return
          }
          connect.mutate(undefined)
        },
        loading: connect.isLoading,
        variant: resource?.status === 'disconnected' ? 'default' : 'ghost',
        label: resource ? 'Reconnect' : 'Connect',
      })}

      <DialogContent className="max-h-[600px] overflow-visible">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center">
              <span className="mr-2">
                Connect to {ccfg.connector.displayName}
              </span>
              {ccfg.connector.name === 'greenhouse' && (
                <div className="group relative inline-block">
                  <InfoIcon className="h-5 w-5 cursor-help text-gray-500" />
                  <div className="invisible absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-md bg-[#272731] p-2 text-sm text-white opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                    <div className="absolute bottom-[-8px] left-0 h-2 w-full" />
                    <p className="italic">
                      Generate a custom API key with{' '}
                      <a
                        href="https://support.greenhouse.io/hc/en-us/articles/202842799-Create-an-API-key-in-Greenhouse-Recruiting"
                        className="font-bold underline"
                        target="_blank"
                        rel="noopener noreferrer">
                        these instructions
                      </a>{' '}
                      and include all Harvest V3 permissions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </DialogTitle>
          {debug && (
            <DialogDescription>
              Using connector config ID: {ccfg.id}
            </DialogDescription>
          )}
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
            className="bg-[#8192FF] hover:bg-[#6774CC]"
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
