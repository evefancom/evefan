import {sql} from 'drizzle-orm'
import {
  customType,
  index,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import {env} from '@openint/env'
import type {ErrorType} from '@openint/vdk'

/**
 * WARNING: expression is not escaped and not safe for dynamic table construction from user input!
 */
const generated = <T = undefined>(
  name: string,
  dataType: string,
  expr: string,
) =>
  customType<{
    data: T
    driverData: undefined
    default: true
    notNull: true
  }>({
    // TODO: This doesn't actually work, @see
    // https://discord.com/channels/1043890932593987624/1156712008893354084/1209669640637382739
    // however it is still useful to leave it here so migration can produce semi-correct SQL
    dataType() {
      if (env['DEBUG']) {
        console.debug(
          'Please manually modify the migration to add the generated column',
          `${name} ${dataType} GENERATED ALWAYS AS (${expr}) STORED`,
        )
      }
      return dataType
    },
  })(name)

const schema = env['POSTGRES_SCHEMA'] ? pgSchema(env['POSTGRES_SCHEMA']) : null

const table = schema?.table ?? pgTable

/** Not currently used. Maybe better to have customer rather than end_user? */
export const customer = table('customer', {
  // Standard cols
  id: text('id')
    .notNull()
    .primaryKey()
    .default(sql`substr(md5(random()::text), 0, 25)`),
  created_at: timestamp('created_at', {
    precision: 3,
    mode: 'string',
  })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', {
    precision: 3,
    mode: 'string',
  })
    .notNull()
    .defaultNow(),

  // Specific cols
  name: text('name'),
  email: text('email'),
})

/** Aka sync execution or sync log  */
export const sync_run = table(
  'sync_run',
  {
    // Standard cols
    id: text('id')
      .notNull()
      .primaryKey()
      .default(sql`substr(md5(random()::text), 0, 25)`),
    created_at: timestamp('created_at', {
      precision: 3,
      mode: 'string',
    }).defaultNow(),
    updated_at: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).defaultNow(),
    // Identifying cols
    input_event: jsonb('input_event').notNull(),
    // Data columns
    started_at: timestamp('started_at', {precision: 3, mode: 'string'}),
    completed_at: timestamp('completed_at', {
      precision: 3,
      mode: 'string',
    }),
    duration: generated('duration', 'interval', 'completed_at - started_at'),

    initial_state: jsonb('initial_state'),
    final_state: jsonb('final_state'),
    metrics: jsonb('metrics'),
    status: generated<'PENDING' | 'SUCCESS' | ErrorType>(
      'status',
      'varchar',
      "CASE WHEN error_type IS NOT NULL THEN error_type WHEN completed_at IS NOT NULL THEN 'SUCCESS' ELSE 'PENDING' END",
    ),

    resource_id: generated(
      'resource_id',
      'varchar',
      "input_event#>>'{data,resource_id}'",
    ),
    error_detail: text('error_detail'),
    /** zErrorType. But we don't want to use postgres enum */
    error_type: varchar('error_type'),
  },
  (table) => ({
    idx_resource_id: index('idx_resource_id').on(table.resource_id),
  }),
)

export const sync_state = table('sync_state', {
  resource_id: text('resource_id').primaryKey(),
  state: jsonb('state'),
  created_at: timestamp('created_at', {
    precision: 3,
    mode: 'string',
  }).defaultNow(),
  updated_at: timestamp('updated_at', {
    precision: 3,
    mode: 'string',
  }).defaultNow(),
})
