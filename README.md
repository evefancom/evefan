<h1 align="center">
  <img id="theme-icon" width="300" src="https://console.evefan.com/img/brand/evefan-dark.png" alt="evefan">
</h1>
<p align="center">
  <p align="center"><b> Evefan — Unmetered Events Ingestion</b></p>
  <p align="center"><b> Serverless and on-prem </b> — without the overhead of Kafka or Spark.</p>
  <p align="center">Achieve <b>99% Costs Savings</b> with <b>Cloudflare Workers 💸</b></p>
  <p align="center"><b>Your Very Own Internet Scale Events Infrastructure</b></p>
</p>

<h4 align="center">
  <a href="https://docs.evefan.com">Docs</a> |
  <a href="https://evefan.com">Website</a>
</h4>

<h4 align="center">
  <a href="https://github.com/evefancom/evefan/blob/main/LICENSE.md">
    <img src="https://img.shields.io/badge/license-ELv2-white.svg" alt="Evefan is released under the Elastic License 2.0" />
  </a>
  <a href="https://github.com/evefancom/evefan/issues">
    <img src="https://img.shields.io/github/commit-activity/m/evefancom/evefan" alt="git commit activity" />
  </a>
  <a href="https://twitter.com/evefanhq">
    <img src="https://img.shields.io/twitter/follow/evefanhq?label=Follow" alt="Evefan Twitter" />
  </a>
</h4>

## Introduction

Evefan enables developers to privately capture, transform and deliver customer events at any scale.

Evefan is open source and self-hosted on Cloudflare workers. It can be configured either via Evefan Console or using Wrangler. Get started in minutes using the [Evefan Console](https://console.evefan.com).

<h1 align="center">
    <img src="https://console.evefan.com/img/brand/event-fan.png" alt="event-fan">
</h1>

## Getting Started

By FAR, the simplest way to configure, deploy, and observe Evefan is via [the Console](https://console.evefan.com).

You can review our official docs for our quick start steps: https://docs.evefan.com

We never get access to your data. However, for the inspired, you can always do that yourself using Wrangler using our [alternative configuration guide here](https://github.com/evefancom/evefan/wiki).

## High-Level Architecture

You can read more about the architecture in our [Architecture documentation](/architecture.md).

## Supported Destinations

Evefan currently supports the following destinations for event fan-out:

1. BigQuery: Google's fully managed, serverless data warehouse
2. Postgres: Open-source relational database management system
3. Mixpanel: Product analytics platform for tracking user interactions

Each destination has its own specific implementation for data insertion and error handling, ensuring optimal performance and reliability.

Missing an integration? [Let us know](https://tally.so/r/mDev0q) to prioritize it.

## Getting Started with Development

To start developing with the Evefan Worker, follow these steps:

1. Clone the repository and navigate to the project directory.

2. Install dependencies:

   ```
   npm install
   ```

3. Set up your local `config.json`:
   Create a `config.json` file in the root directory. This file should include your Cloudflare credentials. For more details on Evefan configuration, please check our [wiki page](https://github.com/evefancom/evefan/wiki/Evefan-Configuration-Guide).

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
