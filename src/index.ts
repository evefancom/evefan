import { Batcher } from "./batcher";
import { HealthChecker } from "./health";
import { handleQueueEventConsumer } from "./queue";
import { app } from "./routes";

export default {
  fetch: app.fetch,
  queue: handleQueueEventConsumer,
};

export { Batcher, HealthChecker };
