import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface AppleCardTransactionRow {
  /** 04/26/2020 */
  'Transaction Date': string
  /** 04/27/2020 */
  'Clearing Date': string
  /** "APPLE.COM/BILL ONE APPLE PARK WAY 866-712-7753 95014 CA USA" */
  Description: string
  /** "Apple Services" */
  Merchant: string
  /** "Other" */
  Category: string
  /** "Purchase" */
  Type: string
  /** "2.99" */
  'Amount (USD)': string
}

const appleCardDateFormat = 'MM/dd/yyyy'

/** TODO: Infer type from schema, rather than cast schema to type... */
const zAppleCardRow = zCast<AppleCardTransactionRow>()

export const formatAppleCard = makeImportFormat({
  name: 'apple-card',
  rowSchema: zAppleCardRow,
  parseRows: (csvString) =>
    Papa.parse<AppleCardTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r['Transaction Date'].trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(
        row['Transaction Date'],
        appleCardDateFormat,
      ).toISODate(),
      payee: row.Merchant,
      description: row.Description,
      externalCategory: row.Category, // Maybe leverage Type === 'Payment' to help with recon?
      postingsMap: makePostingsMap({
        main: {
          date: DateTime.fromFormat(
            row['Clearing Date'],
            appleCardDateFormat,
          ).toISODate(),
          accountExternalId,
          amount: A(-1 * parseMoney(row['Amount (USD)']), 'USD'),
        },
      }),
    },
  }),
})
