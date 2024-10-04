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
import { ParquetFile } from './lib/parquet-wasm/parquet_wasm';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { XMLBuilder } from 'fast-xml-parser';
import { ParquetWasm } from './lib/parquet-wasm/wasm';

function debugTempLog(...message: any) {
  // TODO: remove this when we have a logger and proper dev/prod flag
  // console.debug(message);
}

export async function handleS3ProxyRequest(
  c: Context<WorkerEnv>,
  method: 'GET' | 'HEAD' | 'LIST' | string
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

  let result;
  try {
    await ParquetWasm.initialize();

    switch (method) {
      case 'LIST':
        debugTempLog(`Handling LIST request for key: ${key}`);
        result = await handleListRequest(c, s3Client, s3Config, key);
        break;
      case 'HEAD':
        debugTempLog(`Handling HEAD request for key: ${key}`);
        result = await handleHeadRequest(c, s3Client, s3Config, key);
        break;
      case 'GET':
        debugTempLog(`Handling GET request for key: ${key}`);
        result = await handleGetRequest(c, s3Client, s3Config, key);
        break;
      default:
        // TODO: Simply proxy other methods
        result = c.json({ error: 'Unsupported method' }, { status: 405 });
    }
  } catch (e) {
    console.error(`Error in handling S3 ${method} request: `, e);
    result = c.json({ error: 'Error in handling S3 request' }, { status: 500 });
  } finally {
    ParquetWasm.free();
  }

  return result;
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

  const getHeadResponseHeaders = (response: Response) => {
    return {
      'Content-Length': response.headers.get('Content-Length') || '0',
      'Content-Type':
        response.headers.get('Content-Type') || 'application/octet-stream',
      'Last-Modified': response.headers.get('Last-Modified') || '',
      ETag: response.headers.get('ETag') || '',
    };
  };

  if (response.ok && response.status == 200) {
    return new Response(null, {
      status: response.status,
      headers: getHeadResponseHeaders(response),
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
    headers: getHeadResponseHeaders(response),
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
    debugTempLog(
      `${filesToMerge.length} S3 files to merge with total size ${
        filesToMerge.reduce((acc, file) => acc + (file.Size || 0), 0) /
        1024 /
        1024
      } MB for key: ${key}`
    );

    const presignedUrls = await Promise.all(
      filesToMerge.map(async (file) => {
        const command = new GetObjectCommand({
          Bucket: s3Config.bucket,
          Key: file.Key,
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 60 });
      })
    );

    const MAX_MEMORY_USAGE = 30 * 1024 * 1024; // 30MB
    const MAX_PAGE_SIZE = 10 * 1024 * 1024;

    const { totalSize, totalRows, averageRowSize, combinedStream } =
      await createReadStream(presignedUrls, MAX_MEMORY_USAGE, MAX_PAGE_SIZE);

    debugTempLog(
      `Total size: ${totalSize} bytes, Total rows: ${totalRows}, Average row size: ${averageRowSize} bytes, Batch size: ${Math.min(
        MAX_MEMORY_USAGE / 3,
        MAX_PAGE_SIZE
      )} bytes, Page size: ${Math.floor(
        Math.min(MAX_MEMORY_USAGE / 3, MAX_PAGE_SIZE) / averageRowSize
      )} rows. Wasm memory Usage: ${
        ParquetWasm.getMemoryUsage() / 1024 / 1024
      } MB`
    );

    const writerProperties = createWriterProperties();
    const mergedParquetStream = await transformParquetStream(
      combinedStream,
      writerProperties
    );

    // await writerProperties.free();

    await mergeAndUploadFile(s3Client, s3Config, key, mergedParquetStream);
  } catch (error) {
    debugTempLog(`Error in materializeVirtualFile: ${error}`);
    return c.json(
      { error: 'Error processing virtual merged file' },
      { status: 500 }
    );
  }
}

async function createReadStream(
  urls: string[],
  MAX_MEMORY_USAGE: number,
  MAX_PAGE_SIZE: number
): Promise<{
  totalSize: number;
  totalRows: number;
  averageRowSize: number;
  combinedStream: ReadableStream<any>;
}> {
  let totalSize = 0;
  let totalRows = 0;
  const streams: ReadableStream<any>[] = [];

  for (const url of urls) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const parquetFile = await ParquetFile.fromFile(blob);
    totalSize += blob.size;
    const numRows = parquetFile.metadata().fileMetadata().numRows();
    totalRows += numRows;

    const averageRowSize = totalSize / totalRows;
    const batchSize = Math.min(MAX_MEMORY_USAGE / 3, MAX_PAGE_SIZE);
    const pageSize = Math.floor(batchSize / averageRowSize);

    const numPages = Math.ceil(numRows / pageSize);

    for (let i = 0; i < numPages; i++) {
      const stream = await parquetFile.stream({
        limit: pageSize,
        offset: i * pageSize,
        concurrency: 1,
      });
      streams.push(stream);
    }

    // parquetFile.free();
  }

  const averageRowSize = totalSize / totalRows;
  const combinedStream = combineStreams(streams);
  return { totalSize, totalRows, averageRowSize, combinedStream };
}

function combineStreams(streams: ReadableStream<any>[]): ReadableStream<any> {
  return new ReadableStream({
    async start(controller) {
      for (const stream of streams) {
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      }
      controller.close();
    },
  });
}

export function createWriterProperties() {
  debugTempLog('Creating writer properties');
  const properties = new WriterPropertiesBuilder()
    .setWriterVersion(WriterVersion.V1)
    .setCompression(Compression.SNAPPY)
    .setDictionaryEnabled(true)
    .setStatisticsEnabled(EnabledStatistics.Chunk)
    .setDataPageSizeLimit(1024 * 1024)
    .setDictionaryPageSizeLimit(1024 * 1024)
    .setMaxRowGroupSize(1024 * 1024)
    .setCreatedBy(`evefan-${Date.now()}`)
    .build();
  debugTempLog('Writer properties created');
  return properties;
}

async function mergeAndUploadFile(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  mergedParquetStream: ReadableStream<Uint8Array>
) {
  debugTempLog('Starting mergeAndUploadFile');
  const chunks: Uint8Array[] = [];
  const reader = mergedParquetStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    debugTempLog(`Chunk read, total chunks: ${chunks.length}`);
  }

  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  const arrayBuffer = await blob.arrayBuffer();

  debugTempLog(`Uploading file: ${key}, size: ${arrayBuffer.byteLength} bytes`);

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
    throw error;
  }
}

function extractTimeRangeFromMergedFileName(key: string): {
  startTime: string;
  endTime: string;
} {
  const fileName = key.split('/').pop() || '';
  const [, , startTime, endTime] = fileName.split('_');
  return {
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
  const startDate = new Date(parseInt(startTime));
  const endDate = new Date(parseInt(endTime));

  const prefix = ''; // Define the prefix if needed

  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  const allFiles = response.Contents || [];

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
  key: string
) {
  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: key && key.length > 0 ? key : undefined,
  });

  const existingListResponse = await s3Client.send(command);
  const files = existingListResponse.Contents || [];

  const filesByDay = groupFilesByDay(
    files
      .filter(
        (f) => f.Key?.endsWith('.parquet') && !f.Key?.includes('virtual_')
      )
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
      })
  );

  // const virtualMergedFiles = constructVirtualMergedFiles(filesByDay);

  const filesToRespond = [
    ...files.filter((f) => f.Key?.includes('virtual_')),
    // ...virtualMergedFiles,
  ];
  filesToRespond.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));

  // debugTempLog(`List files to respond:`, filesToRespond);

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
  const TARGET_FILE_SIZE = 1 * 1024 * 1024; // 1 MB for now

  for (const [date, files] of Object.entries(filesByDay)) {
    let currentSize = 0;
    let currentFiles = [];
    let virtualFileCounter = 1;

    for (const file of files) {
      currentFiles.push(file);
      currentSize += file.Size || 0;

      if (currentSize >= TARGET_FILE_SIZE) {
        if (currentFiles.length > 1) {
          const firstFile = currentFiles[0];
          const lastFile = currentFiles[currentFiles.length - 1];
          const firstTimestamp = firstFile.Key?.split('/').pop()?.split('.')[0];
          const lastTimestamp = lastFile.Key?.split('/').pop()?.split('.')[0];
          const virtualKey = `${date}/virtual_${currentSize}_${firstTimestamp}_${lastTimestamp}.parquet`;

          debugTempLog(
            `Constructing virtual file: ${virtualKey} with size: ${currentSize} bytes which includes files: ${currentFiles
              .map(
                (f) => f.Key + ' (' + Math.floor(f.Size / 1024 / 1024) + ' MB)'
              )
              .join(', ')} for day: ${date} out of files: ${files
              .map(
                (f) => f.Key + ' (' + Math.floor(f.Size / 1024 / 1024) + ' MB)'
              )
              .join(', ')}`
          );

          virtualFiles.push({
            Key: virtualKey,
            Size: currentSize,
            LastModified: lastFile.LastModified,
            ETag: lastFile.ETag,
            StorageClass: lastFile.StorageClass,
          });
        } else {
          virtualFiles.push(currentFiles[0]);
        }
        currentFiles = [];
        currentSize = 0;
        virtualFileCounter++;
      }
    }

    // Handle any remaining files
    if (currentFiles.length > 1) {
      debugTempLog(
        `files remaining for day: ${date} files: ${currentFiles
          .map((f) => f.Key)
          .join(', ')}`
      );
      const firstFile = currentFiles[0];
      const lastFile = currentFiles[currentFiles.length - 1];
      const firstTimestamp = firstFile.Key?.split('/').pop()?.split('.')[0];
      const lastTimestamp = lastFile.Key?.split('/').pop()?.split('.')[0];
      const virtualKey = `${date}/virtual_${currentSize}_${firstTimestamp}_${lastTimestamp}.parquet`;

      virtualFiles.push({
        Key: virtualKey,
        Size: currentSize,
        LastModified: lastFile.LastModified,
        ETag: lastFile.ETag,
        StorageClass: lastFile.StorageClass,
      });
    } else if (currentFiles.length === 1) {
      virtualFiles.push(currentFiles[0]);
    }
  }

  return virtualFiles;
}
