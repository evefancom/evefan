'use client'

import {Loader2} from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import {zId, zRaw} from '@openint/cdk'
import {_trpcReact} from '@openint/engine-frontend'
import type {SchemaFormElement} from '@openint/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  LoadingText,
  SchemaForm,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useToast,
} from '@openint/ui'
import {z} from '@openint/util'
import {useCurrengOrg} from '@/components/viewer-context'
import {cn} from '@/lib-client/ui-utils'
import type {ConnectorConfig} from './ConnectorConfigPage'

// import {defConnectors } from '@openint/app-config/connectorss/connectorss.def'

export function ConnectorConfigSheet({
  connectorConfig: ccfg,
  connectorName,
}: {
  connectorConfig?: Omit<ConnectorConfig, 'connectorName'>
  connectorName: string
}) {
  const trpcUtils = _trpcReact.useContext()
  const catalogRes = _trpcReact.listConnectorMetas.useQuery()
  const connectorMeta = catalogRes.data?.[connectorName]

  const resourcesRes = _trpcReact.listResources.useQuery({
    connectorName: 'postgres',
  })

  const zResoId = resourcesRes.data?.length
    ? z.union(
        resourcesRes.data.map((r) =>
          z.literal(r.id).openapi({
            title: r.displayName ? `${r.displayName} <${r.id}>` : r.id,
          }),
        ) as [z.ZodLiteral<string>, z.ZodLiteral<string>],
      )
    : zId('reso')

  const ccfgSchema = (
    connectorMeta?.schemas.connectorConfig
      ? // Sometimes we have extra data inside the config due to extra data, so workaround for now

        // as we have no way of displaying such information / allow user to fix it
        {...connectorMeta?.schemas.connectorConfig, additionalProperties: true}
      : undefined
  ) as {type: 'object'; properties?: {}; additionalProperties: boolean}

  // Consider calling this provider, actually seem to make more sense...
  // given that we call the code itself connector config
  const formSchema = zRaw.connector_config
    .pick({displayName: true, disabled: true})
    .extend({
      config: z.object({}),
      ...(connectorMeta?.supportedModes.includes('source') && {
        defaultPipeOut: z
          .union([
            z.null().openapi({title: 'Disabled'}),
            z
              .object({
                ...(connectorMeta?.sourceStreams?.length && {
                  streams: z
                    .object(
                      Object.fromEntries(
                        (connectorMeta.sourceStreams as [string]).map((s) => [
                          s,
                          z.boolean(),
                        ]),
                      ),
                      // z.enum(connectorMeta.sourceStreams as [string]),
                      // z.boolean(),
                    )
                    .passthrough()
                    .openapi({description: 'Entities to sync'}),
                }),
                links: zRaw.connector_config.shape.defaultPipeOut
                  .unwrap()
                  .unwrap().shape.links,
                destination_id: zResoId.optional().openapi({
                  description: 'Defaults to the org-wide postgres',
                }),
              })
              .openapi({title: 'Enabled'}),
          ])
          .openapi({
            title: 'Sync settings',
            description: zRaw.connector_config.shape.defaultPipeOut.description,
          }),
      }),
      ...(connectorMeta?.supportedModes.includes('destination') && {
        defaultPipeIn: z
          .union([
            z.null().openapi({title: 'Disabled'}),
            z
              .object({
                links: zRaw.connector_config.shape.defaultPipeIn
                  .unwrap()
                  .unwrap().shape.links,
                source_id: zResoId,
              })
              .openapi({title: 'Enabled'}),
          ])
          .openapi({
            title: 'Reverse sync settings',
            description: zRaw.connector_config.shape.defaultPipeIn.description,
          }),
      }),
    })
  connectorMeta?.__typename

  const {orgId} = useCurrengOrg()

  const [open, setOpen] = React.useState(false)
  const verb = ccfg ? 'Edit' : 'Add'
  const {toast} = useToast()

  const upsertConnectorConfig =
    _trpcReact.adminUpsertConnectorConfig.useMutation({
      onSuccess: () => {
        setOpen(false)
        toast({title: 'connector config saved', variant: 'success'})
        void trpcUtils.adminListConnectorConfigs.invalidate()
        void trpcUtils.listConnectorConfigInfos.invalidate()
      },
      onError: (err) => {
        toast({
          title: 'Failed to save connector config',
          description: `${err}`,
          variant: 'destructive',
        })
      },
    })
  const deleteConnectorConfig =
    _trpcReact.adminDeleteConnectorConfig.useMutation({
      onSuccess: () => {
        setOpen(false)
        toast({title: 'connector config deleted', variant: 'success'})
        void trpcUtils.adminListConnectorConfigs.invalidate()
        void trpcUtils.listConnectorConfigInfos.invalidate()
      },
      onError: (err) => {
        toast({
          title: 'Failed to create connector config saved',
          description: `${err}`,
          variant: 'destructive',
        })
      },
    })
  const mutating =
    deleteConnectorConfig.isLoading || upsertConnectorConfig.isLoading

  const formRef = React.useRef<SchemaFormElement>(null)

  if (!connectorMeta) {
    return <LoadingText className="block p-4" />
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="mt-2" variant="ghost">
          {verb}
        </Button>
      </SheetTrigger>
      <SheetContent
        position="right"
        size="lg"
        className="flex flex-col bg-background">
        <SheetHeader className="shrink-0">
          <SheetTitle>
            {verb} {connectorMeta.displayName} connector config
          </SheetTitle>

          <div className="flex max-h-[100px] flex-row items-center justify-between">
            {connectorMeta.logoUrl ? (
              <Image
                width={100}
                height={100}
                src={connectorMeta.logoUrl}
                alt={connectorMeta.displayName}
              />
            ) : (
              <span>{connectorMeta.displayName}</span>
            )}
            <Badge
              variant="secondary"
              className={cn(
                'ml-auto',
                connectorMeta.stage === 'ga' && 'bg-green-200',
                connectorMeta.stage === 'beta' && 'bg-blue-200',
                connectorMeta.stage === 'alpha' && 'bg-pink-50',
              )}>
              {connectorMeta.stage}
            </Badge>
            {/* Add help text here */}
          </div>

          <SheetDescription>
            {ccfg && `ID: ${ccfg.id}`}
            <br />
            Supported mode(s): {connectorMeta.supportedModes.join(', ')}
          </SheetDescription>
        </SheetHeader>
        <Separator orientation="horizontal" />
        <div className="grow overflow-scroll">
          <SchemaForm
            ref={formRef}
            schema={formSchema}
            jsonSchemaTransform={(schema) => ({
              ...schema,
              properties: {
                ...schema.properties,
                ...(ccfgSchema && {config: ccfgSchema}),
              },
            })}
            formData={
              ccfg
                ? {
                    displayName: ccfg.displayName,
                    disabled: ccfg.disabled,
                    config: ccfg.config ?? {},
                    defaultPipeOut: ccfg.defaultPipeOut ?? null,
                    defaultPipeIn: ccfg.defaultPipeIn ?? null,
                  } // {} because required
                : undefined
            }
            // formData should be non-null at this point, we should fix the typing
            loading={upsertConnectorConfig.isLoading}
            onSubmit={({formData}) => {
              console.log('formData submitted', formData)
              upsertConnectorConfig.mutate({
                ...formData,
                ...(ccfg ? {id: ccfg.id} : {connectorName}),
                orgId,
              })
            }}
            hideSubmitButton
          />
          {!ccfgSchema && <p>No configuration needed</p>}
        </div>
        <Separator orientation="horizontal" />
        <SheetFooter className="shrink-0">
          {ccfg && (
            <AlertDialog>
              <AlertDialogTrigger className="mr-auto">
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Confirm delete {connectorMeta.displayName} connector config?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ID: {ccfg.id}
                    <br />
                    This action cannot be undone. In order to to delete an
                    connector config, you may need to first delete all the
                    resources that depend on this connector config first
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      disabled={mutating}
                      className="mr-auto"
                      // Specifying asChild and using this variant does not appear to be
                      // working for some reason...
                      variant="destructive"
                      onClick={() =>
                        deleteConnectorConfig.mutate({id: ccfg.id})
                      }>
                      {deleteConnectorConfig.isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            disabled={mutating}
            type="submit"
            onClick={() => formRef.current?.submit()}>
            {upsertConnectorConfig.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {ccfg ? 'Save' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
