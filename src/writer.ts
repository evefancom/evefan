import { delay } from './utils';
import { WorkerConfig } from './config';
import { DestinationEvent } from './event';
import { DestinationType } from '@evefan/evefan-config';
import { Bindings } from './env';

export async function handleEventFanout(
  config: WorkerConfig,
  env: Bindings,
  events: DestinationEvent[]
) {
  return new Promise<void>(async (resolve) => {
    console.log('Processing received events: ' + events.length);
    const failedEvents = await fanOutEventData(config, events);

    await Promise.all(
      failedEvents.map(async (failedFanouts) => {
        try {
          const queue =
            env[
              failedFanouts.destinationType.toUpperCase() as Uppercase<DestinationType>
            ];
          const eventsToSend = failedFanouts.failedEvents.map((e) => ({
            body: e.body,
          }));

          // Cloudflare queues only accept up to 256KB as a batch
          // TODO: Implement a way to split the events array based on the size
          const batchSize = config.queue.batchSize || 1;
          for (let i = 0; i < events.length; i += batchSize) {
            const batch = eventsToSend.slice(i, i + batchSize);
            await queue.sendBatch(batch, { delaySeconds: 1 });
          }

          const id = env.HEALTH.idFromName(failedFanouts.destinationType);
          const health = env.HEALTH.get(id);
          await health.updateEventsState(failedFanouts.failedEvents);
        } catch (e) {
          console.error('Error in processing failedFanouts:', e);
        }
      })
    );
    resolve();
  });
}

const requestCounters: { [key: string]: { count: number; timestamp: number } } =
  {};

async function attemptWriteWithShortBackoff(
  config: WorkerConfig,
  destinationType: DestinationType,
  writeHandler: (
    config: WorkerConfig,
    events: DestinationEvent[]
  ) => Promise<FanOutResult>,
  events: DestinationEvent[],
  attempt = 1,
  maxRps: number
): Promise<FanOutResult> {
  const MAX_RETRIES = 5;
  try {
    await rateLimit(destinationType, maxRps);

    // NOTE: recursion here won't work properly, rework so that it handles correctly handling retrying only the failed events
    return await writeHandler(config, events);
  } catch (error: any) {
    if (attempt > MAX_RETRIES) {
      return {
        destinationType,
        failedEvents: events.map((body) => ({ body, error: error.message })),
      };
    }
    const delayMs = Math.pow(2, attempt);
    await delay(delayMs);
    return attemptWriteWithShortBackoff(
      config,
      destinationType,
      writeHandler,
      events,
      attempt + 1,
      maxRps
    );
  }
}

async function rateLimit(destination: string, maxRps: number): Promise<void> {
  const now = Date.now();
  if (!requestCounters[destination]) {
    requestCounters[destination] = { count: 0, timestamp: now };
  }
  const requestCounter = requestCounters[destination];

  if (now - requestCounter.timestamp > 1000) {
    requestCounter.count = 0;
    requestCounter.timestamp = now;
  }

  if (requestCounter.count >= maxRps) {
    const waitTime = 1000 - (now - requestCounter.timestamp);
    await delay(waitTime);
    requestCounter.count = 0;
    requestCounter.timestamp = Date.now();
  }

  requestCounter.count++;
}

export type FailedEvent = {
  body: DestinationEvent;
  error: string;
};

export type FanOutResult = {
  destinationType: DestinationType;
  failedEvents: FailedEvent[];
};

export async function fanOutEventData(
  config: WorkerConfig,
  events: DestinationEvent[],
  destinationType?: DestinationType
): Promise<FanOutResult[]> {
  const failedEvents: FanOutResult[] = [];
  let destinations = [];

  if (destinationType) {
    const dest = config.destinations.find((d) => d.type === destinationType);
    if (dest) destinations.push(dest);
  } else {
    destinations = config.destinations;
  }

  await Promise.all(
    destinations.map(async (destination) => {
      if (!destination.handler) {
        return;
      }
      const batchSize = destination.config.batchSize || 1;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const failed = await attemptWriteWithShortBackoff(
          config,
          destination.type,
          destination.handler.write,
          batch,
          1,
          destination.config.maxRps
        );

        if (failed.failedEvents.length > 0) {
          failedEvents.push(failed);
        }
      }
    })
  );

  return failedEvents;
}
