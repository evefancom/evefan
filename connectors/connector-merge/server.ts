/** Used for the side effect of window.MergeLink */

import initMergeSDK from '@opensdks/sdk-merge'
import type {ConnectorServer} from '@openint/cdk'
import {Rx, rxjs} from '@openint/util'
import type {mergeSchemas} from './def'
import {helpers} from './def'

export const mergeServer = {
  preConnect: async (config, context, input) => {
    const merge = initMergeSDK({
      headers: {authorization: `Bearer ${config.apiKey}`},
    })
    const res = await merge
      .POST('/create-link-token', {
        body: {
          end_user_origin_id: context.extEndUserId,
          end_user_email_address:
            input.end_user_email_address ?? 'test@example.com',
          end_user_organization_name:
            input.end_user_organization_name ?? 'Test Org',
          categories: input.categories ?? ['accounting'],
        },
      })
      .then((r) => r.data)
    return res
  },

  postConnect: async (connectOutput, config) => {
    const merge = initMergeSDK({
      headers: {authorization: `Bearer ${config.apiKey}`},
    })
    if ('publicToken' in connectOutput) {
      const res = await merge
        .GET('/account-token/{public_token}', {
          params: {path: {public_token: connectOutput.publicToken}},
        })
        .then((r) => r.data)

      // TODO: Add support for HRIS integrations and better understand the behavior across them

      const details = await merge.accounting
        .GET('/account-details', {
          params: {header: {'X-Account-Token': res.account_token}},
        })
        .then((r) => r.data)

      return {
        // There does not appear to be a unique id in addition to the access token...
        resourceExternalId: details.id ?? '',
        settings: {
          accountToken: res.account_token,
          accountDetails: details,
        },
        integration: {
          externalId: res.integration.slug,
          data: res.integration,
        },
        triggerDefaultSync: true,
      }
    }

    const details = await merge.accounting
      .GET('/account-details', {
        params: {header: {'X-Account-Token': connectOutput.accountToken}},
      })
      .then((r) => r.data)
    const integrations = await merge
      .GET('/integrations/', {})
      .then((r) => r.data)
    const integration = integrations.find(
      (i) => i.slug === details.integration_slug,
    )

    return {
      // There does not appear to be a unique id in addition to the access token...
      resourceExternalId: details.id ?? '',
      settings: {
        accountToken: connectOutput.accountToken,
        accountDetails: details,
      },
      integration: integration
        ? {externalId: integration.slug, data: integration}
        : undefined,
      triggerDefaultSync: true,
    }
  },

  revokeResource: async (settings, config) => {
    const merge = initMergeSDK({
      headers: {authorization: `Bearer ${config.apiKey}`},
    })
    await merge.accounting.POST('/delete-account', {
      params: {header: {'X-Account-Token': settings.accountToken}},
    })
  },

  newInstance: ({config, settings, fetchLinks}) =>
    initMergeSDK({
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'x-account-token': settings.accountToken,
      },
      links: (defaultLinks) => [...fetchLinks, ...defaultLinks],
    }),

  listIntegrations: async () => {
    const merge = initMergeSDK({headers: {}})
    const integrations = await merge
      .GET('/integrations/', {})
      .then((res) => res.data)

    return {
      has_next_page: false,
      next_cursor: null,
      items: integrations.map((int) => ({
        id: int.slug,
        name: int.name,
        updated_at: new Date().toISOString(),
        logo_url: int.square_image,
        raw_data: int as never,
      })),
    }
  },

  // MARK: -

  sourceSync: ({config, settings}) => {
    const header = {'X-Account-Token': settings.accountToken}
    const merge = initMergeSDK({
      headers: {authorization: `Bearer ${config.apiKey}`, ...header},
    })

    async function* iterateEntities() {
      yield await merge.accounting
        .GET('/accounts', {params: {header}})
        .then(
          (res) =>
            (res.data.results ?? [])?.map((acct) =>
              helpers._opData('account', acct.id ?? '', acct),
            ),
        )

      yield await merge.accounting
        .GET('/transactions', {params: {header}})
        .then(
          (res) =>
            (res.data.results ?? [])?.map((txn) =>
              helpers._opData('transaction', txn.id ?? '', txn),
            ),
        )
    }

    return rxjs
      .from(iterateEntities())
      .pipe(Rx.mergeMap((ops) => rxjs.from(ops)))
  },
} satisfies ConnectorServer<typeof mergeSchemas>

export default mergeServer
