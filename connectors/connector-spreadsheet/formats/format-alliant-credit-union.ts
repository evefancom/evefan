import Papa from 'papaparse'
import {A, DateTime, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface AlliantCreditUnionTransactionRow {
  /* 02/24/2020 */
  Date: string
  /* "UNO DOS TACOS            SAN FRANCISCOCA" */
  Description: string
  /* $14.08 */
  Amount: string
  /* $0.00 */
  Balance: string
}

const zAlliantCreditUnionRow = zCast<AlliantCreditUnionTransactionRow>()

export const formatAlliantCreditUnion = makeImportFormat({
  name: 'alliant-credit-union',
  rowSchema: zAlliantCreditUnionRow,
  parseRows: (csvString) =>
    Papa.parse<AlliantCreditUnionTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.Date.trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(row.Date, 'MM/dd/yyyy').toISODate(),
      description: row.Description,
      postingsMap: {
        main: {
          accountExternalId,
          // TODO: Add helper function to parse amount more reliably
          // TODO: Confirm AlliantCreditUnion is USD only
          amount: A(-1 * Number.parseFloat(row.Amount.replace('$', '')), 'USD'),
        },
      },
    },
  }),
})
