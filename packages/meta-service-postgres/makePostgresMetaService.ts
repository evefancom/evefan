import type {Id, Viewer, ZRaw} from '@openint/cdk'
import {zViewer} from '@openint/cdk'
import {zPgConfig} from '@openint/connector-postgres/def'
import type {
  DatabaseTransactionConnection,
  SqlTaggedTemplate,
  TransactionFunction,
} from '@openint/connector-postgres/makePostgresClient'
import {
  applyLimitOffset,
  makePostgresClient,
} from '@openint/connector-postgres/makePostgresClient'
import type {
  EndUserResultRow,
  MetaService,
  MetaTable,
} from '@openint/engine-backend'
import {memoize, R, zFunction} from '@openint/util'

const getPostgreClient = memoize((databaseUrl: string) =>
  makePostgresClient({databaseUrl}),
)

/**
 * This sets the postgres grand central config (GUC) and determines the identity
 * that gets used for every request to db for the purpose of authorization
 * in row-level-security! So be very careful
 */
function localGucForViewer(viewer: Viewer) {
  switch (viewer.role) {
    case 'anon':
      return {role: 'anon'}
    case 'end_user':
      return {
        role: 'end_user',
        'request.jwt.claim.end_user_id': viewer.endUserId,
        'request.jwt.claim.org_id': viewer.orgId,
      }
    case 'user':
      return {
        role: 'authenticated',
        'request.jwt.claim.sub': viewer.userId,
        'request.jwt.claim.org_id': viewer.orgId ?? null,
      }
    case 'org':
      return {role: 'org', 'request.jwt.claim.org_id': viewer.orgId}
    case 'system':
      return {role: null} // Should be the same as reset role and therefore operates without RLS policy
    default:
      throw new Error(`Unknown viewer role: ${(viewer as Viewer).role}`)
  }
  // Should we erase keys incompatible with current viewer role to avoid confusion?
}

async function assumeRole(options: {
  db: DatabaseTransactionConnection
  viewer: Viewer
  sql: SqlTaggedTemplate
}) {
  const {db, viewer, sql} = options
  for (const [key, value] of Object.entries(localGucForViewer(viewer))) {
    await db.query(sql`SELECT set_config(${key}, ${value}, true)`)
  }
}

type Deps = ReturnType<typeof _getDeps>
const _getDeps = (opts: {databaseUrl: string; viewer: Viewer}) => {
  const {viewer, databaseUrl} = opts
  const client = getPostgreClient(databaseUrl)
  const {sql, getPool} = client
  return {
    ...client,
    runQueries: async <T>(handler: TransactionFunction<T>) => {
      const pool = await getPool()
      return pool.transaction(async (trxn) => {
        await assumeRole({db: trxn, viewer, sql})
        return handler(trxn)
      })
    },
  }
}

export const makePostgresMetaService = zFunction(
  zPgConfig.pick({databaseUrl: true}).extend({viewer: zViewer}),
  (opts): MetaService => {
    const tables: MetaService['tables'] = {
      // Delay calling of __getDeps until later..
      resource: metaTable('resource', _getDeps(opts)),
      integration: metaTable('integration', _getDeps(opts)),
      connector_config: metaTable('connector_config', _getDeps(opts)),
      pipeline: metaTable('pipeline', _getDeps(opts)),
    }
    return {
      tables,
      searchEndUsers: ({keywords, ...rest}) => {
        const {runQueries, sql} = _getDeps(opts)
        const where = keywords
          ? sql`WHERE end_user_id ILIKE ${'%' + keywords + '%'}`
          : sql``
        const query = applyLimitOffset(
          sql`
            SELECT
              end_user_id as id,
              count(*) AS resource_count,
              min(created_at) AS first_created_at,
              max(updated_at) AS last_updated_at
            FROM
              resource
            ${where}
            GROUP BY end_user_id
          `,
          rest,
        )
        return runQueries((pool) => pool.any<EndUserResultRow>(query))
      },
      searchIntegrations: ({keywords, connectorNames, ...rest}) => {
        const {runQueries, sql} = _getDeps(opts)
        const conditions = R.compact([
          connectorNames &&
            sql`connector_name = ANY(${sql.array(connectorNames, 'varchar')})`,
          keywords && sql`standard->>'name' ILIKE ${'%' + keywords + '%'}`,
        ])
        const where =
          conditions.length > 0
            ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
            : sql``
        return runQueries((pool) =>
          pool.any(
            applyLimitOffset(sql`SELECT * FROM integration ${where}`, rest),
          ),
        )
      },

      findPipelines: ({resourceIds, secondsSinceLastSync, includeDisabled}) => {
        const {runQueries, sql} = _getDeps(opts)
        const ids = resourceIds && sql.array(resourceIds, 'varchar')
        const conditions = R.compact([
          ids && sql`(source_id = ANY(${ids}) OR destination_id = ANY(${ids}))`,
          secondsSinceLastSync &&
            sql`
              (now() - COALESCE(last_sync_completed_at, to_timestamp(0)))
              >= (interval '1 second' * ${secondsSinceLastSync})
            `,
          !includeDisabled && sql`disabled IS NOT TRUE`,
        ])
        const where =
          conditions.length > 0
            ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
            : sql``
        return runQueries((pool) =>
          pool.any(sql`SELECT * FROM pipeline ${where}`),
        )
      },
      listConnectorConfigInfos: ({id, connectorName} = {}) => {
        const {runQueries, sql} = _getDeps(opts)
        return runQueries((pool) =>
          pool.any(
            sql`SELECT id, env_name, display_name FROM connector_config ${
              id && connectorName
                ? sql`WHERE id = ${id} AND connector_name = ${connectorName} AND disabled = FALSE`
                : id
                  ? sql`WHERE id = ${id} AND disabled = FALSE`
                  : connectorName
                    ? sql`WHERE connector_name = ${connectorName} AND disabled = FALSE`
                    : sql`WHERE disabled = FALSE`
            }`,
          ),
        )
      },
      findResourcesMissingDefaultPipeline: () => {
        const {runQueries, sql} = _getDeps(opts)
        return runQueries((pool) =>
          pool.any<{id: Id['reso']}>(sql`
            SELECT
              r.id,
              cc.default_pipe_out_destination_id,
              cc.default_pipe_in_source_id,
              pipe_out.id destination_pipeline_id,
              pipe_in.id source_pipeline_id
            FROM
              resource r
              JOIN connector_config cc ON r.connector_config_id = cc.id
              LEFT JOIN pipeline pipe_out ON pipe_out.source_id = r.id
                AND pipe_out.destination_id = cc.default_pipe_out_destination_id
              LEFT JOIN pipeline pipe_in ON pipe_in.destination_id = r.id
                AND pipe_in.source_id = cc.default_pipe_in_source_id
            WHERE (cc.default_pipe_out_destination_id IS NOT NULL AND pipe_out IS NULL)
              OR (cc.default_pipe_in_source_id IS NOT NULL AND pipe_in IS NULL)
          `),
        )
      },
    }
  },
)

function metaTable<TID extends string, T extends Record<string, unknown>>(
  tableName: keyof ZRaw,
  {sql, upsertById, runQueries}: Deps,
): MetaTable<TID, T> {
  const table = sql.identifier([tableName])

  //  const sqlType = sql.type(zRaw[tableName])

  // TODO: Convert case from snake_case to camelCase
  return {
    list: ({
      ids,
      endUserId,
      connectorConfigId,
      connectorName,
      keywords,
      ...rest
    }) =>
      runQueries((pool) => {
        const conditions = R.compact([
          ids && sql`id = ANY(${sql.array(ids, 'varchar')})`,
          endUserId && sql`end_user_id = ${endUserId}`,
          connectorConfigId && sql`connector_config_id = ${connectorConfigId}`,
          connectorName && sql`connector_name = ${connectorName}`,
          // Temp solution, shall use fts and make this work for any table...
          keywords &&
            tableName === 'integration' &&
            sql`standard->>'name' ILIKE ${'%' + keywords + '%'}`,
        ])
        const where =
          conditions.length > 0
            ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
            : sql``
        return pool.any(
          applyLimitOffset(sql`SELECT * FROM ${table} ${where}`, rest),
        )
      }),
    get: (id) =>
      runQueries((pool) =>
        pool.maybeOne<T>(sql`SELECT * FROM ${table} where id = ${id}`),
      ),
    set: (id, data) => upsertById(tableName, {...data, id}),
    patch: (id, data) =>
      upsertById(tableName, {...data, id}, {mergeJson: 'shallow'}),
    delete: (id) =>
      runQueries((pool) =>
        pool.query(sql`DELETE FROM ${table} WHERE id = ${id}`),
      ).then(() => {}),
  }
}
