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

function debugTempLog(...message: any) {
  // TODO: remove this when we have a logger and proper dev/prod flag
  // console.debug(message);
}

export async function handleS3ProxyRequest(
  c: Context<WorkerEnv>,
  method: 'GET' | 'HEAD' | 'LIST'
) {
  debugTempLog(`S3 Proxy Request: Method=${method}, Path=${c.req.path}`);
  const config = c.get('config');
  const writeKey = c.req.query('writeKey');

  if (!writeKey || !config.sources.some((s) => s.writeKey === writeKey)) {
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const s3Config = config.destinations.find((d) => d.type === 's3delta')
    ?.config as S3DeltaConfig;

  if (!s3Config) {
    return c.json({ error: 'S3 configuration not found' }, { status: 404 });
  }

  const key = c.req.path.replace('/v1/s3/', '');

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
        return await handleListRequest(c, s3Client, s3Config, key);

      case 'HEAD':
        debugTempLog(`Handling HEAD request for key: ${key}`);
        const headCommand = new HeadObjectCommand({
          Bucket: s3Config.bucket,
          Key: key,
        });
        debugTempLog(
          `Sending HeadObjectCommand for bucket: ${s3Config.bucket}, key: ${key}`
        );
        const headResponse = await s3Client.send(headCommand);
        debugTempLog(`HeadObjectCommand response:`, headResponse);
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Length': headResponse.ContentLength?.toString() || '0',
            'Content-Type':
              headResponse.ContentType || 'application/octet-stream',
            'Last-Modified': headResponse.LastModified?.toUTCString() || '',
            ETag: headResponse.ETag || '',
          },
        });

      case 'GET':
        debugTempLog(`Handling GET request for key: ${key}`);
        if (key.includes('virtual_')) {
          debugTempLog(`Handling virtual merged file fetch for key: ${key}`);
          return await handleVirtualMergedFileFetch(c, key, s3Client, s3Config);
        } else {
          const getCommand = new GetObjectCommand({
            Bucket: s3Config.bucket,
            Key: key,
          });
          debugTempLog(
            `Sending GetObjectCommand for bucket: ${s3Config.bucket}, key: ${key}`
          );
          const getResponse = await s3Client.send(getCommand);
          debugTempLog(`GetObjectCommand response:`, getResponse);
          const stream = getResponse.Body?.transformToWebStream();

          return new Response(stream, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="${key}"`,
            },
          });
        }

      default:
        return c.json({ error: 'Unsupported method' }, { status: 405 });
    }
  } catch (e) {
    console.error(`Error in handling S3 ${method} request: `, e);
    return c.json({ error: 'Error in handling S3 request' }, { status: 500 });
  }
}

async function handleVirtualMergedFileFetch(
  c: Context<WorkerEnv>,
  key: string,
  s3Client: S3Client,
  s3Config: S3DeltaConfig
) {
  debugTempLog(`Handling virtual merged file fetch for key: ${key}`);
  const [startTime, endTime] = extractTimeRangeFromMergedFileName(key);
  debugTempLog(`Extracted time range: ${startTime} - ${endTime}`);
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

  // Create an array of ReadableStreams, one for each file
  const fileStreams = await Promise.all(
    presignedUrls.map(async (url) => {
      const response = await fetch(url);
      // Create a Blob from the response
      const blob = await response.blob();
      const fileInstance = await ParquetFile.fromFile(blob);
      return fileInstance.stream();
    })
  );

  // Combine all file streams
  const combinedStream = new ReadableStream({
    async start(controller) {
      for (const stream of fileStreams) {
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

  // Transform the combined stream into a Parquet byte stream
  const parquetByteStream = await transformParquetStream(combinedStream);

  // Tee the stream once
  const [responseStream, uploadStream] = parquetByteStream.tee();

  debugTempLog(`Starting async task to merge and upload file: ${key}`);
  c.executionCtx.waitUntil(
    mergeAndUploadFile(s3Client, s3Config, key, filesToMerge, uploadStream)
  );

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${key}"`,
    },
  });
}

async function mergeAndUploadFile(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string,
  filesToMerge: any[],
  parquetByteStream: ReadableStream
) {
  try {
    debugTempLog(`Merging and uploading file: ${key}`);

    // Create a new Upload object
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: s3Config.bucket,
        Key: key.replace('virtual_', ''),
        Body: parquetByteStream,
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
  }
}

async function getFilesInTimeRange(
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  startTime: string,
  endTime: string
) {
  debugTempLog(`Getting files in time range: ${startTime} - ${endTime}`);
  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: `y=${startTime.slice(0, 4)}/`,
  });
  debugTempLog(
    `Sending ListObjectsV2Command for bucket: ${
      s3Config.bucket
    }, prefix: y=${startTime.slice(0, 4)}/`
  );
  const response = await s3Client.send(command);
  debugTempLog(`ListObjectsV2Command response:`, response);
  const allFiles = response.Contents || [];

  const filteredFiles = allFiles.filter((file) => {
    const fileTimestamp = file.Key?.split('/').pop()?.split('.')[0];
    return (
      fileTimestamp && fileTimestamp >= startTime && fileTimestamp <= endTime
    );
  });
  debugTempLog(`Filtered files:`, filteredFiles);
  return filteredFiles;
}

function extractTimeRangeFromMergedFileName(
  fileName: string
): [string, string] {
  const parts = fileName.split('_');
  return [
    parts[2]?.replace('.parquet', ''),
    parts[3].split('.')[0]?.replace('.parquet', ''),
  ];
}

async function handleListRequest(
  c: Context<WorkerEnv, any, {}>,
  s3Client: S3Client,
  s3Config: S3DeltaConfig,
  key: string
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
  debugTempLog(`ListObjectsV2Command response:`, response);
  const files = response.Contents || [];

  debugTempLog(`Grouping files by day`);
  const filesByDay = groupFilesByDay(files);
  debugTempLog(`Files grouped by day:`, filesByDay);

  debugTempLog(`Constructing virtual merged files`);
  const virtualMergedFiles = constructVirtualMergedFiles(filesByDay);
  debugTempLog(`Virtual merged files:`, virtualMergedFiles);

  // Combine actual files and virtual merged files
  const allFiles = [...files, ...virtualMergedFiles];

  // Sort all files by their key (which includes the timestamp)
  allFiles.sort((a, b) => (a.Key || '').localeCompare(b.Key || ''));

  return c.json({
    ...response,
    Contents: allFiles,
  });
}

function groupFilesByDay(files: any[]): Record<string, any[]> {
  return files.reduce((acc, file) => {
    const day = file.Key?.split('/').slice(0, 3).join('/'); // Assumes y=YYYY/m=MM/d=DD structure
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
        const virtualKey = `${day}/virtual_${virtualFileCounter}_${firstFile.Key?.split(
          '/'
        ).pop()}_${lastFile.Key?.split('/').pop()}`;

        virtualFiles.push({
          Key: virtualKey,
          Size: currentSize,
          LastModified: lastFile.LastModified,
          IsVirtual: true,
          OriginalFiles: currentFiles.map((f) => f.Key),
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
      const virtualKey = `${day}/virtual_${virtualFileCounter}_${firstFile.Key?.split(
        '/'
      ).pop()}_${lastFile.Key?.split('/').pop()}`;

      virtualFiles.push({
        Key: virtualKey,
        Size: currentSize,
        LastModified: lastFile.LastModified,
        IsVirtual: true,
        OriginalFiles: currentFiles.map((f) => f.Key),
      });
    }
  }

  return virtualFiles;
}
