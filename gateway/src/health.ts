import { DurableObject } from 'cloudflare:workers';
import { Bindings } from './env';
import { FailedEvent } from './writer';

type HealthEnv = Bindings;

export class HealthChecker extends DurableObject<HealthEnv> {
  constructor(state: DurableObjectState, env: HealthEnv) {
    super(state, env);
  }

  async updateEventsState(failedEvents: FailedEvent[]) {
    await Promise.all(
      failedEvents.map(
        async (e) => await this.ctx.storage.put(e.body.messageId, e.error)
      )
    );
  }

  async resetEventsState(messageIds: string[]) {
    await Promise.all(
      messageIds.map(async (id) => await this.ctx.storage.delete(id))
    );
  }

  async fetch(_: Request) {
    const state = await this.ctx.storage.list<string>();
    return new Response(JSON.stringify([...state.values()]));
  }
}
