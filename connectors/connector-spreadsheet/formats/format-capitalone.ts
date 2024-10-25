import Papa from 'papaparse'
import {makePostingsMap} from '@openint/cdk'
import {A, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface CapitalOneTransactionRow {
  'Transaction Date': string
  'Posted Date': string
  'Card No.': string
  Description: string
  Category: string
  // TODO: Double check if these are actually numbers
  Debit: string
  Credit: string
}

const zCapitalOneRow = zCast<CapitalOneTransactionRow>()

export const formatCapitalOne = makeImportFormat({
  name: 'capitalone',
  rowSchema: zCapitalOneRow,
  parseRows: (csvString) =>
    Papa.parse<CapitalOneTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r['Transaction Date'].trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: row['Transaction Date'],
      // TODO: Spend capitalOne today and get pending txn to test export
      description: row.Description,
      externalCategory: row.Category,
      postingsMap: makePostingsMap({
        main: {
          accountExternalId,
          // TODO: Confirm CapitalOne is USD only. Also what happens when transaction
          // was foreign?
          amount: A(
            row.Debit
              ? -1 * Number.parseFloat(row.Debit)
              : Number.parseFloat(row.Credit),
            'USD',
          ),
        },
      }),
    },
  }),
})
