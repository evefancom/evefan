# Evefan 

Evefan enables developers to privately capture, transform and deliver customer events at any scale. 

Evefan is open source and self-hosted on Cloudflare workers. It can be configured either via Evefan Console or using Wrangler. The quick start guide focuses on console configuring as recommended for most people, but you can see alternative configuration options here. 

## Getting Started
You can review our official docs for our quick start steps: https://docs.evefan.com

## High-Level Architecture

Evefan consists of several key components:

1. Worker Router
2. Durable Objects for Batching and Error Tracking
3. Queues for Failure Handling

### 1. Worker Router

The worker router is the entry point for all incoming requests. It's responsible for:

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

The Batcher is implemented in `src/batcher.ts` and exported in `src/index.ts`.

#### Error Tracking (HealthChecker)

The HealthChecker Durable Object is responsible for:

- Tracking errors in processing events for destinations
- Providing insights into the error rates for each destination

The HealthChecker is implemented in `src/health.ts` and exported in `src/index.ts`.

### 3. Queues for Failure Handling

Queues are used to handle failures when sending events to destinations. The queue system:

- Stores failed events for retry
- Implements a backoff strategy for retries
- Ensures eventual delivery of events

The queue handler is implemented in the `handleQueueEventConsumer` function in `src/queue.ts` and exported in `src/index.ts`.

## Supported Destinations

Evefan currently supports the following destinations for event fan-out:

1. BigQuery: Google's fully managed, serverless data warehouse
2. Postgres: Open-source relational database management system
3. Mixpanel: Product analytics platform for tracking user interactions

Each destination has its own specific implementation for data insertion and error handling, ensuring optimal performance and reliability.

## Getting Started with Development

To start developing with the Evefan Worker, follow these steps:

1. Clone the repository and navigate to the project directory.

2. Install dependencies:

   ```
   npm install
   ```

3. Set up your local `config.json`:
   Create a `config.json` file in the root directory. Use the schema from `@evefan/evefan-config` for the configuration structure. This file should include your Cloudflare credentials.

4. Run the development server:

   ```
   npm run dev
   ```

5. To build the worker:

   ```
   npm run build
   ```

6. To deploy to Cloudflare Workers:

   ```
   npm run deploy
   ```

## License

This project is licensed under the Elastic License 2.0 (ELv2) — see the LICENSE file for details.
