import type * as jsforce from 'jsforce'
import {BadRequestError} from '@openint/vdk'
import type {CRMAdapter} from '../../../router'
import {SALESFORCE_API_VERSION} from '../constants'
import {
  toSalesforceCustomObjectCreateParams,
  validateCustomObject,
} from './mappers'

async function getCurrentUserId(sfdc: jsforce.Connection) {
  return sfdc.userInfo?.id ?? sfdc.identity().then((r) => r.user_id)
}

async function updateFieldPermissions(
  sfdc: jsforce.Connection,
  objectName: string,
  nonPrimaryFields: string[],
): Promise<void> {
  // After custom fields are created, they're not automatically visible. We need to
  // set the field-level security to Visible for profiles.
  // Instead of updating all profiles, we'll just update it for the profile for the user
  // in this connection.
  //
  // We're doing this all the time, even if there were no detected added fields, since
  // the previous call to this endpoint could have failed after creating fields but before
  // adding permissions, and we want the second call to this endpoint to fix that.
  //
  // TODO: do we want to make it visible for all profiles?
  const userId = await getCurrentUserId(sfdc)

  // Get the user record
  const user = await sfdc.retrieve('User', userId, {
    fields: ['ProfileId'],
  })

  // Get the Id for the standard user profile
  const [standardUserId] = (
    await sfdc.query("SELECT Id FROM Profile WHERE Name = 'Standard User'")
  ).records.map((record) => record.Id)

  const profileIdsToGrantPermissionsTo = [user['ProfileId'], standardUserId]

  // Get the permission set ids
  const permissionSetIds = (
    await sfdc.query(
      `SELECT Id FROM PermissionSet WHERE ProfileId IN ('${profileIdsToGrantPermissionsTo.join(
        "','",
      )}')`,
    )
  ).records.map((record) => record.Id)

  // Figure out which fields already have permissions
  // TODO: Paginate
  const {records: existingFieldPermissions} = await sfdc.query(
    `SELECT Field FROM FieldPermissions WHERE SobjectType='${objectName}' AND ParentId IN ('${permissionSetIds.join(
      "','",
    )}')`,
  )
  const existingFieldPermissionFieldNames = existingFieldPermissions.map(
    (fieldPermission) => fieldPermission['Field'],
  )
  const fieldsToAddPermissionsFor = nonPrimaryFields.filter(
    (field) =>
      !existingFieldPermissionFieldNames.includes(`${objectName}.${field}`),
  )

  const {compositeResponse} = await sfdc.requestPost<{
    compositeResponse: Array<{httpStatusCode: number}>
  }>(`/services/data/v${SALESFORCE_API_VERSION}/composite`, {
    // We're doing this for all fields, not just the added ones, in case the previous
    // call to this endpoint succeeded creating additional fields but failed to
    // add permissions for them.
    compositeRequest: fieldsToAddPermissionsFor.flatMap((field) =>
      permissionSetIds.map((permissionSetId) => ({
        referenceId: `${field}_${permissionSetId}`,
        method: 'POST',
        url: `/services/data/v${SALESFORCE_API_VERSION}/sobjects/FieldPermissions/`,
        body: {
          ParentId: permissionSetId,
          SobjectType: objectName,
          Field: `${objectName}.${field}`,
          PermissionsEdit: true,
          PermissionsRead: true,
        },
      })),
    ),
  })
  // if not 2xx
  if (
    compositeResponse.some(
      (response) =>
        response.httpStatusCode < 200 || response.httpStatusCode >= 300,
    )
  ) {
    throw new Error(
      `Failed to add field permissions: ${JSON.stringify(
        compositeResponse,
        null,
        2,
      )}`,
    )
  }
}

/**
 * Some salesforce APIs (e.g. metadata API) are SOAP based which is not currently supported in
 * openSDKs so we use the jsforce lib instead.
 */
export const salesforceAdapterJsForce = {
  metadataCreateObject: async ({instance: sfdc, input: params}) => {
    validateCustomObject(params)

    const objectName = params.name.endsWith('__c')
      ? params.name
      : `${params.name}__c`
    const readResponse = await sfdc.metadata.read('CustomObject', objectName)
    if (readResponse.fullName) {
      throw new BadRequestError(
        `Custom object with name ${objectName} already exists`,
      )
    }

    const primaryField = params.fields.find(
      (field) => field.id === params.primary_field_id,
    )
    if (!primaryField) {
      throw new BadRequestError(
        `Primary field ${params.primary_field_id} not found`,
      )
    }
    const nonPrimaryFields = params.fields.filter(
      (field) => field.id !== params.primary_field_id,
    )
    const result = await sfdc.metadata.create(
      'CustomObject',
      toSalesforceCustomObjectCreateParams(
        objectName,
        params.labels,
        params.description,
        primaryField,
        nonPrimaryFields,
      ),
    )

    const nonRequiredFields = nonPrimaryFields.filter(
      (field) => !field.is_required,
    )

    await updateFieldPermissions(
      sfdc,
      objectName,
      nonRequiredFields.map((field) => field.id),
    )

    if (result.success) {
      throw new Error(
        `Failed to create custom object. Since creating a custom object with custom fields is not an atomic operation in Salesforce, you should use the custom object name ${
          params.name
        } as the 'id' parameter in the Custom Object GET endpoint to check if it was already partially created. If so, use the PUT endpoint to update the existing object. Raw error message from Salesforce: ${JSON.stringify(
          result,
          null,
          2,
        )}`,
      )
    }
    return {id: objectName, name: objectName}
  },
  metadataCreateAssociation: async ({
    instance: sfdc,
    input: {
      source_object: sourceObject,
      target_object: targetObject,
      suggested_key_name: keyName,
      display_name: label,
    },
  }) => {
    // if id doesn't end with __c, we need to add it ourselves
    if (!keyName.endsWith('__c')) {
      keyName = `${keyName}__c`
    }

    // Look up source custom object to figure out a relationship name
    // TODO: we should find a better way to do this
    const sourceCustomObjectMetadata = await sfdc.metadata.read(
      'CustomObject',
      sourceObject,
    )

    // If the relationship field doesn't already exist, create it
    const existingField = sourceCustomObjectMetadata.fields?.find(
      (field) => field.fullName === keyName,
    )

    const customFieldPayload = {
      fullName: `${sourceObject}.${keyName}`,
      label,
      // The custom field name you provided Related Opportunity on object Opportunity can
      // only contain alphanumeric characters, must begin with a letter, cannot end
      // with an underscore or contain two consecutive underscore characters, and
      // must be unique across all Opportunity fields
      // TODO: allow developer to specify name?
      relationshipName:
        sourceCustomObjectMetadata.pluralLabel?.replace(/\s/g, '') ??
        'relationshipName',
      type: 'Lookup',
      required: false,
      referenceTo: targetObject,
    }

    if (existingField) {
      const result = await sfdc.metadata.update(
        'CustomField',
        customFieldPayload,
      )

      if (!result.success) {
        throw new Error(
          `Failed to update custom field for association type: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
        )
      }
    } else {
      const result = await sfdc.metadata.create(
        'CustomField',
        customFieldPayload,
      )

      if (!result.success) {
        throw new Error(
          `Failed to create custom field for association type: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
        )
      }
    }

    const userId = await getCurrentUserId(sfdc)

    // Get the user record
    const user = await sfdc.retrieve('User', userId, {
      fields: ['ProfileId'],
    })

    // Get the first permission set
    // TODO: Is this the right thing to do? How do we know the first one is the best one?
    const result = await sfdc.query(
      `SELECT Id FROM PermissionSet WHERE ProfileId='${user['ProfileId']}' LIMIT 1`,
    )
    if (!result.records.length) {
      throw new Error(
        `Could not find permission set for profile ${user['ProfileId']}`,
      )
    }

    const permissionSetId = result.records[0]?.Id

    // Figure out which fields already have permissions
    const {records: existingFieldPermissions} = await sfdc.query(
      `SELECT Id,Field FROM FieldPermissions WHERE SobjectType='${sourceObject}' AND ParentId='${permissionSetId}' AND Field='${sourceObject}.${keyName}'`,
    )
    if (existingFieldPermissions.length) {
      // Update permission
      const existingFieldPermission = existingFieldPermissions[0]
      const result = await sfdc.update('FieldPermissions', {
        Id: existingFieldPermission!.Id!,
        ParentId: permissionSetId,
        SobjectType: sourceObject,
        Field: `${sourceObject}.${keyName}`,
        PermissionsEdit: true,
        PermissionsRead: true,
      })
      if (!result.success) {
        throw new Error(
          `Failed to update field permission for association type: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
        )
      }
    } else {
      // Create permission
      const result = await sfdc.create('FieldPermissions', {
        ParentId: permissionSetId,
        SobjectType: sourceObject,
        Field: `${sourceObject}.${keyName}`,
        PermissionsEdit: true,
        PermissionsRead: true,
      })
      if (!result.success) {
        throw new Error(
          `Failed to create field permission for association type: ${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
        )
      }
    }
    return {
      association_schema: {
        id: `${sourceObject}.${keyName}`,
        source_object: sourceObject,
        target_object: targetObject,
        display_name: label,
      },
    }
  },
} satisfies CRMAdapter<jsforce.Connection>
