import { DurableObject } from 'cloudflare:gateways';
import { DestinationEvent } from './schema/event';
import { getConfig, GatewayConfig } from './config';
import { handleEventFanout } from './writer';
import { Bindings } from './env';

type BatcherEnv = Bindings;

export class Batcher extends DurableObject<BatcherEnv> {
  private batchedEvents: DestinationEvent[] = [];

  constructor(state: DurableObjectState, env: BatcherEnv) {
    super(state, env);
  }

  private async resetAlarm() {
    await this.ctx.storage.deleteAlarm();
  }

  private async checkAndSetAlarm(config: GatewayConfig) {
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm == null) {
      await this.ctx.storage.setAlarm(
        Date.now() + config.batch.flushIntervalMs
      );
    }
  }

  private async flush(config: GatewayConfig) {
    const eventsToSend = await this.ctx.blockConcurrencyWhile(async () => {
      const events = [...this.batchedEvents];
      this.batchedEvents = [];

      return events;
    });

    await handleEventFanout(config, this.env, eventsToSend);
  }

  async fetch(request: Request) {
    const events = await request.json<DestinationEvent[]>();
    this.batchedEvents.push(...events);

    const config = await getConfig();

    if (this.batchedEvents.length >= config.batch.batchSize) {
      return this.ctx.blockConcurrencyWhile(async () => {
        const response = new Response(JSON.stringify(this.batchedEvents));
        this.batchedEvents = [];
        await this.resetAlarm();
        return response;
      });
    } else {
      await this.checkAndSetAlarm(config);
      return new Response(JSON.stringify([]));
    }
  }

  async alarm() {
    const config = await getConfig();
    this.ctx.waitUntil(this.flush(config));
  }
}
