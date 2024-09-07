import postgres from 'postgres';
import { Connector } from '..';
import { WorkerConfig } from '../../config';
import { DestinationEvent } from '../../schema/event';
import { FanOutResult } from '../../writer';
import { Field, schema } from '../../schema/databases';
import {
  DestinationType,
  PostgresConfig,
  PostgresDestination,
} from '@evefan/evefan-config';

const DESTINATION_TYPE = 'postgres';
const TABLE_NAME = 'events';

const TYPE_MAP: { [key: string]: string } = {
  string: 'TEXT',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMPTZ',
  json: 'JSONB',
  float: 'DOUBLE PRECISION',
};

function clientByConfig(config: PostgresConfig) {
  const credentials = config._secret_credentials;
  return postgres({
    user: credentials.user,
    password: credentials.password,
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    onnotice: () => {}, // This will ignore all notices
  });
}

async function createTableIfNotExists(sql: postgres.Sql, fields: Field[]) {
  const columnDefinitions = fields
    .map((f) =>
      f.name === 'id'
        ? `"${f.name}" ${TYPE_MAP[f.type] || f.type} PRIMARY KEY`
        : `"${f.name}" ${TYPE_MAP[f.type] || f.type}`
    )
    .join(', ');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
      ${columnDefinitions}
    )
  `);

  console.log(
    `${DESTINATION_TYPE}: table ${TABLE_NAME} created or already exists.`
  );
}

async function writeEvents(
  config: PostgresConfig,
  events: DestinationEvent[]
): Promise<any[]> {
  const sql = clientByConfig(config);

  try {
    await createTableIfNotExists(sql, schema.fields);

    const columns = schema.fields.map((f) => f.name);
    const placeholders = schema.fields.map((_, i) => `$${i + 1}`).join(', ');

    const values = events.flatMap((event) =>
      schema.fields.map((field) => {
        let value = field.path
          ? event[field.path as keyof DestinationEvent]
          : field.transform
          ? field.transform(event)
          : null;

        // Handle undefined values
        if (value === undefined) {
          value = null;
        }
        return value;
      })
    );

    const query = `
      INSERT INTO "${TABLE_NAME}" (${columns.map((c) => `"${c}"`).join(', ')})
      VALUES (${placeholders})
    `;

    const result = await sql.unsafe(query, values);

    console.log(
      `${DESTINATION_TYPE}: ${result.count} event(s) written to ${TABLE_NAME} table.`
    );

    return result;
  } catch (error) {
    console.error(
      `${DESTINATION_TYPE}: failed to write events to ${TABLE_NAME} table:`,
      error
    );
    throw error;
  } finally {
    await sql.end();
  }
}

export default class PostgresConnector implements Connector {
  async write(
    config: WorkerConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
  ): Promise<FanOutResult> {
    const destination = config.destinations.find(
      (d) => d.type === DESTINATION_TYPE
    ) as PostgresDestination;

    if (!destination) {
      console.error(`Destination ${DESTINATION_TYPE} not found in config`);
      return {
        destinationType: DESTINATION_TYPE,
        failedEvents: events.map((body) => ({
          error: 'Destination config not found',
          body,
        })),
      };
    }

    console.log(`${DESTINATION_TYPE}: sending ${events.length} event(s)`);

    try {
      await writeEvents(destination.config, events);
      return {
        destinationType: DESTINATION_TYPE,
        failedEvents: [],
      };
    } catch (error: any) {
      return {
        destinationType: DESTINATION_TYPE,
        failedEvents: events.map((event) => ({
          error: error.message,
          body: event,
        })),
      };
    }
  }
}
