# Evefan Architecture

Evefan is architected to scale horizontally on Cloudflare Gateways. It has been tested at 300 events per second over a sustained period of time achieving 99.999% delivery rate.

Evefan consists of several key components:

1. Gateway Router
2. Durable Objects for Batching and Error Tracking
3. Queues for Failure Handling

### 1. Gateway Router

The gateway router is the entry point for all incoming requests. It's responsible for:

- Parsing incoming requests
- Routing requests to the appropriate handlers
- Initializing and coordinating with other components

The router is implemented in the `app.fetch` function, which is exported as the main fetch handler in `src/index.ts`.

### 2. Durable Objects

#### Batching (Batcher)

The Batcher Durable Object is used to aggregate events before sending them to destinations. This helps in:

- Reducing the number of API calls to destinations
- Improving overall throughput
- Minimizing the risk of rate limiting

The Batcher is implemented in `src/batcher.ts`.

#### Error Tracking (HealthChecker)

The HealthChecker Durable Object is responsible for:

- Tracking errors in processing events for destinations
- Providing insights into the error rates for each destination

The HealthChecker is implemented in `src/health.ts`.

### 3. Queues for Failure Handling

Queues are used to handle failures when sending events to destinations. The queue system:

- Stores failed events for retry
- Implements a backoff strategy for retries
- Ensures eventual delivery of events

The queue handler is implemented in the `handleQueueEventConsumer` function in `src/queue.ts`.
