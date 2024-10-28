import Papa from 'papaparse'
import {A, DateTime, parseMoney, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface FirstRepublicTransactionRow {
  /* 2/20/19 */
  Date: string
  /* PreAuthorized ACH Debit */
  Description: string
  /* -125 */
  Amount: string
  /* FINRA 2403865343/ CRD       / 190220/ 000001030748104       / */
  Detail: string
}

const zFirstRepublicRow = zCast<FirstRepublicTransactionRow>()

export const formatFirstRepublic = makeImportFormat({
  name: 'first-republic',
  rowSchema: zFirstRepublicRow,
  parseRows: (csvString) =>
    Papa.parse<FirstRepublicTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.Date.trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(row.Date, 'M/d/yy').toISODate(),
      description: row.Detail,
      payee: row.Description, // better than messing up labels
      postingsMap: {
        main: {
          accountExternalId,
          // Presumably USD
          amount: A(parseMoney(row.Amount), 'USD'),
        },
      },
      // TODO: Allow undefined via recursive omitUndefined
    },
  }),
})
