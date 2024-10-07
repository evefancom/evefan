import { Context } from 'hono';
import { WorkerEnv } from './routes';
import { S3HiveConfig } from '@evefan/evefan-config';

import initWasm, {
  Compression,
  EnabledStatistics,
  transformParquetStream,
  WriterPropertiesBuilder,
  WriterVersion,
} from './lib/parquet-wasm/parquet_wasm';
import { ParquetFile } from './lib/parquet-wasm/parquet_wasm';
import { XMLBuilder } from 'fast-xml-parser';
import { ParquetWasm } from './lib/parquet-wasm/wasm';
import { S3Client } from './lib/s3/client';

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

  const s3Config = config.destinations.find((d) => d.type === 's3hive')
    ?.config as S3HiveConfig;

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

  const s3Client = new S3Client(c, s3Config);

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
  s3Config: S3HiveConfig,
  key: string
) {
  const rangeHeader = c.req.header('range');

  const response = await s3Client.get(key, rangeHeader);

  if (!response) {
    //debugTempLog('Error fetching object', result.status, result.statusText);
    return c.json({ error: 'Error fetching object' }, { status: 500 });
  }

  const responseHeaders: Record<string, string> = {
    'Content-Disposition': `attachment; filename="${key}"`,
    'Content-Type': 'application/octet-stream',
  };
  if (response instanceof Response) {
    responseHeaders['Content-Range'] =
      response.headers.get('Content-Type') || 'application/octet-stream';
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
  } else {
    responseHeaders['Content-Length'] = response.size.toString();
  }

  return new Response(response.body, {
    status: rangeHeader ? 206 : 200,
    headers: responseHeaders,
  });
}

async function handleHeadRequest(
  c: Context<WorkerEnv>,
  s3Client: S3Client,
  s3Config: S3HiveConfig,
  key: string
) {
  let response = await s3Client.head(key);
  if (!response) {
    return c.json({ error: 'Error on head request' }, { status: 500 });
  }

  const getHeadResponseHeaders = (response: Response | R2Object) => {
    return {
      'Content-Length':
        response instanceof Response
          ? response.headers.get('Content-Length') || '0'
          : response.size.toString(),
      'Content-Type':
        response instanceof Response
          ? response.headers.get('Content-Type') || 'application/octet-stream'
          : response.httpMetadata?.contentType || 'application/octet-stream',
      'Last-Modified':
        response instanceof Response
          ? response.headers.get('Last-Modified') || ''
          : '',
      ETag:
        response instanceof Response
          ? response.headers.get('ETag') || ''
          : response.etag || '',
    };
  };

  if (response) {
    return new Response(null, {
      status: 200,
      headers: getHeadResponseHeaders(response),
    });
  }

  if (key.includes('virtual_')) {
    await materializeVirtualFile(c, key, s3Client, s3Config);

    response = await s3Client.head(key);
  }

  if (!response) {
    return c.json({ error: 'Error on head request' }, { status: 500 });
  }

  return new Response(null, {
    status: 200,
    headers: getHeadResponseHeaders(response),
  });
}

async function materializeVirtualFile(
  c: Context<WorkerEnv>,
  key: string,
  s3Client: S3Client,
  s3Config: S3HiveConfig
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
        filesToMerge.reduce(
          (acc, file) =>
            acc + (file instanceof R2Object ? file.size : file.Size || 0),
          0
        ) /
        1024 /
        1024
      } MB for key: ${key}`
    );

    const presignedUrls = await Promise.all(
      filesToMerge.map(async (file) => {
        return await s3Client.get(file.Key ?? '');
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
  files: (Response | R2ObjectBody | null)[],
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

  for (const file of files) {
    if (file) {
      const blob = await file.blob();
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
  s3Config: S3HiveConfig,
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

  s3Client.put(key, new Uint8Array(arrayBuffer));
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
  s3Config: S3HiveConfig,
  startTime: string,
  endTime: string
) {
  const startDate = new Date(parseInt(startTime));
  const endDate = new Date(parseInt(endTime));

  const prefix = ''; // Define the prefix if needed
  const [_, allFiles] = await s3Client.list(prefix);

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
  s3Config: S3HiveConfig,
  key: string
) {
  const [existingListResponse, files] = await s3Client.list(key);

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
