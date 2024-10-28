import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, DateTime, leftPad, parseMoney, R, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'

// prettier-ignore
/**
 * e.g.
{
  "Transaction Date": "05/11/22",
  "Amount": "29.00",
  "Card Present": "No",
  "Memo": "",
  "Ramp Category": "SaaS / Software",
  "Transaction Time": "2022-05-11 22:18:02",
  "QuickBooks Customer/Job": "",
  "Card Last 4": "4034",
  "Has Receipt": "No",
  "Merchant City": "San Francisco",
  "Accounting Sync Date": "",
  "Card Display Name": "Superhuman",
  "Ramp Location": "San Francisco",
  "Accounting Merchant": "",
  "Accounting Subsidiary": "",
  "Accounting Location": "",
  "Accounting Department": "",
  "Merchant Description": "SUPERHUMAN",
  "User": "Tony Xiao",
  "Clearing Date": "05/12/22",
  "QuickBooks Category": "",
  "QuickBooks Billable": "",
  "External ID": "RAMP.c6b65c60-3b7b-4778-9412-abd6fb44258a",
  "Receipts Link": "https://app.ramp.com/business-overview/transactions/c6b65c60-3b7b-4778-9412-abd6fb44258a/receipts",
  "Merchant Name": "Superhuman",
  "Accounting Category Code": "",
  "Clearing Time": "2022-05-12 15:11:12",
  "Header Memo": "Ramp Card transactions 05.01.22 to 06.04.22 (Synced on 06.04.22)",
  "Ramp Department": "General",
  "Accounting Category": "",
  "Transaction Link": "https://app.ramp.com/business-overview/transactions/c6b65c60-3b7b-4778-9412-abd6fb44258a",
  "Merchant State": "CA"
}
 */
export interface RampTransactionRow {
  'Transaction Date': string
  'Transaction Time': string
  'Clearing Date': string
  'Clearing Time': string
  'Amount': string
  /** @deprecated. Use `User` */
  'Cardholder Name'?: string
  /** New version of 'Cardholder Name' as of June 17, 2021 */
  'User'?: string
  'Merchant Description': string
  'Merchant Name': string
  'Ramp Category': string
  'Ramp Department': string
  'Ramp Location': string
  'Card Last 4': string
  'Card Present': string
  'Memo': string
  'Accounting Category': string
  'Accounting Department': string
  'Accounting Location': string
  'Accounting Sync Date': string
  'Transaction Link': string
  'Has Receipt': string
  'Receipts Link': string
  'External ID': string
  'Header Memo': string
}
/** TODO: Infer type from schema, rather than cast schema to type... */
const zRampRow = zCast<RampTransactionRow>()

/** Empirically confirmed that this is in UTC, despite lack of timezone */
const rampTimeFormat = 'yy-MM-dd hh:mm:ss'
/** Need to chreck if this is UTC date still */
// const rampDateFormat = 'M/d/yy'

export const rampFormat = makeImportFormat({
  name: 'ramp',
  rowSchema: zRampRow,
  parseRows: (csvString) => {
    const res = Papa.parse<RampTransactionRow>(csvString, {header: true})
    return res.data.filter((r) => !!r['Transaction Date']) // sometimes we have ending line
  },
  mapEntity: (row, accountExternalId) => {
    // Ramp omits missing zero so we add it
    const last4Padded = `*${leftPad(row['Card Last 4'], 4, '0')}`
    // Confirmed that Ramp is UTC
    const clearingDate = row['Clearing Time']
    return {
      id: row['External ID'] as ExternalId,
      entityName: 'transaction',
      entity: {
        // Defaulting to transactionDate could break the logic for balance assertions
        // therefore not ideal... Figure out what to do
        // This would default to current date in case of missing
        date: DateTime.fromFormat(
          row['Transaction Time'],
          rampTimeFormat,
        ).toISO(),
        // date: DateTime.fromFormat(clearingDate, rampTimeFormat).toISO(),
        description: row['Merchant Description'],
        payee: row['Merchant Name'],
        externalCategory: row['Ramp Category'],
        externalStatus: clearingDate ? 'pending' : undefined,
        postingsMap: makePostingsMap({
          // TODO: Different postings for pending vs. cleared
          main: {
            date: DateTime.fromFormat(clearingDate, rampTimeFormat).toISO(),
            accountExternalId,
            // We could really use some custom attribute shere...
            // Hack for now. We really need custom fields
            memo: R.compact([
              // !clearingDate ? 'Pending' : '',
              row.User ?? row['Cardholder Name'],
              last4Padded,
            ]).join('/'),
            subAccountKey: !clearingDate ? 'pending' : undefined,
            amount: A(-1 * parseMoney(row.Amount), 'USD'), // Ramp is USD only
          },
        }),
        custom: {
          user: row.User ?? row['Cardholder Name'],
          lastFour: last4Padded,
        },
      },
    }
  },
})
