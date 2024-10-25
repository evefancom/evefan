import type {EntityPayload} from '@openint/cdk'
import type {ValueOf} from '@openint/util'
import {R, z} from '@openint/util'

/**
 * Can be reused by in places such as Google Sheets / Excel. CSV is a starting
 * point for all the handling here
 */

export type ImportFormat = ReturnType<typeof makeImportFormat>

export function makeImportFormat<
  TName extends string,
  ZRowSchema extends z.ZodTypeAny,
>(format: {
  name: TName
  rowSchema: ZRowSchema
  parseRows: (csvString: string) => Array<z.infer<ZRowSchema>>
  // TODO: Figure out where to get accountExternalId from
  mapEntity: (
    row: z.infer<ZRowSchema>,
    accountExternalId: ExternalId,
  ) => EntityPayload
}) {
  return format
}

export function makeImportFormatMap<
  TMap extends Record<string, ImportFormat>,
>(map: {
  [k in keyof TMap]: k extends TMap[k]['name'] ? TMap[k] : never
}) {
  const zPreset = z.enum(R.keys(map as {}) as [Extract<keyof TMap, string>])

  type EntitySchemaForFormat<T> = T extends ImportFormat
    ? z.ZodObject<{preset: z.ZodLiteral<T['name']>; row: T['rowSchema']}>
    : never

  const zSpreadsheetEntity = z.discriminatedUnion(
    'preset',
    R.values(map as Record<string, ImportFormat>).map((f) =>
      z.object({
        preset: z.literal(f.name),
        row: f.rowSchema,
      }),
    ) as [
      EntitySchemaForFormat<ValueOf<typeof map>>,
      EntitySchemaForFormat<ValueOf<typeof map>>,
    ],
  )

  return {formats: map, zPreset, zSpreadsheetEntity}
}
