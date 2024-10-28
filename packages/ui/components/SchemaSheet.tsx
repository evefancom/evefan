'use client'

import type {UseMutationResult} from '@tanstack/react-query'
import {Loader2} from 'lucide-react'
import React from 'react'
import type {z} from '@openint/util'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useToast,
} from '../shadcn'
import type {ButtonProps} from '../shadcn'
import type {SchemaFormElement, SchemaFormProps} from './SchemaForm'
import {SchemaForm} from './SchemaForm'

export interface SchemaSheetRefValue {
  open: boolean
  setOpen: (open: boolean) => void
}

export type SchemaSheetRef = React.ForwardedRef<SchemaSheetRefValue | null>

/** Maybe should be called mutationSheet? */
export const SchemaSheet = React.forwardRef(function SchemaSheet<
  T extends z.ZodTypeAny,
>(
  {
    schema,
    mutation,
    initialValues,
    title,
    formProps,
    triggerButton = true,
    buttonProps,
    children,
  }: {
    formProps?: Omit<SchemaFormProps<T>, 'onSubmit' | 'schema' | 'formData'>
    schema: T
    initialValues?: Partial<z.infer<T>>
    // TODO: Fix the typing here. Schema needs to conform to mutation typing, but
    // mutation does not need to conform to schema typing here...
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutation: UseMutationResult<any, any, z.infer<T>, any>

    title?: string
    // Trigger button
    triggerButton?: boolean
    buttonProps?: ButtonProps
    children?: React.ReactNode
  },
  ref: SchemaSheetRef,
) {
  const [open, setOpen] = React.useState(false)

  React.useImperativeHandle(ref, () => ({
    open,
    // Need to wrap with setTimeout otherwise body cursor:pointer will be
    // incorectly toggled when opening sheet from say a dropdown menu
    setOpen: (newOpen) =>
      setTimeout(() => {
        setOpen(newOpen)
      }, 0),
  }))

  const {toast} = useToast()

  const formRef = React.useRef<SchemaFormElement>(null)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {triggerButton && (
        <SheetTrigger asChild>
          <Button variant="default" {...buttonProps}>
            {mutation.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {title ?? 'Open'}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        position="right"
        size="xl"
        className="flex flex-col bg-background">
        {children ?? (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription></SheetDescription>
          </SheetHeader>
        )}
        <SchemaForm
          className="overflow-scroll"
          {...formProps}
          ref={formRef}
          schema={schema}
          formData={initialValues}
          onSubmit={({formData}) => {
            console.log('formData', formData)
            mutation.mutate(formData, {
              onSuccess: () => {
                setOpen(false)
                toast({title: 'Success', variant: 'success'})
              },
              onError: (err) => {
                toast({
                  title: 'Failed to save',
                  description: `${err.message}`,
                  variant: 'destructive',
                })
              },
            })
          }}
          hideSubmitButton
        />
        <SheetFooter>
          <Button
            disabled={mutation.isLoading}
            type="submit"
            onClick={() => formRef.current?.submit()}>
            {mutation.isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
})
