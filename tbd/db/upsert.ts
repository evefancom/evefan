import {and, or, sql} from 'drizzle-orm'
import type {PgInsertBase} from 'drizzle-orm/pg-core'
import {
  getTableConfig,
  type PgColumn,
  type PgDatabase,
  type PgInsertValue,
  type PgTable,
  type PgUpdateSetSource,
} from 'drizzle-orm/pg-core'

type ColumnKeyOf<T extends PgTable> = Extract<keyof T['_']['columns'], string>

export interface DbUpsertOptions<TTable extends PgTable> {
  /** defaults to primaryKeyColumns */
  keyColumns?: Array<ColumnKeyOf<TTable>>
  /** Shallow jsonb merge as via sql`COALESCE(${fullId}, '{}'::jsonb) || excluded.${colId}` */
  shallowMergeJsonbColumns?: Array<ColumnKeyOf<TTable>>
  /**
   * Changes to these columns will be ignored in the WHERE clause of ON CONFLICT UPDATE
   * e.g. `updated_at`
   */
  noDiffColumns?: Array<ColumnKeyOf<TTable>>
  // TODO: Add onlyDiffColumns to be symmetrical with noDiffColumns
  /**
   * These columns will only be inserted but never updated. e.g. `created_at`
   * keyColumns are always insertOnly by nature and do not need to be repeated here
   */
  insertOnlyColumns?: Array<ColumnKeyOf<TTable>>
  /**
   * These columns will have to match for the row to be updated
   */
  mustMatchColumns?: Array<ColumnKeyOf<TTable>>
}

export type DbUpsertQuery<TTable extends PgTable> = Omit<
  PgInsertBase<
    TTable,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    undefined,
    false,
    'onConflictDoNothing' | 'onConflictDoUpdate'
  >,
  'onConflictDoNothing' | 'onConflictDoUpdate'
>

export function dbUpsertOne<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB extends PgDatabase<any, any>,
  TTable extends PgTable,
>(
  db: DB,
  table: TTable,
  value: PgInsertValue<TTable>,
  options?: DbUpsertOptions<TTable>,
) {
  // Will always have non empty returns as we are guaranteed a single value
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return dbUpsert(db, table, [value], options)!
}

/** We assume that every row contains the same keys even if not defined in its value */
export function dbUpsert<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB extends PgDatabase<any, any>,
  TTable extends PgTable,
>(
  db: DB,
  table: TTable,
  values: Array<PgInsertValue<TTable>>,
  options: DbUpsertOptions<TTable> = {},
) {
  const tbCfg = getTableConfig(table)
  const getColumn = (name: string) => {
    const col = table[name as keyof PgTable] as PgColumn
    if (!col) {
      throw new Error(`Column ${name} not found in table ${tbCfg.name}`)
    }
    return col
  }

  const keyColumns =
    options.keyColumns?.map(getColumn) ??
    tbCfg.primaryKeys[0]?.columns ??
    tbCfg.columns.filter((c) => c.primary) // Presumably only a single primary key column will be possible in this scenario
  const shallowMergeJsonbColumns =
    options.shallowMergeJsonbColumns?.map(getColumn)
  const noDiffColumns = options.noDiffColumns?.map(getColumn)
  const insertOnlyColumns = options.insertOnlyColumns?.map(getColumn)

  if (!keyColumns) {
    throw new Error(
      `Unable to upsert without keyColumns for table ${tbCfg.name}`,
    )
  }

  if (!values.length) {
    return
  }
  const insertOnlyColumnNames = new Set([
    ...keyColumns.map((k) => k.name),
    ...(insertOnlyColumns?.map((k) => k.name) ?? []),
  ])
  const updateColumns = Object.fromEntries(
    Object.keys(values[0] ?? {})
      .map((k) => [k, getColumn(k)] as const)
      .filter(([, c]) => !insertOnlyColumnNames.has(c.name)),
  )

  const insertQuery = db.insert(table).values(values)

  const onConflictOptions = {
    target: keyColumns,
    where: and(
      or(
        ...Object.values(updateColumns)
          .filter((c) => !noDiffColumns?.find((ic) => ic.name === c.name))
          .map(
            // In PostgreSQL, the "IS DISTINCT FROM" operator is used to compare two values and determine
            // if they are different, even if they are both NULL. On the other hand, the "!=" operator
            // (also known as "not equals") compares two values and returns true if they are different,
            // but treats NULL as an unknown value and does not consider it as different from other values.
            (c) => sql`${c} IS DISTINCT FROM ${sql.raw(`excluded.${c.name}`)}`,
          ),
      ),
      ...(options.mustMatchColumns ?? [])
        .map((c) => getColumn(c))
        .map((c) => sql`${c} = excluded.${sql.identifier(c.name)}`),
    ),
  } satisfies Parameters<(typeof insertQuery)['onConflictDoNothing']>[0]

  if (Object.keys(updateColumns ?? []).length === 0) {
    return insertQuery.onConflictDoNothing(onConflictOptions)
  }

  return insertQuery.onConflictDoUpdate({
    ...onConflictOptions,
    set: Object.fromEntries(
      Object.entries(updateColumns).map(([k, c]) => [
        k,
        sql.join([
          shallowMergeJsonbColumns?.find((jc) => jc.name === c.name)
            ? sql`COALESCE(${c}, '{}'::jsonb) ||`
            : sql``,
          sql.raw(`excluded.${c.name}`),
        ]),
      ]),
    ) as PgUpdateSetSource<TTable>,
  })
}
