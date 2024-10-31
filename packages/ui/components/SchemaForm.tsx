import type {default as Form, FormProps, ThemeProps} from '@rjsf/core'
import {withTheme} from '@rjsf/core'
import {type RJSFSchema, type UiSchema} from '@rjsf/utils'
import validator from '@rjsf/validator-ajv8'
import React from 'react'
import type {z} from '@openint/util'
import {zodToJsonSchema} from '@openint/util'
import {cn} from '../utils'

const theme: ThemeProps = {widgets: {}}

/** TODO: Actually customize with our own components... */
export const JsonSchemaForm = withTheme(theme) as typeof Form

/** For use with createRef... */
export type SchemaFormElement = Form

export type SchemaFormProps<TSchema extends z.ZodTypeAny> = Omit<
  FormProps<z.infer<TSchema>>,
  'schema' | 'validator' | 'onSubmit'
> & {
  schema: TSchema
  jsonSchemaTransform?: (schema: RJSFSchema) => RJSFSchema
  hideSubmitButton?: boolean
  onSubmit?: (data: {formData: z.infer<TSchema>}) => void
  loading?: boolean
}

function titleCase(str: string) {
  const words = str.split(/(?=[A-Z])|_/)

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.toLowerCase().slice(1))
    .join(' ')
}

function isTypeObject(schema: RJSFSchema): boolean {
  return (
    schema.type === 'object' ||
    (Array.isArray(schema.type) && schema.type.includes('object'))
  )
}
// Add this function before the SchemaForm component
function generateUiSchema(jsonSchema: RJSFSchema): UiSchema {
  const uiSchema: UiSchema = {}

  if (isTypeObject(jsonSchema) && jsonSchema.properties) {
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      const friendlyLabel = titleCase(key)
      uiSchema[key] = {
        'ui:title': friendlyLabel,
        'ui:classNames': 'pt-2 mx-1',
      }

      if (typeof value === 'object' && isTypeObject(value)) {
        uiSchema[key] = {
          ...uiSchema[key],
          ...generateUiSchema(value as RJSFSchema),
        }
      }
    }
  }

  return uiSchema
}

// Consider renaming this to zodSchemaForm
export const SchemaForm = React.forwardRef(function SchemaForm<
  TSchema extends z.ZodTypeAny,
>(
  {
    schema,
    hideSubmitButton,
    jsonSchemaTransform,
    formData: _formData,
    onSubmit,
    loading,
    ...props
  }: SchemaFormProps<TSchema>,
  forwardedRef: React.ForwardedRef<Form<z.infer<TSchema>>>,
) {
  const _jsonSchema = zodToJsonSchema(schema) as RJSFSchema
  const jsonSchema = jsonSchemaTransform?.(_jsonSchema) ?? _jsonSchema
  // For debugging
  ;(globalThis as any).formSchema = schema
  ;(globalThis as any).formJsonSchema = jsonSchema

  // We cache the formState so that re-render does not cause immediate loss
  // though this may sometimes cause stale data? Need to think more about it.
  const [formData, setFormData] = React.useState<z.infer<TSchema>>(_formData)
  // console.log('[SchemaForm] jsonSchema', jsonSchema)
  const uiSchema = generateUiSchema(jsonSchema)

  return (
    <JsonSchemaForm<z.infer<TSchema>>
      disabled={loading}
      {...props}
      ref={forwardedRef}
      formData={formData}
      className={cn(
        'schema-form',
        loading && 'loading',
        props.className,
        'max-h-[450px] overflow-y-auto',
      )}
      schema={jsonSchema}
      validator={validator}
      uiSchema={{
        ...(hideSubmitButton && {'ui:submitButtonOptions': {norender: true}}),
        ...uiSchema,
        ...props.uiSchema,
      }}
      onSubmit={(data) => {
        if (!data.formData) {
          throw new Error('Invariant: formData is undefined')
        }
        setFormData(data.formData)
        onSubmit?.({formData: data.formData})
      }}
    />
  )
})

/**
 * New approach https://www.kripod.dev/blog/fixing-generics-in-react/
 * Original does not work no more https://fettblog.eu/typescript-react-generic-forward-refs/
 */
declare module 'react' {
  function forwardRef<T, P = NonNullable<unknown>>(
    render: (props: P, ref: ForwardedRef<T>) => ReturnType<FunctionComponent>,
  ): ((
    props: PropsWithoutRef<P> & RefAttributes<T>,
  ) => ReturnType<FunctionComponent>) & {
    displayName?: string
  }
}
