import {upsertByIdQuery} from './makePostgresClient'

// String snapshot serializer
expect.addSnapshotSerializer({
  serialize: (val: string, _, indent) =>
    val
      .split('\n')
      .filter((s) => !!s.trim())
      .map((s) => indent + s.trim())
      .join('\n'),
  test: (val) => typeof val === 'string',
})

test('sql generation', () => {
  const tableName = 'transaction'
  const valueMap = {
    id: 'txn_test',
    provider_name: 'plaid',
    resource_id: 'reso_test123',
  }
  const query = upsertByIdQuery(tableName, valueMap)

  expect(query?.sql).toMatchInlineSnapshot(`
    INSERT INTO "transaction" ("id", "provider_name", "resource_id")
    VALUES ($1, $2, $3)
    ON CONFLICT ("id") DO UPDATE SET
    "provider_name" = excluded."provider_name",
    "resource_id" = excluded."resource_id",
    "updated_at" = now()
    WHERE
    "transaction"."provider_name" IS DISTINCT FROM excluded."provider_name" OR
    "transaction"."resource_id" IS DISTINCT FROM excluded."resource_id";
  `)
  expect(query?.values).toMatchInlineSnapshot(`
    [
        txn_test,
        plaid,
        reso_test123,
    ]
  `)
})
