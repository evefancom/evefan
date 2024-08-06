import postgres, { PostgresError } from "postgres";
import { Connector } from "..";
import { WorkerConfig } from "../../config";
import { DestinationEvent, EventType } from "../../event";
import { propertyWithPath } from "../../utils";
import { FanOutResult } from "../../writer";
import { Field, schema } from "../../schema";
import { PostgresConfig, PostgresDestination } from "@evefan/evefan-config";

const DESTINATION_TYPE = "postgres";

const DUPLICATE_TABLE = "42P07";

const TABLE_MAP = {
  alias: "aliases",
  track: "tracks",
  page: "pages",
  screen: "screens",
  identify: "identifies",
  group: "groups",
};

const TYPE_MAP = {
  string: "text",
  boolean: "boolean",
  timestamp: "timestamptz",
  json: "jsonb",
};

/**
 * Get Postgres client from config
 * @param config - The configuration object
 * @returns The Postgres client
 */
const clientByConfig = (config: PostgresConfig) => {
  const credentials = config._secret_credentials;

  const client = postgres({
    user: credentials.user,
    password: credentials.password,
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    // Ignore notices
    onnotice: () => {},
  });

  return client;
};

/**
 * Create a new table in Postgres if it doesn't exist
 * @param config - The configuration object
 * @param name - The name of the table to create
 * @param fields - The fields of the table
 */
const createTable = async (
  config: PostgresConfig,
  name: string,
  fields: Field[]
) => {
  try {
    const sql = clientByConfig(config);
    const columns = fields.map((f) => `${f.name} ${TYPE_MAP[f.type]}`);
    await sql.unsafe(
      `CREATE TABLE IF NOT EXISTS ${name} (${columns.join(", ")})`
    );
    console.log(`${DESTINATION_TYPE}: table ${name} created successfully.`);
  } catch (e: any) {
    const { code } = e as PostgresError;
    // Duplicate table error can still occur
    // if the table is being created concurrently
    if (code === DUPLICATE_TABLE) {
      console.log(
        `${DESTINATION_TYPE}: table ${name} already exists. Skipping...`
      );
    } else {
      console.error(`${DESTINATION_TYPE}: failed to create table ${name}:`, e);
      throw e;
    }
  }
};

/**
 * Write events to Postgres
 * @param config - The configuration object
 * @param type - The type of the event
 * @param events - The events to write. All events must be of the same type
 */
const writeEvents = async (
  config: PostgresConfig,
  type: EventType,
  events: DestinationEvent[]
) => {
  if (events.filter((e) => e.type !== type).length > 0) {
    throw new Error("All events must be of the same type");
  }

  try {
    // Create table if it doesn't exist
    await createTable(config, TABLE_MAP[type], schema[type].fields);
  } catch (e: any) {
    return events.map((event) => ({
      error: e.message,
      body: event,
    }));
  }

  const row = (e: DestinationEvent) => {
    return schema[type].fields.reduce((r, field) => {
      r[field.name] = field.path
        ? propertyWithPath(e, field.path)
        : field.transform
        ? field.transform(e)
        : null;
      return r;
    }, {} as Record<string, any>);
  };

  const failedEvents = [];

  try {
    const sql = clientByConfig(config);
    await sql`INSERT INTO ${sql(TABLE_MAP[type])} ${sql(events.map(row))}`;
    console.log(
      `${DESTINATION_TYPE}: ${events.length} event(s) written to ${TABLE_MAP[type]} table.`
    );
  } catch (e: any) {
    const { message } = e as PostgresError;
    console.error(
      `${DESTINATION_TYPE}: failed to write events to ${TABLE_MAP[type]} table:`,
      message
    );
    failedEvents.push(
      ...events.map((event) => ({
        error: message,
        body: event,
      }))
    );
  }

  return failedEvents;
};

export default class PostgresConnector implements Connector {
  async write(
    config: WorkerConfig,
    events: DestinationEvent[]
  ): Promise<FanOutResult> {
    const destination = config.destinations.find(
      (d) => d.type === DESTINATION_TYPE
    ) as PostgresDestination;

    if (!destination) {
      console.error(`Destination ${DESTINATION_TYPE} not found in config`);
      return {
        destinationType: DESTINATION_TYPE,
        failedEvents: events.map((body) => ({
          error: "Destination config not found",
          body,
        })),
      };
    }

    console.log(`Fanning ${events.length} to ${DESTINATION_TYPE}`);

    const eventTypes = [...new Set(events.map((e) => e.type))];

    // Group events by type
    const eventsByType = eventTypes.reduce((acc, type) => {
      acc[type] = events.filter((e) => e.type === type);
      return acc;
    }, {} as Record<EventType, DestinationEvent[]>);

    // Write events to Postgres
    const failedEvents = (
      await Promise.all(
        eventTypes.map(async (type) => {
          return await writeEvents(destination.config, type, eventsByType[type]);
        })
      )
    ).flatMap((e) => e);

    return {
      destinationType: DESTINATION_TYPE,
      failedEvents,
    };
  }
}
