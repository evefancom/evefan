import { getTokenFromGCPServiceAccount } from '@sagi.io/workers-jwt';
import { Connector } from '..';
import { GatewayConfig } from '../../config';
import { DestinationEvent } from '../../schema/event';
import { propertyWithPath } from '../../utils';
import { FanOutResult } from '../../writer';
import { Field, schema } from '../../schema/databases';
import {
  BigqueryConfig,
  BigqueryDestination,
  DestinationType,
} from '@evefan/evefan-config';

const DESTINATION_TYPE = 'bigquery';
const DATASET_NAME = 'evefan';
const TABLE_NAME = 'events';

const TYPE_MAP = {
  string: 'STRING',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  json: 'JSON',
  float: 'FLOAT',
};

type IErrorProto = {
  debugInfo?: string;
  location?: string;
  message?: string;
  reason?: string;
};

type IError = {
  code: number;
  message: string;
  errors: Array<IErrorProto>;
  status: string;
};

type ITableInsertResponse = {
  kind?: string;
  error?: IError;
};

type ITableDataInsertAllResponse = {
  insertErrors?: Array<{
    errors: Array<IErrorProto>;
    index: number;
  }>;
  kind?: string;
  error?: IError;
};

async function createTable(config: BigqueryConfig, fields: Field[]) {
  const aud = 'https://bigquery.googleapis.com/';
  const projectName = config._secret_credentials.project_id;
  const payload = {
    kind: 'bigquery#table',
    tableReference: {
      datasetId: DATASET_NAME,
      projectId: projectName,
      tableId: TABLE_NAME,
    },
    schema: {
      fields: fields.map((f) => ({
        name: f.name,
        type: TYPE_MAP[f.type],
      })),
    },
  };

  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectName}/datasets/${DATASET_NAME}/tables`;

  const token = await getTokenFromGCPServiceAccount({
    serviceAccountJSON: config._secret_credentials,
    aud,
  });

  const response = (await (
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        Authorization: 'Bearer ' + token,
      },
    })
  ).json()) as ITableInsertResponse;

  if (response?.error?.code === 409) {
    return;
  }

  if (response?.error && response.error?.code !== 409) {
    console.error(`Failed to create table ${TABLE_NAME}:`, response?.error);
    throw new Error(response.error?.message);
  }

  console.log(`${DESTINATION_TYPE}: table ${TABLE_NAME} created successfully.`);
}

async function writeEvents(config: BigqueryConfig, events: DestinationEvent[]) {
  const aud = 'https://bigquery.googleapis.com/';

  try {
    await createTable(config, schema.fields);
  } catch (e: any) {
    return events.map((event) => ({
      error: e.message,
      body: event,
    }));
  }

  const projectName = config._secret_credentials.project_id;

  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectName}/datasets/${DATASET_NAME}/tables/${TABLE_NAME}/insertAll`;

  const token = await getTokenFromGCPServiceAccount({
    serviceAccountJSON: config._secret_credentials,
    aud,
  });

  const row = (e: DestinationEvent) => {
    return schema.fields.reduce((r, field) => {
      r[field.name] = field.path
        ? propertyWithPath(e, field.path)
        : field.transform
        ? field.transform(e)
        : null;

      if (field.type === 'json') {
        r[field.name] = JSON.stringify(r[field.name]);
      }

      return r;
    }, {} as Record<string, any>);
  };

  const payload = {
    rows: events.map((e) => ({
      insertId: e.messageId,
      json: row(e),
    })),
  };

  const failedEvents = [];
  const response = (await (
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        Authorization: 'Bearer ' + token,
      },
    })
  ).json()) as ITableDataInsertAllResponse;

  if (response.insertErrors && response.insertErrors.length > 0) {
    const errStr = response.insertErrors
      .map((error) => {
        console.error(error);
        return JSON.stringify(error);
      })
      .join('\n');
    console.error(errStr);
    response.insertErrors.map(({ errors, index }) => {
      failedEvents.push({ error: errors.join('\n'), body: events[index] });
    });
  }
  if (response.error) {
    console.error(response.error);
    failedEvents.push(
      ...events.map((e) => ({
        error: response.error!.errors.join('\n'),
        body: e,
      }))
    );
  }

  console.log(
    `${DESTINATION_TYPE}: ${
      events.length - failedEvents.length
    } event(s) written to ${TABLE_NAME} table.`
  );

  return failedEvents;
}

export default class BigqueryConnector implements Connector {
  async write(
    config: GatewayConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
  ): Promise<FanOutResult> {
    const destination = config.destinations.find(
      (d) => d.type === DESTINATION_TYPE
    ) as BigqueryDestination;

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

    const failedEvents = await writeEvents(destination.config, events);

    return {
      destinationType: DESTINATION_TYPE,
      failedEvents,
    };
  }
}
