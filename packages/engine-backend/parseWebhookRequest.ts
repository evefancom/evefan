import type {Id, WebhookInput} from '@openint/cdk'
import type {NonEmptyArray} from '@openint/util'
import type {RouterInput} from './router'

const kWebhook = 'webhook' as const

/**
 * Do we also need a parseWebhookResponse? To allow setting headers, redirects and others?
 * @deprecated because we should just use openAPI for this, no need for trpc
 */
export function parseWebhookRequest(
  req: WebhookInput & {pathSegments: NonEmptyArray<string>; method?: string},
) {
  const [procedure, ccfgId] = req.pathSegments
  if (procedure !== kWebhook) {
    return {...req, procedure}
  }

  // Consider naming it connectorConfigId? not sure.
  const input: RouterInput['handleWebhook'] = [
    ccfgId!,
    {query: req.query, headers: req.headers, body: req.body},
  ]
  return {
    ...req,
    procedure: 'handleWebhook',
    // Need to stringify because of getRawProcedureInputOrThrow
    ...(req.method?.toUpperCase() === 'GET'
      ? {query: {...req.query, input: JSON.stringify(input)}}
      : {body: input}),
  }
}
parseWebhookRequest.isWebhook = (pathSegments: NonEmptyArray<string>) =>
  pathSegments[0] === kWebhook

parseWebhookRequest.pathOf = (ccfgId: Id['ccfg']) =>
  [kWebhook, ccfgId].join('/')
