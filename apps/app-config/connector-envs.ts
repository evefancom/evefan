/** @deprecated. We no longer initialize integration from ENVs, but maybe in clis still? */
import type {ConnectorSchemas, ConnHelpers} from '@openint/cdk'
import {makeId} from '@openint/cdk'
import {R, z, zEnvVars, zFlattenForEnv} from '@openint/util'
import {defConnectors} from './connectors/connectors.def'

/** We would prefer to use `.` but vercel env var name can only be number, letter and underscore... */
const separator = '__'
const getPrefix = (name: string) => makeId('ccfg', name, '')

// Should this be all providers or only dcoumented ones?

export const zFlatConfigByProvider = R.mapValues(defConnectors, (def, name) =>
  zFlattenForEnv(
    (def.schemas as ConnectorSchemas)?.connectorConfig ?? z.unknown(),
    {
      prefix: getPrefix(name),
      separator,
    },
  ),
)

export const zConnectorConfigEnv = zEnvVars(
  R.pipe(
    zFlatConfigByProvider,
    R.values,
    R.map((schema) => schema.innerType().shape),
    R.mergeAll,
  ) as {},
)

// MARK: - Parsing connector configs

/**
 * Input env must be raw, so means most likely we are parsing the flatConfig input twice
 * for the moment unfortunately... But we need this to support transforms in flatConfig
 */
export function parseConnectorConfigsFromRawEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return R.pipe(
    R.mapValues(zFlatConfigByProvider, (zFlatConfig, name) => {
      const subEnv = R.pipe(
        R.pickBy(env, (_v, k) => k.startsWith(getPrefix(name))),
        (e) => (R.keys(e).length ? e : undefined), // To get .optional() to work
      )
      try {
        return zFlatConfig.optional().parse(subEnv)
      } catch (err) {
        if (err instanceof z.ZodError && err.issues[0]) {
          const issue = err.issues[0]
          // const msg = issue.code === 'invalid_type' && issue.message === 'Required' ? ``
          // console.log('subEnv', subEnv, issue)
          throw new Error(
            `Failed to configure "${name}" provider due to invalid env var "${issue.path.join(
              separator,
            )}": ${issue.message} [${issue.code}]`,
          )
        }
        return undefined
      }
    }),
    (configMap) => R.pickBy(configMap, (val) => val !== undefined),
  ) as {
    [k in keyof typeof defConnectors]?: GetConnectorConfig<
      ConnHelpers<(typeof defConnectors)[k]['schemas']>['_types']
    >
  }
}

/** Feels like bit of a hack... */
type GetConnectorConfig<T> = T extends {connectorConfig: unknown}
  ? T['connectorConfig']
  : {}
