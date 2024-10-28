'use client'

import Image from 'next/image'
import React from 'react'
import {extractConnectorName, zRaw} from '@openint/cdk'
import {_trpcReact} from '@openint/engine-frontend'
import type {SchemaSheetRef} from '@openint/ui'
import {Badge, cn, SchemaSheet, SheetDescription} from '@openint/ui'
import type {ZClient} from '@/lib-common/schemas'

const formSchema = zRaw.resource.pick({
  id: true,
  endUserId: true,
  settings: true,
  disabled: true,
  displayName: true,
  //
  connectorConfigId: true,
  integrationId: true,
})

/** TODO: See if we can eliminate the need having entity specific sheets */
export const ResourceSheet = React.forwardRef(function ResourceSheet(
  props: {resource?: ZClient['resource']; triggerButton?: boolean},
  ref: SchemaSheetRef,
) {
  const catalogRes = _trpcReact.listConnectorMetas.useQuery()

  const updateResource = _trpcReact.updateResource.useMutation()

  const connector =
    props.resource && catalogRes.data?.[extractConnectorName(props.resource.id)]
  if (!connector) {
    return null
  }

  return (
    <SchemaSheet
      ref={ref}
      triggerButton={props.triggerButton}
      title={props.resource ? 'Edit' : 'New Resource'}
      buttonProps={{variant: props.resource ? 'ghost' : 'default'}}
      formProps={{
        uiSchema: {
          id: {'ui:readonly': true},
          connectorConfigId: {'ui:readonly': true},
          integrationId: {'ui:readonly': true},
        },
      }}
      schema={formSchema}
      mutation={updateResource}
      initialValues={props.resource}>
      <div className="flex max-h-[100px] flex-row items-center justify-between">
        {connector.logoUrl ? (
          <Image
            width={100}
            height={100}
            src={connector.logoUrl}
            alt={connector.displayName}
          />
        ) : (
          <span>{connector.displayName}</span>
        )}
        <Badge
          variant="secondary"
          className={cn(
            'ml-auto',
            connector.stage === 'ga' && 'bg-green-200',
            connector.stage === 'beta' && 'bg-blue-200',
            connector.stage === 'alpha' && 'bg-pink-50',
          )}>
          {connector.stage}
        </Badge>
        {/* Add help text here */}
      </div>

      <SheetDescription>
        {props.resource && `ID: ${props.resource.id}`}
        <br />
        Supported mode(s): {connector.supportedModes.join(', ')}
      </SheetDescription>
    </SchemaSheet>
  )
})
