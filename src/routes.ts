import { Context, Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { cors } from 'hono/cors';
import { formatEvent, DestinationEvent } from './schema/event';
import { getConfig, WorkerConfig } from './config';
import { handleEventFanout } from './writer';
import { Bindings } from './env';
import { Batcher } from './batcher';
import { DestinationType } from '@evefan/evefan-config';
import { EventType } from './schema/input';
import { checkCloudflareQueuesConfiguration } from './queue';

type WorkerEnv = {
  Bindings: Bindings;
  Variables: {
    config: WorkerConfig;
    batcher: DurableObjectStub<Batcher>;
  };
};

export const app = new Hono<WorkerEnv>();
app.use('*', cors());

const workerMiddleware = createMiddleware<WorkerEnv>(async (c, next) => {
  const batcherId = c.env.BATCHER.idFromName('batcher');
  const batcher = c.env.BATCHER.get(batcherId);
  c.set('batcher', batcher);

  const config = await getConfig();
  c.set('config', config);

  await next();
});

const consoleAuthMiddleware = createMiddleware<WorkerEnv>(async (c, next) => {
  const config = c.get('config');

  const environmentId = c.req.header('x-evefan-environment-id');
  const environmentSecret = c.req.header('x-evefan-environment-secret');

  if (
    !environmentId ||
    !environmentSecret ||
    config.deploy.environmentId !== environmentId ||
    config.deploy.environmentSecret !== environmentSecret
  ) {
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await next();
});

// Analytics.js legacy API

app.post('/v1/t', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'track');
});

app.post('/v1/p', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'page');
});

app.post('/v1/s', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'screen');
});

app.post('/v1/i', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'identify');
});

app.post('/v1/g', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'group');
});

app.post('/v1/a', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'alias');
});

// Segment API

app.get('/v1/projects/:writeKey/settings', workerMiddleware, (c) => {
  const { writeKey } = c.req.param();
  const config = c.get('config');

  const project = config.sources.find((s) => s.writeKey === writeKey);

  if (!project) {
    return c.json(
      { error: 'Invalid path or write key provided' },
      { status: 404 }
    );
  }

  const settings = {
    analyticsNextEnabled: true,
    edgeFunction: {},
    enabledMiddleware: {},
    integrations: {
      'Segment.io': {
        addBundledMetadata: true,
        apiKey: writeKey,
        maybeBundledConfigIds: {},
        unbundledIntegrations: [],
        versionSettings: {
          componentTypes: ['browser'],
          version: '4.4.7',
        },
      },
    },
    legacyVideoPluginsEnabled: false,
    metrics: {
      sampleRate: 0.1,
    },
    middlewareSettings: {},
    plan: {
      group: {
        __default: {
          enabled: true,
        },
      },
      identify: {
        __default: {
          enabled: true,
        },
      },
      track: {
        __default: {
          enabled: true,
          integrations: {},
        },
      },
    },
    remotePlugins: [],
  };

  if (config.destinations.some((d) => d.type === 's3delta')) {
    const s3Host = config.deploy.hostUrl
      .replace('https://', '')
      .replace('http://', '');

    // @ts-ignore
    settings.integrations['s3delta'] = {
      queryFrom: `read_parquet('s3://${s3Host}/*/*/*.parquet', hive_partitioning = true)`,
    };
  }

  return c.json(settings);
});

app.post('/v1/track', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'track');
});

app.post('/v1/page', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'page');
});

app.post('/v1/screen', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'screen');
});

app.post('/v1/identify', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'identify');
});

app.post('/v1/group', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'group');
});

app.post('/v1/alias', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'alias');
});

app.post('/v1/batch', workerMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c);
});

app.get('/v1/health', workerMiddleware, consoleAuthMiddleware, async (c) => {
  const config = c.get('config');

  const state: Record<DestinationType, string[]> = config.destinations.reduce(
    (acc, d) => {
      acc[d.type] = [];
      return acc;
    },
    {} as Record<DestinationType, string[]>
  );

  for (const d of config.destinations) {
    const id = c.env.HEALTH.idFromName(d.type);
    const health = c.env.HEALTH.get(id);
    const response = await health.fetch(c.req.raw);
    const errors = await response.json<string[]>();
    state[d.type] = errors;
  }

  const queueErrors = await checkCloudflareQueuesConfiguration();

  return c.json({ ...state, ...queueErrors });
});

async function handleAnalyticsJsMethod(
  c: Context<WorkerEnv>,
  type?: EventType
) {
  const config = c.get('config');
  let events: DestinationEvent[] = [];

  try {
    const body = await c.req.json();
    const writeKey = body.writeKey;

    if (!writeKey || !config.sources.some((s) => s.writeKey === writeKey)) {
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    }

    events = body.batch
      ? body.batch.map((b: any) =>
          formatEvent(
            {
              ...b,
              context: { ...b.context, ...body.context },
              sentAt: body.sentAt,
            },
            c,
            b.type
          )
        )
      : Array.isArray(body)
      ? body.map((b) => formatEvent(b, c, type!!))
      : [formatEvent(body, c, type!!)];
  } catch (e: any) {
    console.error('Error parsing request body: ', JSON.stringify(e));
    return c.json({ error: 'Error parsing request body' }, { status: 400 });
  }

  c.executionCtx.waitUntil(processEvents(c, events));

  return c.json({ success: true });
}

async function processEvents(
  c: Context<WorkerEnv>,
  events: DestinationEvent[]
) {
  const config = c.get('config');
  const batcher = c.get('batcher');

  let eventsToSend: DestinationEvent[] = [];

  try {
    if (config.batch.batchSize > 1) {
      const response = await batcher.fetch(c.req.url, {
        method: 'POST',
        body: JSON.stringify(events),
      });
      eventsToSend = await response.json<DestinationEvent[]>();
    } else {
      eventsToSend = events;
    }
  } catch (e) {
    console.error('Error in processing events: ', e);
  }

  if (eventsToSend.length > 0) {
    await handleEventFanout(config, c.env, eventsToSend);
  }
}
