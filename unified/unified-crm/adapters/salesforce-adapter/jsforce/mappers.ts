import type {CustomField as SalesforceCustomField} from 'jsforce/lib/api/metadata/schema'
import type {z} from '@openint/vdk'
import {BadRequestError} from '@openint/vdk'
import type {CRMAdapter, unified} from '../../../router'

type RouteInput<T extends keyof CRMAdapter<unknown>> = Parameters<
  NonNullable<CRMAdapter<unknown>[T]>
>[0]['input']

type PropertyUnified = z.infer<(typeof unified)['meta_custom_object_field']>

interface ToolingAPIValueSet {
  restricted: boolean
  valueSetDefinition: {
    sorted: boolean
    value: Array<{label: string; valueName: string; description: string}>
  }
}
interface ToolingAPICustomField {
  FullName: string
  Metadata: (
    | {
        type: 'DateTime' | 'Url' | 'Checkbox' | 'Date'
      }
    | {
        type: 'Text' | 'TextArea'
        length: number
      }
    | {
        type: 'Number'
        precision: number
        scale: number
      }
    | {
        type: 'MultiselectPicklist'
        valueSet: ToolingAPIValueSet
        visibleLines: number
      }
    | {
        type: 'Picklist'
        valueSet: ToolingAPIValueSet
      }
  ) & {
    required: boolean
    label: string
    description?: string
    defaultValue: string | null
  }
}

function capitalizeFirstChar(str: string): string {
  if (!str) {
    return str
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// TODO: Figure out what to do with id and reference types
export const toSalesforceType = (
  property: PropertyUnified,
): ToolingAPICustomField['Metadata']['type'] => {
  switch (property.type) {
    case 'number':
      return 'Number'
    case 'text':
      return 'Text'
    case 'textarea':
      return 'TextArea'
    case 'boolean':
      return 'Checkbox'
    case 'picklist':
      return 'Picklist'
    case 'multipicklist':
      return 'MultiselectPicklist'
    case 'date':
      return 'Date'
    case 'datetime':
      return 'DateTime'
    case 'url':
      return 'Url'
    default:
      return 'Text'
  }
}

export function validateCustomObject(
  params: RouteInput<'metadataCreateObject'>,
): void {
  if (!params.fields.length) {
    throw new BadRequestError('Cannot create custom object with no fields')
  }

  const primaryField = params.fields.find(
    (field) => field.id === params.primary_field_id,
  )

  if (!primaryField) {
    throw new BadRequestError(
      `Could not find primary field with key name ${params.primary_field_id}`,
    )
  }

  if (primaryField.type !== 'text') {
    throw new BadRequestError(
      `Primary field must be of type text, but was ${primaryField.type} with key name ${params.primary_field_id}`,
    )
  }

  if (!primaryField.is_required) {
    throw new BadRequestError(
      `Primary field must be required, but was not with key name ${params.primary_field_id}`,
    )
  }

  if (capitalizeFirstChar(primaryField.id) !== 'Name') {
    throw new BadRequestError(
      `Primary field for salesforce must have key name 'Name', but was ${primaryField.id}`,
    )
  }

  const nonPrimaryFields = params.fields.filter(
    (field) => field.id !== params.primary_field_id,
  )

  if (nonPrimaryFields.some((field) => !field.id.endsWith('__c'))) {
    throw new BadRequestError('Custom object field key names must end with __c')
  }

  if (
    nonPrimaryFields.some(
      (field) => field.type === 'boolean' && field.is_required,
    )
  ) {
    throw new BadRequestError('Boolean fields cannot be required in Salesforce')
  }
}

export const toSalesforceCustomFieldCreateParams = (
  objectName: string,
  property: PropertyUnified,
  prefixed = false,
): Partial<SalesforceCustomField> => {
  const base: Partial<SalesforceCustomField> = {
    // When calling the CustomObjects API, it does not need to be prefixed.
    // However, when calling the CustomFields API, it needs to be prefixed.
    fullName: prefixed ? `${objectName}.${property.id}` : property.id,
    label: property.label,
    type: toSalesforceType(property),
    required: property.is_required,
    defaultValue: property.default_value?.toString() ?? null,
  }
  // if (property.defaultValue) {
  //   base = { ...base, defaultValue: property.defaultValue.toString() };
  // }
  if (property.type === 'text') {
    return {
      ...base,
      // TODO: Maybe textarea should be longer
      length: 255,
    }
  }
  if (property.type === 'number') {
    return {
      ...base,
      scale: property.scale,
      precision: property.precision,
    }
  }
  if (property.type === 'boolean') {
    return {
      ...base,
      // Salesforce does not support the concept of required boolean fields
      required: false,
      // JS Force (incorrectly) expects string here
      // This is required for boolean fields
      defaultValue: property.default_value?.toString() ?? 'false',
    }
  }
  // TODO: Support picklist options
  return base
}

export const toSalesforceCustomObjectCreateParams = (
  objectName: string,
  labels: {
    singular: string
    plural: string
  },
  description: string | null,
  primaryField: PropertyUnified,
  nonPrimaryFieldsToUpdate: PropertyUnified[],
) => ({
  deploymentStatus: 'Deployed',
  sharingModel: 'ReadWrite',
  fullName: objectName,
  description,
  label: labels.singular,
  pluralLabel: labels.plural,
  nameField: {
    label: primaryField?.label,
    type: 'Text',
  },
  fields: nonPrimaryFieldsToUpdate.map((field) =>
    toSalesforceCustomFieldCreateParams(objectName, field),
  ),
})
