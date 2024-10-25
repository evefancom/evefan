import {useMutation} from '@tanstack/react-query'
import {Loader2} from 'lucide-react'
import {useRouter} from 'next/navigation'
import React from 'react'
import type {SchemaSheetRefValue} from '@openint/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  useWithToast,
} from '@openint/ui'
import {PipelineSheet} from '@/components/PipelineSheet'
import {ResourceSheet} from '@/components/ResourceSheet'
import type {ZClient} from '@/lib-common/schemas'
import {trpcReact} from '../lib-client/trpcReact'

interface AlertProps {
  title?: string
  description?: string
  /** When a mutation is occuring. Will disable all buttons */
  loading?: boolean
  /** Call attention to user that this is a destructive operation */
  destructive?: boolean
  confirmText?: string
  onConfirm?: () => unknown
}

export function useCommandContextValue() {
  const trpcCtx = trpcReact.useContext()
  const {withToast, toast} = useWithToast()
  const router = useRouter()

  const [pipelineSheetState, setPipelineSheetState] = React.useState({
    open: false,
    pipeline: undefined as undefined | ZClient['pipeline'],
  })
  const [resourceSheetState, setResourceSheetState] = React.useState({
    open: false,
    resource: undefined as undefined | ZClient['resource'],
  })
  const [alertDialogState, setAlertDialogState] =
    React.useState<AlertProps | null>(null)

  const alertMutation = useMutation({
    mutationFn: () =>
      withToast(() => alertDialogState?.onConfirm?.(), {
        showLoading: false, // No need as we have a loading indicator in AlertDialog
      }),
    onSuccess: () => setAlertDialogState(null),
  })

  return {
    trpcCtx,
    withToast,
    toast,
    router,
    pipelineSheetState,
    setPipelineSheetState,
    resourceSheetState,
    setResourceSheetState,
    alertDialogState,
    setAlertDialogState,
    alertMutation,
  }
}

export type CommandContext = ReturnType<typeof useCommandContextValue>

export function WithCommandContext(props: {
  children: (ctx: CommandContext) => React.ReactNode
}) {
  const _ctx = useCommandContextValue()
  const pipelineSheet = React.useRef<SchemaSheetRefValue>(null)
  const resourceSheet = React.useRef<SchemaSheetRefValue>(null)

  const ctx = React.useMemo(
    () =>
      ({
        ..._ctx,
        // Hack around not being able to pass open/setOpen to pipeline sheet yet
        setPipelineSheetState: (newState) => {
          if (typeof newState === 'object') {
            pipelineSheet.current?.setOpen(newState.open)
          }
          _ctx.setPipelineSheetState(newState)
        },
        setResourceSheetState: (newState) => {
          if (typeof newState === 'object') {
            resourceSheet.current?.setOpen(newState.open)
          }
          _ctx.setResourceSheetState(newState)
        },
      }) satisfies typeof _ctx,
    [_ctx],
  )

  return (
    <>
      {props.children(ctx)}
      <PipelineSheet
        ref={pipelineSheet}
        triggerButton={false}
        pipeline={ctx.pipelineSheetState.pipeline}
      />
      <ResourceSheet
        ref={resourceSheet}
        triggerButton={false}
        resource={ctx.resourceSheetState.resource}
      />
      {!!ctx.alertDialogState && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (open) {
              console.error('Unexpected onOpenChange=true for AlertDialog')
              return
            }
            if (ctx.alertMutation.isLoading) {
              console.log('Mutation loading, not closing AlertDialog')
              return
            }
            ctx.setAlertDialogState(null)
          }}>
          {/* No trigger because CmdItem will disappear upon showing AlertDialog */}
          <AlertDialogContent>
            <AlertDialogHeader>
              {ctx.alertDialogState.title && (
                <AlertDialogTitle>
                  {ctx.alertDialogState.title}
                </AlertDialogTitle>
              )}
              {ctx.alertDialogState.description && (
                <AlertDialogDescription>
                  {ctx.alertDialogState.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={ctx.alertMutation.isLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  disabled={ctx.alertMutation.isLoading}
                  className="mr-auto"
                  // Specifying asChild and using this variant does not appear to be
                  // working for some reason...
                  onClick={(e) => {
                    ctx.alertMutation.mutate()
                    // Prevent closing dialog until mutation finishes
                    e.preventDefault()
                  }}
                  variant={
                    ctx.alertDialogState.destructive ? 'destructive' : undefined
                  }>
                  {ctx.alertMutation.isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {ctx.alertDialogState.confirmText ?? 'Confirm'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
