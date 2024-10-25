import {sql} from 'drizzle-orm'
import {configDb} from './'
import {engagement_sequence} from './schema-dynamic'
import {dbUpsert} from './upsert'

async function formatSql(sqlString: string) {
  const prettier = await import('prettier')
  const prettierSql = await import('prettier-plugin-sql')
  return prettier.format(sqlString, {
    parser: 'sql',
    plugins: [prettierSql.default],
    // https://github.com/un-ts/prettier/tree/master/packages/sql#sql-in-js-with-prettier-plugin-embed
    ['language' as 'filepath' /* workaround type error */]: 'postgresql',
  })
}

test('upsert query', async () => {
  const query = dbUpsert(
    configDb,
    engagement_sequence,
    [
      {
        source_id: 'source_id',
        id: '123',
        is_deleted: false,
        // Workaround jsonb support issue... https://github.com/drizzle-team/drizzle-orm/issues/724
        raw: sql`${{hello: 1}}::jsonb`,
        unified: sql`${{world: 2}}::jsonb`,
      },
    ],
    {
      shallowMergeJsonbColumns: ['raw', 'unified'],
      noDiffColumns: ['updated_at'],
    },
  )
  expect(await formatSql(query?.toSQL().sql ?? '')).toMatchInlineSnapshot(`
    "insert into
      "engagement_sequence" (
        "source_id",
        "id",
        "created_at",
        "updated_at",
        "is_deleted",
        "raw",
        "unified"
      )
    values
      (
        $1,
        $2,
        default,
        default,
        $3,
        $4::jsonb,
        $5::jsonb
      )
    on conflict ("source_id", "id") do
    update
    set
      "is_deleted" = excluded.is_deleted,
      "raw" = COALESCE("engagement_sequence"."raw", '{}'::jsonb) || excluded.raw,
      "unified" = COALESCE("engagement_sequence"."unified", '{}'::jsonb) || excluded.unified
    where
      (
        "engagement_sequence"."is_deleted" IS DISTINCT FROM excluded.is_deleted
        or "engagement_sequence"."raw" IS DISTINCT FROM excluded.raw
        or "engagement_sequence"."unified" IS DISTINCT FROM excluded.unified
      )
    "
  `)
})
