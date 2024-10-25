/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  configDb,
  dbUpsert,
  getCommonObjectTable,
  configPg,
  sql,
  stripNullByte,
} from '@openint/db'
import args from './debug-input.json'

const sqlNow = sql`now()`

async function main() {
  const table = getCommonObjectTable('crm_contact', {schema: 'byos_test'})
  await dbUpsert(
    configDb,
    table,
    [
      {
        // Primary keys
        source_id: args[1] as any,
        id: args[3] as any,
        // Other columns
        created_at: sqlNow,
        updated_at: sqlNow,
        is_deleted: args[4] as any,
        // Workaround jsonb support issue... https://github.com/drizzle-team/drizzle-orm/issues/724
        // raw_data: sql`regexp_replace(${args[5] ?? ''}::text, '\\u0000', '', 'g')::jsonb`,
        // raw_data: sql`to_jsonb(${JSON.stringify(args[5] ?? {})}::text)`,
        // raw_data: sql`to_jsonb(${JSON.stringify(args[5] ?? {})}::text)`,
        raw: sql`${stripNullByte(args[5]) ?? null}::jsonb`,
        unified: sql`${args[6]}::jsonb`,
      },
    ],
    {insertOnlyColumns: ['created_at'], noDiffColumns: ['updated_at']},
  )
  await configPg.end()
}

void main()
