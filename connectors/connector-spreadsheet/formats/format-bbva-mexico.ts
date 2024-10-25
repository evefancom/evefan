import Papa from 'papaparse'
import {A, DateTime, zCast} from '@openint/util'
import {makeImportFormat} from '../makeImportFormat'
import {RowIdMaker} from '../RowIdMaker'

export interface BBVAMexicoTransactionRow {
  /** 28/01/2020 */
  FECHA: string
  /** PAGO CUENTA DE TERCERO    /  0041782016     BNET    0113831760 LOGOS ES           */
  DESCRIPCIÓN: string
  /** -2,500.00 */
  CARGO: string
  /** 1,800.00 */
  ABONO: string
  /** 21,012.26 */
  SALDO: string
}

const zBBVAMexicoRow = zCast<BBVAMexicoTransactionRow>()

export const formatBBVAMexico = makeImportFormat({
  name: 'bbva-mexico',
  rowSchema: zBBVAMexicoRow,
  parseRows: (csvString) =>
    Papa.parse<BBVAMexicoTransactionRow>(csvString, {
      header: true,
    }).data.filter((r) => r.FECHA.trim()),
  mapEntity: (row, accountExternalId) => ({
    id: RowIdMaker.idForRow(row),
    entityName: 'transaction',
    entity: {
      date: DateTime.fromFormat(row.FECHA, 'dd/MM/yyyy').toISODate(),
      description: row.DESCRIPCIÓN,
      postingsMap: {
        main: {
          accountExternalId,
          // TODO: Confirm BBVAMexico is USD only. Also what happens when transaction
          // was foreign?
          amount: A(
            Number.parseFloat(row.CARGO.trim() ? row.CARGO : row.ABONO),
            'MXN',
          ),
        },
      },
    },
  }),
})
