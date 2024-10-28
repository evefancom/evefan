import type {ConnectorDef, ConnectorSchemas, Pta} from '@openint/cdk'
import {connHelpers, makePostingsMap} from '@openint/cdk'
import type {SerializedTimestamp} from '@openint/connector-firebase'
import type {Merge} from '@openint/util'
import {A, objectFromArray, R, z, zCast} from '@openint/util'
import type {_parseResourceInfo} from './foreceipt-utils'
import type {ForeceiptClientOptions} from './ForeceiptClient'
import {makeForeceiptClient, zForeceiptConfig} from './ForeceiptClient'

// type ForeceiptSyncOperation = typeof def['_opType']
export const foreceiptSchemas = {
  name: z.literal('foreceipt'),
  // connectorConfig: zForeceiptConfig,
  resourceSettings: z.object({
    credentials: zCast<Readonly<Foreceipt.Credentials>>(),
    options: zCast<ForeceiptClientOptions>(),
    _id: zCast<ExternalId>(),
    envName: z.enum(['staging', 'production']),
  }),
  connectInput: zForeceiptConfig,
  connectOutput: zForeceiptConfig,
  sourceOutputEntity: z.discriminatedUnion('entityName', [
    z.object({
      id: z.string(),
      entityName: z.literal('account'),
      entity: zCast<Foreceipt.Account>(),
      info: zCast<ReturnType<typeof _parseResourceInfo> | undefined>(),
    }),
    z.object({
      id: z.string(),
      entityName: z.literal('transaction'),
      entity: zCast<
        Merge<
          Foreceipt.Receipt,
          {
            create_time: SerializedTimestamp
            last_update_time: SerializedTimestamp
          }
        >
      >(),
      info: zCast<
        ({_id?: ExternalId} & ReturnType<typeof _parseResourceInfo>) | undefined
      >(),
    }),
  ]),
} satisfies ConnectorSchemas

export const foreceiptHelpers = connHelpers(foreceiptSchemas)

export const foreceiptDef = {
  name: 'foreceipt',
  schemas: foreceiptSchemas,
  metadata: {
    verticals: ['expense-management'],
    logoUrl: '/_assets/logo-foreceipt.svg',
  },
  standardMappers: {
    entity: {
      account: ({entity: a}) => ({
        id: `${a.id}`,
        entityName: 'account',
        entity: R.identity<Pta.Account>({
          name: `FR ${a.name ?? ''}`,
          type: ((): Pta.AccountType => {
            switch (a.type) {
              case 'Cash':
                return 'asset/cash'
              case 'Chequing':
              case 'Saving':
              case 'Debit Card':
                return 'asset/bank'
              case 'Credit Card':
                return 'liability/credit_card'
              case 'Loan':
                return 'liability/personal_loan'
              default:
                return 'asset'
            }
          })(),
          defaultUnit: a.currency as Unit,
        }),
      }),
      transaction: ({entity, info, id}, _extConn) => {
        const t = entity.content
        const c = info
        const meta = entity
        const creator = c?.memberByGuid[meta.user_guid]
        return {
          id,
          entityName: 'transaction',
          entity: R.identity<Pta.Transaction>({
            date: t.receipt_date,
            payee: t.merchant,
            description: t.notes ?? '',
            // TODO: Split transactions should be handled via deleting one of the receipts in Openint
            removed: t.status === 'Deleted',
            postingsMap: makePostingsMap({
              main: {
                accountExternalId: `${c?._id}-${t.account_id}` as ExternalId,
                amount: A(
                  (t.type === makeForeceiptClient(_extConn).EXPENSE_TYPE ||
                  t.type === makeForeceiptClient(_extConn).TRANSFER_TYPE
                    ? -1
                    : 1) * t.amount,
                  t.currency,
                ),
              },
              remainder: {
                accountExternalId:
                  t.type === makeForeceiptClient(_extConn).TRANSFER_TYPE
                    ? (`${c?._id}-${t.account1_id}` as ExternalId)
                    : undefined,
                accountType: ((): Pta.AccountType => {
                  switch (t.type) {
                    case makeForeceiptClient(_extConn).EXPENSE_TYPE:
                      return 'expense'
                    case makeForeceiptClient(_extConn).INCOME_TYPE:
                      return 'income'
                    case makeForeceiptClient(_extConn).TRANSFER_TYPE:
                    default:
                      return 'equity/clearing'
                  }
                })(),
              },
            }),
            attachmentsMap: objectFromArray(
              t.image_file_list,
              (file) => file,
              (file) => ({
                url: `https://api.foreceipt.io/v1/receipt/image/${t.image_folder}/${file}`,
              }),
            ),
            labelsMap: {
              ...objectFromArray(
                t.tags ?? [],
                (tag) => tag,
                () => true,
              ),
              for_business: t.for_business ?? false, // Should this be label?
            },
            custom: {
              ...(c?.team && {
                created_by: R.compact([
                  creator?.first_name,
                  creator?.last_name,
                ]).join(' '),
              }),
            },
            externalCategory:
              c?.categoryNameById[
                R.compact([t.category_id, t.sub_category_id]).join('/')
              ],
          }),
        }
      },
    },
  },
} satisfies ConnectorDef<typeof foreceiptSchemas>

export default foreceiptDef
