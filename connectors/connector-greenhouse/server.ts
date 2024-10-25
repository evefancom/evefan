import {initGreenhouseSDK, type greenhouseTypes} from '@opensdks/sdk-greenhouse'
import type {ConnectorServer} from '@openint/cdk'
import {type greenhouseSchema} from './def'
import {EtlSource, NextPageCursor, observableFromEtlSource} from '../connector-common'

export type GreenhouseSDK = ReturnType<typeof initGreenhouseSDK>

export type GreenhouseTypes = greenhouseTypes

export type GreenhouseObjectType = GreenhouseTypes['components']['schemas']

export const greenhouseServer = {
  newInstance: ({settings}) => {
    const greenhouse = initGreenhouseSDK({
      auth: {basic: {username: settings.apiKey, password: ''}},
    })
    return greenhouse
  },
  sourceSync: ({instance: greenhouse, streams, state}) =>
    observableFromEtlSource(
      greenhouseSource({sdk: greenhouse}),
      streams,
      (state ?? {}) as {},
    ),
} satisfies ConnectorServer<
  typeof greenhouseSchema,
  ReturnType<typeof initGreenhouseSDK>
>

export default greenhouseServer


// TODO: Implement incremental sync
// https://developers.greenhouse.io/harvest.html#get-list-jobs
// TODO2: Implement low-code connector spec
function greenhouseSource({sdk}: {sdk: GreenhouseSDK}): EtlSource<{
  job: GreenhouseObjectType['job']
  candidate: GreenhouseObjectType['candidate']
  application: GreenhouseObjectType['application']
  opening: GreenhouseObjectType['opening']
  offer: GreenhouseObjectType['offer']
}> {
  return {
    // Perhaps allow cursor implementation to be passed in as a parameter
    // @ts-expect-error ile greenhouse sdk is updated
    async listEntities(type, {cursor}) {
      const {next_page: page} = NextPageCursor.fromString(cursor)

      const isOpening = type === 'opening'
      if(isOpening) {
        console.debug('[greenhouse] opening type detected, using job type instead')
        type = 'job' as typeof type
      }
      const res = await sdk.GET(`/v1/${type as 'job'}s`, {
        params: {query: {per_page: 50, page}},
      })

      return {
        entities: isOpening ?
          res.data.flatMap((j) => j.openings.map((o) => ({id: `${o.id}`, data: {job_id: j.id, ...o}}))) : 
          res.data.map((j) => ({id: `${j.id}`, data: j})),
        next_cursor: NextPageCursor.toString({next_page: page + 1}),
        // TODO: instead check for count / from response header
        has_next_page: res.data.length === 0,
      }
    },
  }
}

