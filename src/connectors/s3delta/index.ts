import { Connector } from '..';
import { WorkerConfig } from '../../config';
import { DestinationEvent } from '../../event';
import { FanOutResult } from '../../writer';
import { DestinationType, S3DeltaConfig } from '@evefan/evefan-config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { schema } from '../../persistance/schema';

export default class S3Connector implements Connector {
  private client: S3Client | null = null;

  constructor() {
    // Bind the methods to ensure 'this' context is maintained
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
    const url = new URL(config.url);
    this.client = new S3Client({
      endpoint: config.url,
      region: 'us-east-1', // Set the appropriate region or extract from config
      credentials: {
        accessKeyId: config._secret_credentials.accessKeyId,
        secretAccessKey: config._secret_credentials.secretAccessKey,
      },
    });
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

    const filePath = `y=${year}/m=${month}/d=${day}/${timestamp}.json`;
    const ndjsonData = events
      .map((event) => this.transformEventToNDJSON(event))
      .join('\n');

    await this.writeToS3(config, filePath, ndjsonData);
    console.log(
      `Wrote ${events.length} events to s3://${this.getBucketName(
        config
      )}/${filePath}`
    );
  }

  private transformEventToNDJSON(event: DestinationEvent): string {
    const transformedEvent = schema.fields.reduce((acc, field) => {
      if (field.path) {
        acc[field.name] = this.propertyWithPath(event, field.path);
      } else if (field.transform) {
        acc[field.name] = field.transform(event);
      } else {
        acc[field.name] = null;
      }
      return acc;
    }, {} as Record<string, any>);

    return JSON.stringify(transformedEvent);
  }

  private propertyWithPath(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
      return prev && prev[curr];
    }, obj);
  }

  private async writeToS3(
    config: S3DeltaConfig,
    key: string,
    data: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(config),
      Key: key,
      Body: data,
    });

    try {
      const result = await this.client?.send(command);
      if (!result || !result.ETag) {
        throw new Error('Failed to write to S3');
      }
    } catch (error) {
      console.error('Error writing to S3:', error);
      throw error;
    }
  }

  private getBucketName(config: S3DeltaConfig): string {
    return 'evefan';
  }
}
