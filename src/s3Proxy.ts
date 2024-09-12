import { Context } from 'hono';
import { WorkerEnv } from './routes';
import { S3DeltaConfig } from '@evefan/evefan-config';
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import initWasm, {
  transformParquetStream,
} from './lib/parquet-wasm/parquet_wasm';
import binary from './lib/parquet-wasm/parquet_wasm_bg.wasm';
import { ParquetFile } from './lib/parquet-wasm/parquet_wasm';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { XMLBuilder } from 'fast-xml-parser';

function debugTempLog(...message: any) {
  // TODO: remove this when we have a logger and proper dev/prod flag
  console.debug(message);
}

export async function handleS3ProxyRequest(
  c: Context<WorkerEnv>,
  method: 'GET' | 'HEAD' | 'LIST'
) {
  debugTempLog(`S3 Proxy Request: Method=${method}, Path=${c.req.path}`);
  const config = c.get('config');

  const writeKey = c.req.header('X-Amz-Security-Token');
  if (!writeKey || !config.sources.some((s) => s.writeKey === writeKey)) {
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const s3Config = config.destinations.find((d) => d.type === 's3delta')
    ?.config as S3DeltaConfig;

  if (!s3Config) {
    return c.json({ error: 'S3 configuration not found' }, { status: 404 });
  }

  let key = c.req.path.replace(`/v1/s3/evefan/`, '');

  if (key.length === 0 && c.req.query('prefix')) {
    key = c.req.query('prefix') || '';
  }

  if (method !== 'LIST' && !key.endsWith('.parquet')) {
    return c.json(
      { error: 'Only Parquet files are supported' },
      { status: 400 }
    );
  }

  const s3Client = new S3Client({
    endpoint: s3Config.url.includes('cloudflarestorage')
      ? s3Config.url
      : undefined,
    credentials: {
      accessKeyId: s3Config._secret_credentials.accessKeyId,
      secretAccessKey: s3Config._secret_credentials.secretAccessKey,
    },
    region:
      s3Config.url.includes('cloudflarestorage') ||
      s3Config.url.includes('localhost')
        ? 'auto'
        : s3Config.url.split('.')[2],
  });

  try {
    switch (method) {
      case 'LIST':
        debugTempLog(`Handling LIST request for key: ${key}`);
        return await handleListRequest(c, s3Client, s3Config, key, writeKey);

      case 'HEAD':
        debugTempLog(`Handling HEAD request for key: ${key}`);
        return await handleHeadRequest(c, s3Client, s3Config, key);

      case 'GET':
        debugTempLog(`Handling GET request for key: ${key}`);
        return await handleGetRequest(c, s3Client, s3Config, key);

      default:
        return c.json({ error: 'Unsupported method' }, { status: 405 });
    }
  } catch (e) {
    console.error(`Error in handling S3 ${method} request: `, e);
    return c.json({ error: 'Error in handling S3 request' }, { status: 500 });
  }
}

async function handleGetRequest(
  c: Context<WorkerEnv>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string
) {
  if (key.includes('virtual_')) {
    debugTempLog(`Handling virtual merged file fetch for key: ${key}`);
    return await handleVirtualMergedFileFetch(c, key, s3Client, s3Config);
  }

  const getCommand = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });
  const presignedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 60,
  });

  debugTempLog(`Fetching GET from presigned URL: ${presignedUrl}`);
  const response = await fetch(presignedUrl);

  if (!response.ok) {
    return c.json(
      { error: 'Error fetching object' },
      { status: response.status }
    );
  }

  return new Response(response.body, {
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key}"`,
    },
  });
}

async function handleHeadRequest(
  c: Context<WorkerEnv>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string
) {
  if (key.includes('virtual_')) {
    const { startTime, endTime, size } =
      extractTimeRangeFromMergedFileName(key);

    debugTempLog(`Head request for virtual merged file: ${key}`);

    // Ensure we're using a valid date format
    const lastModified = new Date(parseInt(endTime)).toUTCString();

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Length': size.toString(),
        'Content-Type': 'application/octet-stream',
        'Last-Modified': lastModified,
        ETag: `"${key}"`, // Using the key as a simple ETag for virtual files
      },
    });
  }

  const headCommand = new HeadObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });
  const presignedUrl = await getSignedUrl(s3Client, headCommand, {
    expiresIn: 60,
  });

  debugTempLog(`Fetching HEAD from presigned URL: ${presignedUrl}`);
  const response = await fetch(presignedUrl, { method: 'HEAD' });

  if (!response.ok) {
    return c.json(
      { error: 'Error fetching object metadata' },
      { status: response.status }
    );
  }

  return new Response(null, {
    status: 200,
    headers: {
      'Content-Length': response.headers.get('Content-Length') || '0',
      'Content-Type':
        response.headers.get('Content-Type') || 'application/octet-stream',
      'Last-Modified': response.headers.get('Last-Modified') || '',
      ETag: response.headers.get('ETag') || '',
    },
  });
}

async function handleVirtualMergedFileFetch(
  c: Context<WorkerEnv>,
  key: string,
  s3Client: S3Client,
  s3Config: S3DeltaConfig
) {
  debugTempLog(`[handleVirtualMergedFileFetch] Starting for key: ${key}`);
  const { startTime, endTime, size } = extractTimeRangeFromMergedFileName(key);
  debugTempLog(
    `[handleVirtualMergedFileFetch] Extracted time range: startTime=${startTime}, endTime=${endTime}, size=${size}`
  );

  debugTempLog(`[handleVirtualMergedFileFetch] Fetching files in time range`);
  const filesToMerge = await getFilesInTimeRange(
    s3Client,
    s3Config,
    startTime,
    endTime
  );
  debugTempLog(
    `[handleVirtualMergedFileFetch] Files to merge: ${filesToMerge.length}`
  );
  filesToMerge.forEach((file, index) => {
    debugTempLog(
      `[handleVirtualMergedFileFetch] File ${index + 1}: Key=${
        file.Key
      }, Size=${file.Size}`
    );
  });

  debugTempLog(`[handleVirtualMergedFileFetch] Initializing WASM`);
  await initWasm(binary);

  debugTempLog(`[handleVirtualMergedFileFetch] Generating presigned URLs`);
  const presignedUrls = await Promise.all(
    filesToMerge.map(async (file) => {
      const command = new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: file.Key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 60 });
    })
  );
  debugTempLog(
    `[handleVirtualMergedFileFetch] Generated ${presignedUrls.length} presigned URLs`
  );

  debugTempLog(`[handleVirtualMergedFileFetch] Creating file streams`);
  const fileStreams = await Promise.all(
    presignedUrls.map(async (url, index) => {
      debugTempLog(`[handleVirtualMergedFileFetch] Fetching file ${index + 1}`);
      const response = await fetch(url);
      debugTempLog(
        `[handleVirtualMergedFileFetch] File ${index + 1} fetched, status: ${
          response.status
        }`
      );
      const blob = await response.blob();
      debugTempLog(
        `[handleVirtualMergedFileFetch] File ${index + 1} blob created, size: ${
          blob.size
        }`
      );
      const fileInstance = await ParquetFile.fromFile(blob);
      debugTempLog(
        `[handleVirtualMergedFileFetch] File ${
          index + 1
        } ParquetFile instance created`
      );
      return fileInstance.stream();
    })
  );
  debugTempLog(
    `[handleVirtualMergedFileFetch] Created ${fileStreams.length} file streams`
  );

  debugTempLog(`[handleVirtualMergedFileFetch] Combining streams`);
  const combinedStream = new ReadableStream({
    async start(controller) {
      for (const [index, stream] of fileStreams.entries()) {
        debugTempLog(
          `[handleVirtualMergedFileFetch] Processing stream ${index + 1}`
        );
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            debugTempLog(
              `[handleVirtualMergedFileFetch] Stream ${
                index + 1
              } processing complete`
            );
            break;
          }
          controller.enqueue(value);
        }
      }
      controller.close();
      debugTempLog(
        `[handleVirtualMergedFileFetch] All streams combined and closed`
      );
    },
  });

  debugTempLog(
    `[handleVirtualMergedFileFetch] Transforming combined stream to Parquet byte stream`
  );
  const parquetByteStream = await transformParquetStream(combinedStream);

  debugTempLog(`[handleVirtualMergedFileFetch] Teeing the stream`);
  const [responseStream, uploadStream] = parquetByteStream.tee();

  debugTempLog(
    `[handleVirtualMergedFileFetch] Starting async task to merge and upload file: ${key}`
  );
  c.executionCtx.waitUntil(
    mergeAndUploadFile(s3Client, s3Config, key, filesToMerge, uploadStream)
  );

  debugTempLog(`[handleVirtualMergedFileFetch] Returning response stream`);
  return new Response(responseStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key}"`,
    },
  });
}

import { Readable } from 'stream';

async function mergeAndUploadFile(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  filesToMerge: any[],
  parquetByteStream: ReadableStream
) {
  try {
    debugTempLog(`Merging and uploading file: ${key}`);

    // Wrap the stream in a Web-standard ReadableStream
    const webReadableStream = new ReadableStream({
      async start(controller) {
        const reader = parquetByteStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    // Create a new Upload object
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: s3Config.bucket,
        Key: key.replace('virtual_', ''),
        Body: webReadableStream,
      },
    });

    // Start the upload
    debugTempLog(
      `Starting upload for bucket: ${s3Config.bucket}, key: ${key.replace(
        'virtual_',
        ''
      )}`
    );
    await upload.done();
    debugTempLog(`Merged file uploaded: ${key.replace('virtual_', '')}`);

    // Delete the original files
    for (const file of filesToMerge) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: file.Key,
      });
      debugTempLog(
        `Sending DeleteObjectCommand for bucket: ${s3Config.bucket}, key: ${file.Key}`
      );
      await s3Client.send(deleteCommand);
      debugTempLog(`Deleted original file: ${file.Key}`);
    }

    debugTempLog(`Merged file uploaded and original files deleted: ${key}`);
  } catch (error) {
    console.error('Error in merging and uploading file:', error);
    throw error;
  }
}

async function getFilesInTimeRange(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  startTime: string,
  endTime: string
) {
  debugTempLog(`Getting files in time range: ${startTime} - ${endTime}`);

  // Convert millisecond timestamps to Date objects
  const startDate = new Date(parseInt(startTime));
  const endDate = new Date(parseInt(endTime));

  // Format the date for the prefix
  const year = startDate.getUTCFullYear();
  const month = (startDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = startDate.getUTCDate().toString().padStart(2, '0');
  const prefix = `year=${year}/month=${month}/day=${day}/`;

  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: prefix,
  });
  debugTempLog(
    `Sending ListObjectsV2Command for bucket: ${s3Config.bucket}, prefix: ${prefix}`
  );
  const response = await s3Client.send(command);
  debugTempLog(`ListObjectsV2Command response:`, response);
  const allFiles = response.Contents || [];

  const filteredFiles = allFiles.filter((file) => {
    const fileTimestamp = file.Key?.split('/').pop()?.split('.')[0];
    if (fileTimestamp) {
      const fileDate = new Date(parseInt(fileTimestamp));
      return fileDate >= startDate && fileDate <= endDate;
    }
    return false;
  });
  debugTempLog(`Filtered files:`, filteredFiles);
  return filteredFiles;
}

function extractTimeRangeFromMergedFileName(key: string): {
  startTime: string;
  endTime: string;
  size: number;
} {
  const parts = key.split('/');
  const fileName = parts[parts.length - 1];
  const [, size, startTime, endTime] = fileName.split('_');
  return {
    startTime,
    endTime: endTime.replace('.parquet', ''),
    size: parseInt(size, 10),
  };
}

async function handleListRequest(
  c: Context<WorkerEnv, any, {}>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  writeKey: string
) {
  debugTempLog(`Handling LIST request for key: ${key}`);
  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: key,
  });
  debugTempLog(
    `Sending ListObjectsV2Command for bucket: ${s3Config.bucket}, prefix: ${key}`
  );
  const response = await s3Client.send(command);
  debugTempLog(`ListObjectsV2Command response:`, JSON.stringify(response));
  const files = response.Contents || [];

  const filesByDay = groupFilesByDay(
    files.filter((f) => f.Key?.endsWith('.parquet'))
  );

  const virtualMergedFiles = constructVirtualMergedFiles(filesByDay);
  debugTempLog(`Virtual merged files:`, virtualMergedFiles);

  // Sort all files by their key (which includes the timestamp)
  virtualMergedFiles.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));

  const acceptHeader = c.req.header('Accept');
  if (acceptHeader && acceptHeader.includes('application/json')) {
    return c.json({
      ...response,
      Contents: virtualMergedFiles,
    });
  } else {
    const xmlResponse = generateXMLResponse(response, virtualMergedFiles);
    return new Response(xmlResponse, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}

function generateXMLResponse(response: any, virtualMergedFiles: any[]): string {
  const xmlObj = {
    ListBucketResult: {
      '@xmlns': 'http://s3.amazonaws.com/doc/2006-03-01/',
      Name: response.Name,
      Prefix: response.Prefix,
      KeyCount: virtualMergedFiles.length,
      MaxKeys: response.MaxKeys,
      IsTruncated: response.IsTruncated,
      Contents: virtualMergedFiles.map((file) => ({
        Key: file.Key,
        LastModified: file.LastModified,
        ETag: file.ETag,
        Size: file.Size,
        StorageClass: file.StorageClass,
      })),
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });
  return builder.build(xmlObj);
}

function groupFilesByDay(files: any[]): Record<string, any[]> {
  return files.reduce((acc, file) => {
    const day = file.Key?.split('/').slice(0, 3).join('/'); // Assumes year=YYYY/m=MM/d=DD structure
    if (day) {
      acc[day] = acc[day] || [];
      acc[day].push(file);
    }
    return acc;
  }, {});
}

function constructVirtualMergedFiles(filesByDay: Record<string, any[]>): any[] {
  const virtualFiles = [];
  const MERGE_THRESHOLD = 5; // Number of files to trigger a merge
  const TARGET_FILE_SIZE = 220 * 1024 * 1024; // Target file size (220MB)

  for (const [day, files] of Object.entries(filesByDay)) {
    let currentSize = 0;
    let currentFiles = [];
    let virtualFileCounter = 1;

    for (const file of files) {
      currentFiles.push(file);
      currentSize += file.Size || 0;

      if (
        currentFiles.length >= MERGE_THRESHOLD ||
        currentSize >= TARGET_FILE_SIZE
      ) {
        const firstFile = currentFiles[0];
        const lastFile = currentFiles[currentFiles.length - 1];
        const firstTimestamp = firstFile.Key?.split('/').pop()?.split('.')[0];
        const lastTimestamp = lastFile.Key?.split('/').pop()?.split('.')[0];
        const virtualKey = `${day}/virtual_${currentSize}_${firstTimestamp}_${lastTimestamp}.parquet`;

        virtualFiles.push({
          Key: virtualKey,
          Size: currentSize,
          LastModified: lastFile.LastModified,
          ETag: lastFile.ETag,
          StorageClass: lastFile.StorageClass,
        });
        currentFiles = [];
        currentSize = 0;
        virtualFileCounter++;
      }
    }

    // Handle any remaining files
    if (currentFiles.length > 1) {
      const firstFile = currentFiles[0];
      const lastFile = currentFiles[currentFiles.length - 1];
      const firstTimestamp = firstFile.Key?.split('/').pop()?.split('.')[0];
      const lastTimestamp = lastFile.Key?.split('/').pop()?.split('.')[0];
      const virtualKey = `${day}/virtual_${currentSize}_${firstTimestamp}_${lastTimestamp}.parquet`;

      virtualFiles.push({
        Key: virtualKey,
        Size: currentSize,
        LastModified: lastFile.LastModified,
        ETag: lastFile.ETag,
        StorageClass: lastFile.StorageClass,
      });
    }
  }

  return virtualFiles;
}
