import * as fs from 'node:fs'
import * as path from 'node:path'
import tablemark from 'tablemark'
import {buildUrl, R} from '@openint/util'
import {parseConnectorConfigsFromRawEnv} from './connector-envs'
import {defConnectors} from './connectors/connectors.def'
import {env, envConfig} from './env'

const envList = R.pipe(
  {...envConfig.server, ...envConfig.client},
  R.toPairs,
  R.filter(
    ([key]) =>
      !key.startsWith('ccfg') ||
      Object.values(defConnectors).some((p) =>
        key.startsWith(`ccfg_${p.name}`),
      ),
  ),
  R.map(([key, schema]) => {
    const cmtLines = R.pipe(
      // ${schema.isOptional() ? '[Optional]' : '<Required>'}
      `${schema.description?.trim() ?? ''}`,
      (desc) => desc.split('\n').map((s) => s.trim()),
      R.compact,
    )

    return {
      key,
      Name: '`' + key + '`',
      Description: cmtLines.join('</br>'),
      dotEnvLine: R.pipe(cmtLines.map((c) => `# ${c}`).join('\n'), (cmts) =>
        R.compact([
          `${cmts}\n`, // cmtLines.length > 1 && `${cmts}\n`,
          `${key}=""`,
          // comment on same line is not supported by @next/env due to using old version of dotenv.
          // cmtLines.length <= 1 && ` ${cmts}`,
        ]).join(''),
      ),
    }
  }),
)

/** https://vercel.com/docs/deploy-button */
function makeVercelDeployButton(params: {
  // Basic info
  'repository-url': string
  'root-directory'?: string
  'project-name'?: string

  // Env vars
  /** Required env vars */
  env: string
  /** A short description of the Required Environment Variables. */
  envDescription?: string
  /** A link to an explanation of the Required Environment Variables */
  envLink?: string

  // Build settings
  'install-command'?: string

  /**
   * The Redirect URL parameter allows you to define a URL, other than the newly created Vercel project, to send the user to after a successful deployment.
   * This parameter is helpful if you are sending a user from an application, to deploy a project with Vercel, but want the user to continue with your application with a project created and deployed
   */
  'redirect-url'?: string

  // Demo info
  'demo-title'?: string
  'demo-description'?: string
  'demo-url'?: string
  /** URL of the screenshot of an example deployment */
  'demo-image'?: string
}) {
  const url = buildUrl({
    path: 'https://vercel.com/new/clone',
    params,
  })
  return {
    url,
    mkd: `[![Deploy with Vercel](https://vercel.com/button)](${url})`,
  }
}

const deployButton = makeVercelDeployButton({
  'repository-url': 'https://github.com/useVenice/venice',
  'root-directory': 'apps/web',
  'project-name': 'my-venice',
  env: [
    'POSTGRES_URL',
    'int_plaid__clientId',
    'int_plaid__secrets__sandbox',
    'JWT_SECRET',
  ].join(','),
  // Workaround for https://github.com/vercel/vercel/issues/8044
  // Remember to change `"packageManager": "pnpm@7.14.0",` setting to keep stuff in sync
  'install-command': 'npm i pnpm@7.14.0 -g && pnpm install',
  envDescription:
    'After deploy, you can add other optional environment variables to configure for production and customize the default behavior. See the full list in README',
  envLink: 'https://github.com/usevenice/venice#environment-variables',
  // 'redirect-url': 'https://link.useVenice.com/next-steps',
})
console.log(deployButton.url)

const readme = `
## Deploy

${deployButton.mkd}

## Environment variables

${tablemark(envList.map((env) => R.pick(env, ['Name', 'Description'])))}
`
const dotEnvExample = envList.map((env) => env.dotEnvLine).join('\n')

const readmeOutPath = path.join(__dirname, 'README.md')
fs.writeFileSync(readmeOutPath, readme)
console.log(`Wrote ${readmeOutPath}`)

const dotEnvExampleOutPath = path.join(__dirname, '../web', '.env.example')
fs.writeFileSync(dotEnvExampleOutPath, dotEnvExample)
console.log(`Wrote ${dotEnvExampleOutPath}`)

// console.log(dotEnvExample)

if (process.env.NODE_ENV !== 'production') {
  console.log('Test out loading env vars')
  const configs = parseConnectorConfigsFromRawEnv()
  console.log('Parsed env', env)
  console.log('Parsed intConfigs', configs)
}
