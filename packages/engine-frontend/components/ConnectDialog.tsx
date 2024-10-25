'use client'

import React from 'react'
import type {Vertical} from '@openint/cdk'
import {VERTICAL_BY_KEY} from '@openint/cdk'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@openint/ui'
import type {
  ConnectorConfig,
  ConnectorConfigFilters,
} from '../hocs/WithConnectConfig'
import {WithConnectConfig} from '../hocs/WithConnectConfig'
import {IntegrationSearch} from './IntegrationSearch'

interface ConnectDialogCommonProps {
  className?: string
  children?: React.ReactNode
}

// TODO: Refactor WithOpenConnect out of ConnectButton
// such that users can render their own trigger fully
export function ConnectDialog({
  connectorNames = [],
  connectorConfigFilters,
  open: controlledOpen,
  setOpen: controlledSetOpen,
  onEvent,
  ...commonProps
}: {
  connectorConfigFilters: ConnectorConfigFilters
  connectorNames?: string[]
  open?: boolean
  setOpen?: (open: boolean) => void
  onEvent?: (event: any) => void
} & ConnectDialogCommonProps) {
  const {verticalKey: categoryKey} = connectorConfigFilters
  return (
    <WithConnectConfig {...connectorConfigFilters}>
      {({ccfgs}) => {
        const filteredCcfgs = ccfgs.filter(
          (c) => !connectorNames.includes(c.connectorName),
        )
        const [first, ...rest] = filteredCcfgs
        if (!first) {
          return (
            <Dialog open={true} onOpenChange={() => {}}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>No Integrations Available</DialogTitle>
                  <DialogDescription>
                    You have no further integrations available. If you believe this is an error, please contact support.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button onClick={() => {}}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
        const category = categoryKey ? VERTICAL_BY_KEY[categoryKey] : undefined
        return (
          <MultipleConnectButton
            {...commonProps}
            connectorConfigs={rest.length === 0 ? [first] : ccfgs}
            category={category}
            open={controlledOpen}
            setOpen={controlledSetOpen}
            onEvent={onEvent}
          />
        )
      }}
    </WithConnectConfig>
  )
}

function MultipleConnectButton({
  children,
  className,
  connectorConfigs,
  open: controlledOpen,
  setOpen: controlledSetOpen,
  onEvent,
}: {
  connectorConfigs: ConnectorConfig[]
  category?: Vertical
  open?: boolean
  setOpen?: (open: boolean) => void
  onEvent?: (event: any) => void
} & ConnectDialogCommonProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)

  // Determine if the component is controlled or uncontrolled
  const isControlled = controlledOpen !== undefined && controlledSetOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledSetOpen : setInternalOpen

  // Unconditional render to avoid delay when dialog is opened
  const content = (
    <IntegrationSearch
      connectorConfigs={connectorConfigs}
      onEvent={(e) => {
        if (onEvent) onEvent(e);
        if (e.type === 'close' || e.type === 'error') {
          setOpen(false)
        }
      }}
    />
  )

  return (
    // non modal dialog do not add pointer events none to the body
    // which workaround issue with multiple portals (dropdown, dialog) conflicting
    // as well as other modals introduced by things like Plaid
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        {!isControlled && (
          <Button className={className} variant="default">
            {children ?? 'Connect'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-screen flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>New connection</DialogTitle>
          <DialogDescription>
            Select an integration to start
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter className="shrink-0">{/* Cancel here */}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
