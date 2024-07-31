import { getTokenFromGCPServiceAccount } from "@sagi.io/workers-jwt";
import { Connector } from "..";
import { WorkerConfig } from "../../config";
import { DestinationEvent, EventType } from "../../event";
import { propertyWithPath } from "../../utils";
import { FanOutResult } from "../../writer";
import { Field, schema } from "../../schema";
import { BigqueryDestination } from "@evefan/evefan-config";

const DESTINATION_TYPE = "bigquery";

const DATASET_NAME = "evefan";

const TABLE_MAP = {
  alias: "aliases",
  track: "tracks",
  page: "pages",
  screen: "screens",
  identify: "identifies",
  group: "groups",
};

const TYPE_MAP = {
  string: "STRING",
  boolean: "BOOLEAN",
  timestamp: "TIMESTAMP",
  json: "JSON",
};

type IErrorProto = {
  /**
   * Debugging information. This property is internal to Google and should not be used.
   */
  debugInfo?: string;
  /**
   * Specifies where the error occurred, if present.
   */
  location?: string;
  /**
   * A human-readable description of the error.
   */
  message?: string;
  /**
   * A short error code that summarizes the error.
   */
  reason?: string;
};

/**
 * An error describing why the request failed.
 **/
type IError = {
  /**
   * HTTP error code indicating the nature of the error.
   */
  code: number;

  /**
   * A description of the error.
   */
  message: string;

  /**
   * A list of errors which occurred during the request.
   */
  errors: Array<IErrorProto>;

  /**
   * The human-readable status of the response.
   */
  status: string;
};

type ITableInsertResponse = {
  /**
   * The resource type of the response.
   */
  kind?: string;

  /**
   * An error describing why the request failed.
   */
  error?: IError;
};

type ITableDataInsertAllResponse = {
  /**
   * An array of errors for rows that were not inserted.
   */
  insertErrors?: Array<{
    /**
     * Error information for the row indicated by the index property.
     */
    errors: Array<IErrorProto>;
    /**
     * The index of the row that error applies to.
     */
    index: number;
  }>;
  /**
   * The resource type of the response.
   */
  kind?: string;

  /**
   * An error describing why the request failed.
   */
  error?: IError;
};

/**
 * Create a new table in BigQuery if it doesn't exist
 * @param config - The configuration object
 * @param name - The name of the table to create
 * @param fields - The fields of the table
 */
async function createTable(
  config: BigqueryDestination,
  name: string,
  fields: Field[]
) {
  const aud = "https://bigquery.googleapis.com/";

  const projectName = config.config._secret_credentials.project_id;
  const payload = {
    kind: "bigquery#table",
    tableReference: {
      datasetId: DATASET_NAME,
      projectId: projectName,
      tableId: name,
    },
    schema: {
      fields: fields.map((f) => ({
        name: f.name,
        type: TYPE_MAP[f.type],
      })),
    },
  };

  const url =
    "https://bigquery.googleapis.com/bigquery/v2/projects/" +
    projectName +
    "/datasets/" +
    DATASET_NAME +
    "/tables";

  const token = await getTokenFromGCPServiceAccount({
    serviceAccountJSON: config.config._secret_credentials,
    aud,
  });

  const response = (await (
    await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json;charset=UTF-8",
        Authorization: "Bearer " + token,
      },
    })
  ).json()) as ITableInsertResponse;

  if (response?.error?.code === 409) {
    return;
  }

  // If table already exists, ignore the error
  // otherwise throw an error
  if (response?.error && response.error?.code !== 409) {
    console.error(`Failed to create table ${name}:`, response?.error);
    throw new Error(response.error?.message);
  }

  console.log(`${DESTINATION_TYPE}: table ${name} created successfully.`);
}

/**
 * Write events to BigQuery
 * @param config - The configuration object
 * @param type - The type of the event
 * @param events - The events to write. All events must be of the same type
 */
async function writeEvents(
  config: BigqueryDestination,
  type: EventType,
  events: DestinationEvent[]
) {
  const aud = "https://bigquery.googleapis.com/";

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

  const projectName = config.config._secret_credentials.project_id;

  const url =
    "https://bigquery.googleapis.com/bigquery/v2/projects/" +
    projectName +
    "/datasets/" +
    DATASET_NAME +
    "/tables/" +
    TABLE_MAP[type] +
    "/insertAll";

  const token = await getTokenFromGCPServiceAccount({
    serviceAccountJSON: config.config._secret_credentials,
    aud,
  });

  const row = (e: DestinationEvent) => {
    return schema[type].fields.reduce((r, field) => {
      r[field.name] = field.path
        ? propertyWithPath(e, field.path)
        : field.transform
        ? field.transform(e)
        : null;

      // BigQuery requires JSON fields to be stringified before sending
      if (field.type === "json") {
        r[field.name] = JSON.stringify(r[field.name]);
      }

      return r;
    }, {} as Record<string, any>);
  };

  const payload = {
    rows: events.map((e) => ({
      insertId: e.messageId,
      json: {
        ...row(e),
      },
    })),
  };

  const failedEvents = [];
  const response = (await (
    await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json;charset=UTF-8",
        Authorization: "Bearer " + token,
      },
    })
  ).json()) as ITableDataInsertAllResponse;

  if (response.insertErrors && response.insertErrors.length > 0) {
    const errStr = response.insertErrors
      .map((error) => {
        console.error(error);
        return JSON.stringify(error);
      })
      .join("\n");
    console.error(errStr);
    response.insertErrors.map(({ errors, index }) => {
      failedEvents.push({ error: errors.join("\n"), body: events[index] });
    });
  }
  if (response.error) {
    console.error(response.error);
    failedEvents.push(
      ...events.map((e) => ({
        error: response.error!.errors.join("\n"),
        body: e,
      }))
    );
  }

  console.log(
    `${DESTINATION_TYPE}: ${
      events.length - failedEvents.length
    } event(s) written to ${TABLE_MAP[type]} table.`
  );

  return failedEvents;
}

export default class BigqueryConnector implements Connector {
  async write(
    config: WorkerConfig,
    events: DestinationEvent[]
  ): Promise<FanOutResult> {
    const destinationConfig = config.destinations.find(
      (d) => d.type === DESTINATION_TYPE
    ) as BigqueryDestination;

    if (!destinationConfig) {
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

    // Write events to BigQuery
    const failedEvents = (
      await Promise.all(
        eventTypes.map(async (type) => {
          return await writeEvents(destinationConfig, type, eventsByType[type]);
        })
      )
    ).flatMap((e) => e);

    return {
      destinationType: DESTINATION_TYPE,
      failedEvents,
    };
  }
}
