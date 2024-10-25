import {sql} from 'drizzle-orm'
// NOTE: Introduce schema name also?
import {
  boolean,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const mySchema = pgSchema('my_schema')

/** e.g. crm_accounts */
export function getCommonObjectTable<TName extends string>(
  tableName: TName,
  opts: {schema?: string} = {},
) {
  const schema = opts.schema ? pgSchema(opts.schema) : undefined
  const table = (schema ? schema.table : pgTable)(
    tableName,
    {
      source_id: text('source_id').notNull(),
      // end_user_id
      // integration_id
      // connector_name
      // these are all derived
      id: text('id').notNull(),
      created_at: timestamp('created_at', {
        precision: 3,
        mode: 'string',
      })
        .defaultNow()
        .notNull(),
      updated_at: timestamp('updated_at', {
        precision: 3,
        mode: 'string',
      })
        .defaultNow()
        .notNull(),
      is_deleted: boolean('is_deleted').default(false).notNull(),
      raw: jsonb('raw'),
      unified: jsonb('unified'),
    },
    (table) => ({
      primaryKey: primaryKey({
        columns: [table.source_id, table.id],
        name: `${tableName}_pkey`,
      }),
    }),
  )
  // Workaround for https://github.com/drizzle-team/drizzle-orm/discussions/1901
  // To get this statement use pnpm db:generate-from-meta result and copy paste output to here... then replace...
  const _schema = opts.schema ? sql.raw(`"${opts.schema}".`) : sql.raw('')
  const _table = sql.raw(tableName)
  const extension = {
    createIfNotExistsSql: () => sql`
      CREATE TABLE IF NOT EXISTS ${_schema}"${_table}" (
        "source_id" text NOT NULL,
        "id" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "is_deleted" boolean DEFAULT false NOT NULL,
        "raw" jsonb,
        "unified" jsonb,
        CONSTRAINT "${_table}_pkey" PRIMARY KEY("source_id","id")
      );
    `,
  }
  Object.assign(table, extension)
  return table as typeof table & typeof extension
}

// NOTE: the following tables are dynamically generated and depends on the incoming data, and in this case they are only used as sample fo copy & pasting
// drizzle migration generate commands depends on the snapshot json
// while db push command depends on the database state
// what we probably need is to dynamically write to schema.ts somehow and parse the output of the db:push command with --strict flag
// and then execute that... a lot of work but may be ok for dynamic schema migration like this...
// We would also need to parse the output of db:generate and store those in the db / put back onto disk from db if we want it to work properly
// So bottom line is hacking around migrations is probably the best way to go esp considering production Supaglue never handled migration
// beyond initial creation anyways...

export const crm_account = getCommonObjectTable('crm_account')
export const engagement_sequence = getCommonObjectTable('engagement_sequence')
