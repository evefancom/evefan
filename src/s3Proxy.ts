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
import { PutObjectCommand } from '@aws-sdk/client-s3';
import initWasm, {
  Compression,
  EnabledStatistics,
  transformParquetStream,
  WriterPropertiesBuilder,
  WriterVersion,
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
  key = decodeURIComponent(key); // Unescape the key

  if (key.length === 0 && c.req.query('prefix')) {
    key = decodeURIComponent(c.req.query('prefix') || ''); // Unescape the prefix query parameter
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
  const rangeHeader = c.req.header('range');

  debugTempLog(
    `Received get request for key: ${key} with Range header: ${rangeHeader}`
  );
  const getCommand = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Range: rangeHeader,
  });
  const presignedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 60,
  });

  const headers: HeadersInit = {};
  if (rangeHeader) {
    headers['Range'] = rangeHeader;
  }
  const response = await fetch(presignedUrl, { headers });

  if (!response.ok) {
    debugTempLog('Error fetching object', response.status, response.statusText);
    return c.json(
      { error: 'Error fetching object' },
      { status: response.status }
    );
  }

  const responseHeaders: Record<string, string> = {
    'Content-Type':
      response.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${key}"`,
  };

  if (rangeHeader) {
    if (
      rangeHeader.split('=')[1] !==
      response.headers.get('Content-Range')?.split(' ')[1]?.split('/')[0]
    ) {
      debugTempLog(
        'NO MATCH',
        rangeHeader.split('=')[1],
        response.headers.get('Content-Range')?.split(' ')[1]?.split('/')[0]
      );
    }
    responseHeaders['Content-Range'] =
      response.headers.get('Content-Range') || '';
    responseHeaders['Content-Length'] =
      response.headers.get('Content-Length') || '';
  }

  return new Response(response.body, {
    status: rangeHeader ? 206 : 200,
    headers: responseHeaders,
  });
}

async function handleHeadRequest(
  c: Context<WorkerEnv>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string
) {
  const headCommand = new HeadObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });
  let presignedUrl = await getSignedUrl(s3Client, headCommand, {
    expiresIn: 60,
  });

  let response = await fetch(presignedUrl, { method: 'HEAD' });

  if (response.ok && response.status == 200) {
    return new Response(null, {
      status: response.status,
      headers: {
        'Content-Length': response.headers.get('Content-Length') || '0',
        'Content-Type':
          response.headers.get('Content-Type') || 'application/octet-stream',
        'Last-Modified': response.headers.get('Last-Modified') || '',
        ETag: response.headers.get('ETag') || '',
      },
    });
  }

  if (key.includes('virtual_')) {
    await materializeVirtualFile(c, key, s3Client, s3Config);
    presignedUrl = await getSignedUrl(s3Client, headCommand, {
      expiresIn: 60,
    });

    response = await fetch(presignedUrl, { method: 'HEAD' });
  }
  return new Response(null, {
    status: response.status,
    headers: {
      'Content-Length': response.headers.get('Content-Length') || '0',
      'Content-Type':
        response.headers.get('Content-Type') || 'application/octet-stream',
      'Last-Modified': response.headers.get('Last-Modified') || '',
      ETag: response.headers.get('ETag') || '',
    },
  });
}

async function materializeVirtualFile(
  c: Context<WorkerEnv>,
  key: string,
  s3Client: S3Client,
  s3Config: S3DeltaConfig
) {
  const { startTime, endTime } = extractTimeRangeFromMergedFileName(key);

  try {
    const filesToMerge = await getFilesInTimeRange(
      s3Client,
      s3Config,
      startTime,
      endTime
    );
    debugTempLog(`Files to merge:`, filesToMerge);

    await initWasm(binary);

    // Generate presigned URLs for each file
    const presignedUrls = await Promise.all(
      filesToMerge.map(async (file) => {
        const command = new GetObjectCommand({
          Bucket: s3Config.bucket,
          Key: file.Key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 60 });
      })
    );

    const parquetFiles = await Promise.all(
      presignedUrls.map(async (url, index) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const blob = await response.blob();
        const parquetFile = await ParquetFile.fromFile(blob);
        const stream = await parquetFile.stream();
        return { index, stream };
      })
    );

    // Sort the results by the original index
    parquetFiles.sort((a, b) => a.index - b.index);

    // Extract just the streams in the correct order
    const orderedStreams = parquetFiles.map(({ stream }) => stream);

    const combinedStream = combineStreams(...orderedStreams);
    // Merge the Parquet files
    const mergedParquetStream = await transformParquetStream(
      combinedStream,
      createWriterProperties()
    );

    // Start an asynchronous task to merge and upload the file
    debugTempLog(`Starting async task to merge and upload file: ${key}`);

    await mergeAndUploadFile(s3Client, s3Config, key, mergedParquetStream);
    // Delete existing files after successful merge
    debugTempLog('Deleting existing files after successful merge');
    const deletePromises = filesToMerge
      .filter((file) => file.Key)
      .map((file) => {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: s3Config.bucket,
          Key: file.Key!,
        });
        return s3Client
          .send(deleteCommand)
          .then(() => debugTempLog(`Successfully deleted file: ${file.Key}`))
          .catch((error) =>
            debugTempLog(`Error deleting file ${file.Key}:`, error)
          );
      });

    // Start deletion process without waiting for completion
    Promise.all(deletePromises).catch((error) =>
      debugTempLog('Error in batch delete operation:', error)
    );
  } catch (error) {
    debugTempLog(`Error in materializeVirtualFile: ${error}`);
    return c.json(
      { error: 'Error processing virtual merged file' },
      { status: 500 }
    );
  }
}

function combineStreams(...streams: ReadableStream<Uint8Array>[]) {
  const { readable, writable } = new TransformStream();

  (async () => {
    for (const stream of streams) {
      // Pipe the current stream to the writable side of the TransformStream
      debugTempLog('piping stream...');
      await stream.pipeTo(writable, { preventClose: true });
    }
    writable.getWriter().close();
  })();

  return readable;
}

function createWriterProperties() {
  return (
    new WriterPropertiesBuilder()
      .setWriterVersion(WriterVersion.V1)
      .setCompression(Compression.SNAPPY)
      .setDictionaryEnabled(true)
      .setStatisticsEnabled(EnabledStatistics.Chunk)
      .setDataPageSizeLimit(1024 * 1024)
      .setDictionaryPageSizeLimit(1024 * 1024)
      .setMaxRowGroupSize(1024 * 1024)
      // TODO: include the evefan deployed version and environment Id
      .setCreatedBy(`evefan-${Date.now()}`)
      .build()
  );
}

async function mergeAndUploadFile(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  mergedParquetStream: ReadableStream<Uint8Array>
) {
  // Improvements: Handle this via a stream with the S3 Upload utility
  const response = new Response(mergedParquetStream);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const putObjectCommand = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: Buffer.from(arrayBuffer),
  });

  try {
    await s3Client.send(putObjectCommand);
    debugTempLog(`Successfully uploaded merged file: ${key}`);
  } catch (error) {
    debugTempLog(`Failed to upload merged file: ${error}`);
  }
}

function extractTimeRangeFromMergedFileName(key: string): {
  startTime: string;
  endTime: string;
  size: number;
} {
  const fileName = key.split('/').pop() || '';
  const [, size, startTime, endTime] = fileName.split('_');
  return {
    size: parseInt(size),
    startTime,
    endTime: endTime.replace('.parquet', ''),
  };
}

async function getFilesInTimeRange(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  startTime: string,
  endTime: string
) {
  // Convert timestamps to Dates
  const startDate = new Date(parseInt(startTime));
  const endDate = new Date(parseInt(endTime));

  // Adjust the prefix based on your S3 structure
  const prefix = ''; // Define the prefix if needed

  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  const allFiles = response.Contents || [];

  // Filter files based on the time range
  const filesToMerge = allFiles.filter((file) => {
    if (file.Key?.includes('virtual_')) {
      return false;
    }
    const timestampStr = file.Key?.split('/').pop()?.split('.')[0];
    if (timestampStr) {
      const fileDate = new Date(parseInt(timestampStr));
      return fileDate >= startDate && fileDate <= endDate;
    }
    return false;
  });

  return filesToMerge;
}

async function handleListRequest(
  c: Context<WorkerEnv, any, {}>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  writeKey: string
) {
  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: key,
  });

  const existingListResponse = await s3Client.send(command);
  const files = existingListResponse.Contents || [];

  const filesByDay = groupFilesByDay(
    files.filter(
      (f) => f.Key?.endsWith('.parquet') && !f.Key?.includes('virtual_')
    )
  );

  const virtualMergedFiles = constructVirtualMergedFiles(filesByDay);

  const filesToRespond = [
    ...files.filter((f) => f.Key?.includes('virtual_')),
    ...virtualMergedFiles,
  ];
  filesToRespond.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));

  const xmlResponse = generateXMLResponse(existingListResponse, filesToRespond);
  return new Response(xmlResponse, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
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
