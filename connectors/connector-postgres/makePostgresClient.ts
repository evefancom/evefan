import {SlonikMigrator} from '@slonik/migrator'
import {createPool, createTypeParserPreset, sql} from 'slonik'
import {createInterceptors} from 'slonik-interceptor-preset'
import type {
  PrimitiveValueExpression,
  TaggedTemplateLiteralInvocation,
} from 'slonik/dist/src/types'
import type {MaybeArray} from '@openint/util'
import {
  fromMaybeArray,
  isPlainObject,
  memoize,
  R,
  snakeCase,
  zFunction,
} from '@openint/util'
import {zPgConfig} from './def'

export {DatabaseError} from 'pg'
export type {DatabaseTransactionConnection, SqlTaggedTemplate} from 'slonik'
export type {TransactionFunction} from 'slonik/dist/src/types'

export const makePostgresClient = zFunction(
  zPgConfig,
  ({databaseUrl, migrationsPath, migrationTableName, ...opts}) => {
    const getPool = memoize(
      async () => {
        const useSsl =
          databaseUrl.includes('sslmode=') &&
          !databaseUrl.includes('sslmode=disable')
        const pool = await createPool(databaseUrl, {
          interceptors: createInterceptors({
            logQueries: true, // TODO: Use roarr-cli to make things better
            normaliseQueries: true,
            // Inverse of what we are doing in `upsertByIdQuery` method
            // This is not guaranteed to work so very important to have extra validation on top of
            // the field values returned
            transformFieldNames: opts.transformFieldNames ?? true,
            benchmarkQueries: false,
          }),
          ssl: useSsl ? {rejectUnauthorized: false} : undefined,
          statementTimeout: 'DISABLE_TIMEOUT', // Not supported by pgBouncer
          idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT', // Not supported by pgBouncer
          maximumPoolSize: 10,
          // Should lower this on cloud functions, which scales by processes. Though this
          // is unlikely to be an issue as the only function using this for the moment is only handling
          // one document at a time...
          connectionTimeout: 60 * 1000, // Long timeout
          typeParsers: [
            ...createTypeParserPreset(),
            // Default slonik parsers aren't great.
            // and parses timestamptz into a number
            // https://share.cleanshot.com/5Dqx8C
            {
              name: 'timestamptz',
              parse: (d) => new Date(d), //.toISOString(),
            },
          ],
        })
        return pool
      },
      {isPromise: true},
    )

    async function getMigrator() {
      const pool = await getPool()
      return new SlonikMigrator({
        migrationsPath: migrationsPath ?? __dirname + '/migrations',
        migrationTableName: migrationTableName ?? 'migrations',
        slonik: pool,
        logger: console,
      })
    }

    async function runMigratorCli() {
      const migrator = await getMigrator()
      await migrator.runAsCLI()
    }

    async function upsertById(...args: Parameters<typeof upsertByIdQuery>) {
      const pool = await getPool()
      const query = upsertByIdQuery(...args)
      if (!query) {
        return
      }
      await pool.query(query)
    }
    return {getPool, sql, upsertById, getMigrator, runMigratorCli}
  },
)

export const toSqlId = (str: string) => sql.identifier([snakeCase(str)])
/**
 * First row is used for type inference. Will need to support explicit columns later
 * Expects an `id` and `updated_at` column to exist in db. Will also ignore updates to `created_at`
 * Will automatically snake_case
 * TODOs: 1) Support JSON patching
 * 2) Supports explict column definition
 *
 * https://blog.sequin.io/airtable-sync-process/
 * insert into public.products (id,created_time,name,size,color)
 * values $1, $2, $3, $4, $5
 * on conflict (id) do update set
 * id=excluded.id, created_time=excluded.created_time, name=excluded.name, size=excluded.size, color=excluded.color
 * where (created_time, name, size, color) is distinct from (excluded.created_time, excluded.name, excluded.size, excluded.color)
 *
 */
export function upsertByIdQuery(
  tableName: string,
  _valueMaps: MaybeArray<{id: string; [k: string]: unknown}>,
  // deep is not implemented yet
  opts: {mergeJson?: 'shallow'; primaryKey?: string[]} = {},
) {
  // console.log('[upsertByIdQuery]', {tableName, valueMaps})
  const valueMaps = fromMaybeArray(_valueMaps)
  const firstVMap = valueMaps[0]
  if (!firstVMap) {
    console.log('[upsertByIdQuery] No value maps provided')
    return null
  }

  const pkey = opts.primaryKey ?? ['id']
  const table = toSqlId(tableName)

  const kUpdatedAt = 'updatedAt'
  const kCreatedAt = 'createdAt'
  // `undefined` is not supported by postgres and we make it mean `set to null` for now.
  const keys = R.keys(firstVMap).filter(
    (k) => k !== kUpdatedAt && k !== kCreatedAt && firstVMap[k] !== undefined,
  )
  const typeMap = R.mapValues(firstVMap, (v) =>
    v instanceof Date
      ? 'date'
      : isPlainObject(v) || Array.isArray(v)
        ? 'jsonb'
        : null,
  )

  const cols = keys.map((k) => {
    const colId = toSqlId(k)
    const fullId = sql`${table}.${colId}`
    const excluded =
      opts.mergeJson === 'shallow' && typeMap[k] === 'jsonb'
        ? // We need to coalesce to an empty object otherwise null || anything will still end up
          // being null in postgres. This does not effect the inverse, anything || null will still
          // set to null which is desired
          sql`COALESCE(${fullId}, '{}'::jsonb) || excluded.${colId}`
        : sql`excluded.${colId}`
    return {key: k, colId, fullId, excluded}
  })
  const valLists = valueMaps.map((vmap) =>
    keys.map((k) => {
      const v = vmap[k]

      return typeMap[k] === 'jsonb'
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
          sql.jsonb(v as any)
        : typeMap[k] === 'date'
          ? sql.timestamp(v as Date)
          : (v as PrimitiveValueExpression)
    }),
  )

  const getColId = (c: (typeof cols)[number]) => c.colId

  const query = sql`
    INSERT INTO ${table} (${sql.join(cols.map(getColId), sql`, `)})
    VALUES (${sql.join(
      valLists.map((vals) => sql.join(vals, sql`, `)),
      sql`), (`,
    )})
    ON CONFLICT (${sql.join(
      pkey.map((k) => sql.identifier([snakeCase(k)])),
      sql`, `,
    )}) DO UPDATE SET
      ${sql.join(
        [
          ...cols
            .filter((c) => !pkey.includes(c.key))
            .map((c) => sql`${c.colId} = ${c.excluded}`),
          sql`${toSqlId(kUpdatedAt)} = now()`,
        ],
        sql`, \n`,
      )}
    WHERE
      ${sql.join(
        cols
          .filter((c) => !pkey.includes(c.key) && c.key !== kUpdatedAt)
          .map((c) => sql`${c.fullId} IS DISTINCT FROM ${c.excluded}`),
        sql` OR \n`,
      )};
  `
  return query
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyLimitOffset<T extends Record<string, any>>(
  query: TaggedTemplateLiteralInvocation<T>,
  opts: {limit?: number; offset?: number},
) {
  const limit = opts.limit ? sql`LIMIT ${opts.limit}` : sql``
  const offset = opts.offset ? sql`OFFSET ${opts.offset}` : sql``
  return sql<T>`${query} ${limit} ${offset}`
}
