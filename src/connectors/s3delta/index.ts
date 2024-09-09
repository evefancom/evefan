import { Connector } from '..';
import { WorkerConfig } from '../../config';
import { DestinationEvent } from '../../schema/event';
import { FanOutResult } from '../../writer';
import { DestinationType, S3DeltaConfig } from '@evefan/evefan-config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { formatEventForDatabases } from '../../schema/databases';
import initWasm, {
  Compression,
  Table,
  writeParquet,
  WriterPropertiesBuilder,
} from './../../lib/parquet-wasm';
import binary from './../../lib/parquet-wasm/parquet_wasm_bg.wasm';
import * as arrow from 'apache-arrow';

export default class S3DeltaConnector implements Connector {
  private client: S3Client | null = null;

  constructor() {
    this.write = this.write.bind(this);
    this.initializeClient = this.initializeClient.bind(this);
    this.writeEvents = this.writeEvents.bind(this);
  }

  async write(
    config: WorkerConfig,
    events: DestinationEvent[],
    destinationType: DestinationType
  ): Promise<FanOutResult> {
    const s3Config = config.destinations.find((d: any) => d.type === 's3delta')
      ?.config as S3DeltaConfig;

    if (!s3Config) {
      return {
        destinationType,
        failedEvents: events.map((e) => ({
          body: e,
          error: 'S3 configuration not found',
        })),
      };
    }

    try {
      await initWasm(binary);
      this.initializeClient(s3Config);
      await this.writeEvents(s3Config, events);
      return { destinationType, failedEvents: [] };
    } catch (error) {
      console.error('Error writing to S3:', error);
      return {
        destinationType,
        failedEvents: events.map((e) => ({
          body: e,
          error: `Failed to write to S3: ${error}`,
        })),
      };
    }
  }

  private initializeClient(config: S3DeltaConfig): void {
    this.client = new S3Client({
      endpoint: config.url,
      credentials: {
        accessKeyId: config._secret_credentials.accessKeyId,
        secretAccessKey: config._secret_credentials.secretAccessKey,
      },
      region:
        config.url.includes('cloudflarestorage') ||
        config.url.includes('localhost')
          ? 'auto'
          : config.url.split('.')[2],
    });
  }

  private createArrowTable(events: DestinationEvent[]): arrow.Table {
    // Create string representations for all fields
    const formatted = events.map(formatEventForDatabases);
    const data = {
      id: formatted.map((e) => e.id ?? ''),
      type: formatted.map((e) => e.type ?? ''),
      timestamp: formatted.map((e) => e.timestamp ?? new Date().toISOString()),
      properties: formatted.map((e) => JSON.stringify(e.properties)),
      metadata: formatted.map((e) => JSON.stringify(e.metadata)),
      context: formatted.map((e) => JSON.stringify(e.context)),
      user_id: formatted.map((e) => e.user_id ?? ''),
      anonymous_id: formatted.map((e) => e.anonymous_id ?? ''),
      external_id: formatted.map((e) => e.external_id ?? ''),
      value: formatted.map((e) => (e.value > 0 ? e.value : 0)),
      partition_key: formatted.map((e) => e.partition_key ?? ''),
      extra_fields: formatted.map((e) => JSON.stringify(e.extra_fields)),
    };

    // Create the table with the defined schema and data
    return arrow.tableFromArrays(data);
  }
  private async writeEvents(
    config: S3DeltaConfig,
    events: DestinationEvent[]
  ): Promise<void> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const timestamp = now.getTime();

    const filePath = `y=${year}/m=${month}/d=${day}/${timestamp}.parquet`;
    // Create an Arrow table using the new function
    const table = this.createArrowTable(events);

    // Convert Arrow table to Wasm table
    const wasmTable = Table.fromIPCStream(arrow.tableToIPC(table, 'stream'));

    // Set up writer properties
    const writerProperties = new WriterPropertiesBuilder()
      .setCompression(Compression.SNAPPY)
      .build();

    // Write Parquet data
    const parquetUint8Array = writeParquet(wasmTable, writerProperties);

    // Upload to S3
    const outputParams = {
      Bucket: config.bucket,
      Key: filePath,
      Body: parquetUint8Array,
      ContentType: 'application/octet-stream',
    };
    const outputCommand = new PutObjectCommand(outputParams);
    await this.client!.send(outputCommand);

    console.log(`S3 Delta: ${events.length} event(s) written to ${filePath}`);
  }
}
