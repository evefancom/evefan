import {initLeverSDK, type leverTypes} from '@opensdks/sdk-lever'
import {nangoProxyLink, type ConnectorServer} from '@openint/cdk'
import {type leverSchemas} from './def'
import {EtlSource, NextPageCursor, observableFromEtlSource} from '../connector-common'

export type LeverSDK = ReturnType<typeof initLeverSDK>

export type LeverTypes = leverTypes

export type LeverObjectType = LeverTypes['components']['schemas']

export const leverServer = {
  newInstance: ({config, settings, fetchLinks}) => {
    const lever = initLeverSDK({
      headers: {
        authorization: `Bearer ${settings.oauth.credentials.access_token}`,
      },
      envName: config.envName,
      links: (defaultLinks) => [
        (req, next) => {
          if (lever.clientOptions.baseUrl) {
            req.headers.set(
              nangoProxyLink.kBaseUrlOverride,
              lever.clientOptions.baseUrl,
            )
          }
          return next(req)
        },
        ...fetchLinks,
        ...defaultLinks
      ],
    })
    return lever
  },
  sourceSync: ({instance: lever, streams, state}) =>
    observableFromEtlSource(
      leverSource({sdk: lever}),
      streams,
      (state ?? {}) as {},
    ),
} satisfies ConnectorServer<
  typeof leverSchemas,
  ReturnType<typeof initLeverSDK>
>

export default leverServer

// TODO: Implement incremental sync
// TODO2: Implement low-code connector spec
function leverSource({sdk}: {sdk: LeverSDK}): EtlSource<{
  posting: LeverObjectType['posting']
  // contact: LeverObjectType['contact']
  opportunity: LeverObjectType['opportunity']
  offer: LeverObjectType['offer']
  // Add other entity types as needed
}> {
  return {
    // @ts-expect-error discuss with tony 
    async listEntities(type, {cursor}) {
      const {next_page: page} = NextPageCursor.fromString(cursor)
      
      if (type === 'offer') {
        const opportunitiesRes = await sdk.GET('/opportunities', {
          params: {query: {limit: 50, offset: cursor ?? undefined}}
        })

        const allOffers = []
        for (const opportunity of opportunitiesRes.data.data) {
          const offersRes = await sdk.GET(`/opportunities/{id}/offers`, {
            params: {path: {id: opportunity.id}}
          })

          allOffers.push(...offersRes.data.data.map((e) => ({id: `${e.id}`, data: e})))
        }

        return {
          entities: allOffers,
          next_cursor: NextPageCursor.toString({next_page: page + 1}),
          has_next_page: opportunitiesRes.data.hasNext ?? false,
        }
      }
      // for opportunity or posting
      const pluralizeType = (type: string) => type === 'opportunity' ? 'opportunities' : `${type}s`;
      
      const res = await sdk.GET(`/${pluralizeType(type) as 'postings' | 'opportunities'}`, {
        params: {query: {limit: 50, offset: cursor ?? undefined}}
      })

      return {
        entities: res.data.data.map((e) => ({id: `${e.id}`, data: e})),
        next_cursor: NextPageCursor.toString({next_page: page + 1}),
        has_next_page: res.data.hasNext ?? false,
      }
    },
  }
}
