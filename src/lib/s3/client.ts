import {
  _Object,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client as AwsS3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3HiveConfig } from '@evefan/evefan-config';

import { Context } from 'hono';

import { WorkerEnv } from '../../routes';

const getHeadResponseHeaders = (response: Response) => {
  return {
    'Content-Length': response.headers.get('Content-Length') || '0',
    'Content-Type':
      response.headers.get('Content-Type') || 'application/octet-stream',
    'Last-Modified': response.headers.get('Last-Modified') || '',
    ETag: response.headers.get('ETag') || '',
  };
};

export type HiveClient = AwsS3Client | R2Bucket;

export interface ExtendedR2Object extends R2Object {
  Key: string;
}

type HiveListResponse = [any, ExtendedR2Object[] | _Object[]];

export class S3Client {
  private client: HiveClient;
  private config: S3HiveConfig;

  constructor(c: Context<WorkerEnv>, config: S3HiveConfig) {
    this.config = config;

    if (config.provider !== 'cloudflare') {
      const clientConfig: S3ClientConfig = {
        endpoint: config.url,
        region:
          config.url.includes('cloudflarestorage') ||
          config.url.includes('localhost')
            ? 'auto'
            : config.url.split('.')[2],
      };

      if (
        config._secret_credentials?.accessKeyId &&
        config._secret_credentials?.secretAccessKey
      ) {
        clientConfig.credentials = {
          accessKeyId: config._secret_credentials.accessKeyId,
          secretAccessKey: config._secret_credentials.secretAccessKey,
        };
      }

      this.client = new AwsS3Client(clientConfig);
    } else {
      this.client = c.env.S3_HIVE_BUCKET;
    }
  }

  getClient(): HiveClient {
    return this.client;
  }

  async list(key: string): Promise<HiveListResponse> {
    let resultFiles: ExtendedR2Object[] | _Object[];
    let originalResult: R2Objects | ListObjectsV2CommandOutput;
    if (this.client instanceof R2Bucket) {
      originalResult = await this.client.list({
        prefix: key,
      });
      resultFiles = originalResult.objects.map((obj) => ({
        ...obj,
        Key: obj.key,
      }));
    } else {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: key && key.length > 0 ? key : undefined,
      });

      originalResult = await this.client.send(command);
      resultFiles = originalResult.Contents || [];
    }

    return [originalResult, resultFiles];
  }

  async get(
    key: string,
    rangeHeader?: string
  ): Promise<Response | R2ObjectBody | null> {
    let result: Response | R2ObjectBody | null;
    if (this.client instanceof R2Bucket) {
      result = await this.client.get(key, { range: rangeHeader });
    } else {
      const getCommand = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Range: rangeHeader,
      });
      const presignedUrl = await getSignedUrl(this.client, getCommand, {
        expiresIn: 60,
      });

      const headers: HeadersInit = {};
      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }
      result = await fetch(presignedUrl, { headers });
    }

    return result;
  }

  async head(key: string): Promise<Response | R2Object | null> {
    let result: Response | R2Object | null;

    if (this.client instanceof R2Bucket) {
      result = await this.client.head(key);
    } else {
      const headCommand = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      let presignedUrl = await getSignedUrl(this.client, headCommand, {
        expiresIn: 60,
      });

      result = await fetch(presignedUrl, { method: 'HEAD' });
    }

    return result;
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    if (this.client instanceof R2Bucket) {
      await this.client.put(key, body);
    } else {
      const putCommand = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
      });

      try {
        await this.client.send(putCommand);
      } catch (error) {
        throw error;
      }
    }
  }
}
