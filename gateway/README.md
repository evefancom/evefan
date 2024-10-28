<p align="center">
  <p align="center"><b> OpenInt Gateway — Unmetered Events Ingestion</b></p>
  <p align="center"><b> Serverless and on-prem </b> — without the overhead of Kafka or Spark.</p>
  <p align="center">Achieve <b>99% Costs Savings</b> with <b>Cloudflare Gateways 💸</b></p>
  <p align="center"><b>Your Very Own Internet Scale Events Infrastructure</b></p>
</p>

## Introduction

OpenInt Gateway enables developers to privately capture, transform and deliver customer events at any scale.

## High-Level Architecture

You can read more about the architecture in our [Architecture documentation](/architecture.md).

## Supported Destinations

OpenInt Gateway currently supports the following destinations for event fan-out:

1. BigQuery: Google's fully managed, serverless data warehouse
2. Postgres: Open-source relational database management system
3. Mixpanel: Product analytics platform for tracking user interactions

Each destination has its own specific implementation for data insertion and error handling, ensuring optimal performance and reliability.

Missing an integration? [Let us know](https://tally.so/r/mDev0q) to prioritize it.

## Getting Started with Development

To start developing with the OpenInt Gateway Gateway, follow these steps:

1. Clone the repository and navigate to the project directory.

2. Install dependencies:

   ```
   npm install
   ```

3. Set up your local `config.json`:
   Create a `config.json` file in the root directory. This file should include your Cloudflare credentials. For more details on OpenInt Gateway configuration, please check our [wiki page](https://github.com/openintegrations/openint/wiki/OpenInt Gateway-Configuration-Guide).

4. Run the development server:

   ```
   npm run dev
   ```

5. To build the gateway:

   ```
   npm run build
   ```

6. To deploy to Cloudflare Workers:

   ```
   npm run deploy
   ```
