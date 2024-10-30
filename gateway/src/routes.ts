import { Context, Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { cors } from 'hono/cors';
import { formatEvent, DestinationEvent } from './schema/event';
import { getConfig, GatewayConfig } from './config';
import { handleEventFanout } from './writer';
import { Bindings } from './env';
import { Batcher } from './batcher';
import { DestinationType, S3DeltaConfig } from '@evefan/evefan-config';
import { EventType } from './schema/input';
import { checkCloudflareQueuesConfiguration } from './queue';
import { handleS3ProxyRequest } from './s3Proxy';

export type GatewayEnv = {
  Bindings: Bindings;
  Variables: {
    config: GatewayConfig;
    batcher: DurableObjectStub<Batcher>;
  };
};

export const app = new Hono<GatewayEnv>();
app.use('*', cors());

const gatewayMiddleware = createMiddleware<GatewayEnv>(async (c, next) => {
  const batcherId = c.env.BATCHER.idFromName('batcher');
  const batcher = c.env.BATCHER.get(batcherId);
  c.set('batcher', batcher);

  const config = await getConfig();
  c.set('config', config);

  // Validate writeKey
  const body = await c.req.json();
  const writeKey = body.writeKey;
  if (
    !writeKey ||
    !config.sources.some((s) => {
      return s.writeKey === writeKey;
    })
  ) {
    return c.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedOrigins = config.sources.find(
    (s) => s.writeKey === writeKey
  )?.allowedOrigins;

  // Check if config contains allowed origins and if it doesn't contain * wildcard, we check the request origin.
  if (
    allowedOrigins &&
    allowedOrigins.length > 0 &&
    !allowedOrigins.includes('*')
  ) {
    const headers = c.req.header();
    const origin = headers['origin'];

    if (origin && !allowedOrigins.includes(origin)) {
      return c.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  await next();
});

const consoleAuthMiddleware = createMiddleware<GatewayEnv>(async (c, next) => {
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

app.post('/v1/t', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'track');
});

app.post('/v1/p', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'page');
});

app.post('/v1/s', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'screen');
});

app.post('/v1/i', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'identify');
});

app.post('/v1/g', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'group');
});

app.post('/v1/a', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'alias');
});

// Segment API

app.get('/v1/projects/:writeKey/settings', gatewayMiddleware, (c) => {
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

  return c.json(settings);
});

app.post('/v1/track', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'track');
});

app.post('/v1/page', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'page');
});

app.post('/v1/screen', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'screen');
});

app.post('/v1/identify', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'identify');
});

app.post('/v1/group', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'group');
});

app.post('/v1/alias', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c, 'alias');
});

app.post('/v1/batch', gatewayMiddleware, async (c) => {
  return handleAnalyticsJsMethod(c);
});

app.get('/v1/health', gatewayMiddleware, consoleAuthMiddleware, async (c) => {
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
  c: Context<GatewayEnv>,
  type?: EventType
) {
  const config = c.get('config');
  let events: DestinationEvent[] = [];

  try {
    const body = await c.req.json();

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
      ? body.map((b) => formatEvent(b, c, type!))
      : [formatEvent(body, c, type!)];
  } catch (e: any) {
    console.error('Error parsing request body: ', JSON.stringify(e));
    return c.json({ error: 'Error parsing request body' }, { status: 400 });
  }

  c.executionCtx.waitUntil(processEvents(c, events));

  return c.json({ success: true });
}

async function processEvents(
  c: Context<GatewayEnv>,
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

// S3 compatible endpoints
app.get('/v1/s3/*', gatewayMiddleware, async (c) => {
  const method = c.req.method as 'GET' | 'HEAD' | 'LIST';
  const isListRequest = !c.req.path.endsWith('.parquet');
  return handleS3ProxyRequest(c, isListRequest ? 'LIST' : method);
});
