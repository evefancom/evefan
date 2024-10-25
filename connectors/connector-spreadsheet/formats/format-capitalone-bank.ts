import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, arrayFromObject, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface CapitalOneBankTransactionRow {
  /** 8401 */
  'Account Number': string
  /** 06/04/20 */
  'Transaction Date': string
  /** -459.14 */
  'Transaction Amount': string
  /** Debit */
  'Transaction Type': string
  /** Check #456 Cashed */
  'Transaction Description': string
  /** 34734.27 */
  Balance: string
}

const zCapitalOneBankRow = zCast<CapitalOneBankTransactionRow>()

export const formatCapitalOneBank = makeImportFormat({
  name: 'capitalone-bank',
  rowSchema: zCapitalOneBankRow,
  parseRows: (csvString) =>
    Papa.parse<CapitalOneBankTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r['Transaction Date'].trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(
        row['Transaction Date'],
        'MM/dd/yy',
      ).toISODate(),
      description: row['Transaction Description'],
      postingsMap: makePostingsMap({
        main: {
          accountExternalId,
          // TODO: Confirm CapitalOneBank is USD only. Also what happens when transaction
          // was foreign?
          amount: A(parseMoney(row['Transaction Amount']), 'USD'),
        },
      }),
      notes: arrayFromObject(
        row as unknown as Record<string, string>,
        (key, value) => `${key}: ${value}`,
      ).join('\n'),
    },
  }),
})
