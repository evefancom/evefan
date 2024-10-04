import {
  _Object,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
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

type HiveClient = S3Client | R2Bucket;

interface ExtendedR2Object extends R2Object {
  Key: string;
}

type HiveListResponse = [any, ExtendedR2Object[] | _Object[]];

export class S3HiveClient {
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

      this.client = new S3Client(clientConfig);
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

    resultFiles = resultFiles
      .filter((f) => {
        return f.Key?.endsWith('.parquet') && !f.Key?.includes('virtual_');
      })
      .sort((a, b) => {
        const aKey = a.Key?.split('/');
        const bKey = b.Key?.split('/');
        if (aKey && bKey) {
          // Compare year
          if (aKey[0] !== bKey[0]) return aKey[0].localeCompare(bKey[0]);
          // Compare month
          if (aKey[1] !== bKey[1]) return aKey[1].localeCompare(bKey[1]);
          // Compare day
          if (aKey[2] !== bKey[2]) return aKey[2].localeCompare(bKey[2]);
          // Compare timestamp
          return aKey[3].localeCompare(bKey[3]);
        }
        return 0;
      });

    return [originalResult, resultFiles];
  }

  // async head(key: string): Promise<Object[]> {
  //   const headCommand = new HeadObjectCommand({
  //     Bucket: this.config.bucket,
  //     Key: key,
  //   });
  //   let presignedUrl = await getSignedUrl(this.client, headCommand, {
  //     expiresIn: 60,
  //   });

  //   let response = await fetch(presignedUrl, { method: 'HEAD' });
  // }
}
