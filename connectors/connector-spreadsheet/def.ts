import type {ConnectorDef, ConnectorSchemas} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import type {UnionToIntersection} from '@openint/util'
import {z} from '@openint/util'
import {
  formatAlliantCreditUnion,
  formatAppleCard,
  formatBBVAMexico,
  formatBrex,
  formatBrexCash,
  formatCapitalOne,
  formatCapitalOneBank,
  formatCoinBase,
  formatCoinKeeper,
  formatEtrade,
  formatFirstRepublic,
  formatWise,
  rampFormat,
} from './formats'
import {makeImportFormatMap} from './makeImportFormat'

// MARK: - Importing all supported formats

const {
  formats: spreadsheetFormats,
  zSpreadsheetEntity,
  zPreset,
} = makeImportFormatMap({
  ramp: rampFormat,
  'apple-card': formatAppleCard,
  'alliant-credit-union': formatAlliantCreditUnion,
  'bbva-mexico': formatBBVAMexico,
  'brex-cash': formatBrexCash,
  brex: formatBrex,
  'capitalone-bank': formatCapitalOneBank,
  capitalone: formatCapitalOne,
  coinbase: formatCoinBase,
  coinkeeper: formatCoinKeeper,
  etrade: formatEtrade,
  'first-republic': formatFirstRepublic,
  wise: formatWise,
})

export {spreadsheetFormats}

const zSrcEntitySchema = z.object({
  /** Row number */
  id: z.string(),
  /** `row` */
  entityName: z.string(),
  entity: zSpreadsheetEntity,
})
// MARK: -

/** Not implemented yet */
const zConfig = z
  .object({
    enabledPresets: z.array(zPreset).nullish(),
    /** e.g. csv, gsheets, airtable, whatever */
    sourceProviders: z.array(z.unknown()).nullish(),
  })
  .nullish()

export const spreadsheetSchemas = {
  name: z.literal('spreadsheet'),
  resourceSettings: z.object({
    preset: zPreset,
    /** This is outdated. Should be the same as the resource external ID */
    accountExternalId: z.string(),
  }),
  sourceOutputEntity: zSrcEntitySchema,
  connectorConfig: zConfig,
  /** NEXT: Implement other import sources such as Airtable */
  // csvString belongs in syncState because among other things we can actually naturally
  // persist the csvString used for every single sync as part of the pipeline_jobs table!
  sourceState: z.object({csvString: z.string()}),
} satisfies ConnectorSchemas

export const spreadsheetHelpers = connHelpers(spreadsheetSchemas)

export const spreadsheetDef = {
  name: 'spreadsheet',
  schemas: spreadsheetSchemas,
  metadata: {
    displayName: 'Spreadsheet (CSV, Google Sheets, Excel)',
    verticals: ['flat-files-and-spreadsheets'],
    logoUrl: '/_assets/logo-spreadsheet.png',
  },
  standardMappers: {
    entity: ({entity}, conn) =>
      // what do we do with the fact that conn has preset and entity itself has preset?
      spreadsheetFormats[entity.preset].mapEntity(
        // A bit of a type hack... but needed
        entity.row as UnionToIntersection<(typeof entity)['row']>,
        conn.accountExternalId as ExternalId,
      ),
  },
} satisfies ConnectorDef<typeof spreadsheetSchemas>

export default spreadsheetDef
