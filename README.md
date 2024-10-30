[![ELv2 License](https://img.shields.io/badge/license-ELv2-green)](https://www.elastic.co/licensing/elastic-license)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)

# Open Integrations

OpenInt enables teams to ship product integrations in hours, not weeks, using no or low code. Read and write data using unified APIs or sync it straight to your database.

## Usage guide (WIP)

- [Getting started code sample](./docs/samples/getting-started.ts)
- [Full next.js example](https://github.com/openint-dev/examples)

## Deployment checklist

First setup dependencies

- Postgres (recommend Vercel postgres)
- Clerk (will be made optional later)
  - Setup JWT Template -> Supabase
    - Use `pwgen 32 -1 | pbcopy` for jwt secret
  - Enable organizations
  - (Use the development env is enough for private use )
- Nango (should be but not yet optional if oauth connections are not used)
- Inngest (optional if sync is desired)

Then deploy

- Vercel
  - In addition env vars from the previous dependencies, set up
    - `NEXT_PUBLIC_SERVER_URL` so that it is a nicer url that the unique per deployment URL that comes by default from Vercle
      - For things like magic link generation
  - Disable deployment protection is the simplest way to get Inngest branch environments to work

## Development guide

### Local https development

Some services (e.g. Clerk, certain oauth redirect / webhooks) require HTTPS, which is a challenge for local development.

One could use ngrok, but an alternative is to modify /etc/hosts along with a locally provisioned & trusted https certificate and handle SSL termination

```sh
# Hosts table modification
echo '127.0.0.1       local.openint.dev' | sudo tee -a /etc/hosts
# Provission certificate
brew install mkcert
mkcert -install # follow the installation instructions of mkcert if any
cd ~/.ssh
mkcert local.openint.dev
# Local ssl terminiation
npm install -g local-ssl-proxy
local-ssl-proxy --source 443 --target 3000 --cert ~/.ssh/local.openint.dev.pem --key ~/.ssh/local.openint.dev-key.pem
```

## Contributors

<img src="https://contributors-img.web.app/image?repo=openintegrations/openint"/>

### Random commands that are useful

```bash
pnpm --dir  kits/connect/ clean
pnpm --dir  kits/connect/ build
pnpm --dir  kits/connect/ pub
```

```bash
NEXT_PUBLIC_SERVER_URL=https://openint.dev shdotenv -e .env.prod pnpm --dir ./kits/sdk gen
```
