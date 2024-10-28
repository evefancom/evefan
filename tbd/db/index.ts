import type {DrizzleConfig} from 'drizzle-orm'
import {sql} from 'drizzle-orm'
import {drizzle} from 'drizzle-orm/postgres-js'
import {migrate} from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {env} from '@openint/env'
import * as schema from './schema'

export * from './schema-dynamic'
export * from './stripeNullByte'
export * from './upsert'

export {schema}

export function getDb<
  TSchema extends Record<string, unknown> = Record<string, never>,
>(urlString: string, config?: DrizzleConfig<TSchema>) {
  const pg = postgres(urlString)
  const db = drizzle(pg, {logger: !!env['DEBUG'], ...config})

  const url = new URL(urlString)
  if (env.DEBUG) {
    console.log('[db] host', url.host)
  }
  return {db, pg}
}

export const {pg: configPg, db: configDb} = getDb(env.POSTGRES_URL, {schema})

export async function ensureSchema(
  thisDb: ReturnType<typeof getDb>['db'],
  schema: string,
) {
  // Check existence first because we may not have permission to actually create the schema
  const exists = await thisDb
    .execute(
      sql`SELECT true as exists FROM information_schema.schemata WHERE schema_name = ${schema}`,
    )
    .then((r) => r[0]?.['exists'] === true)
  if (exists) {
    return
  }
  await thisDb.execute(
    sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schema)};`,
  )
}

/** Will close the postgres client connection by default */
export async function runMigration(opts?: {keepAlive?: boolean}) {
  console.log('[db] Running migrations...')
  const path = await import('node:path')
  // const fs = await import('node:fs')
  // const url = await import('node:url')

  const schema = env['POSTGRES_SCHEMA']
  if (schema) {
    await ensureSchema(configDb, schema)
    await configDb.execute(sql`
      SET search_path TO ${sql.identifier(schema)};
    `)
  }

  // const __filename = url.fileURLToPath(import.meta.url)
  // const __dirname = path.dirname(__filename)
  await migrate(configDb, {
    migrationsFolder: path.join(__dirname, 'migrations'),
    // Seems to have no impact, and unconditionally creates a drizzle schema... 🤔
    // migrationsTable: '_migrations',
  })

  if (!opts?.keepAlive) {
    await configPg.end()
  }
}

export * from 'drizzle-orm'
