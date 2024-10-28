import type {Id} from '@openint/cdk'
import {contextFactory} from '@/../app-config/backendConfig'
import {getOrCreateApikey} from '@/lib-server'
import {serverComponentGetViewer} from '@/lib-server/server-component-helpers'
import {PlaygroundPage} from './PlaygroundPage'

export default async function PlaygroundPageServer({
  params: {resourceId},
}: {
  params: {resourceId: Id['reso']}
}) {
  const viewer = await serverComponentGetViewer()
  const apikey = await getOrCreateApikey(viewer)
  const ctx = contextFactory.fromViewer(viewer)

  const resource = await ctx.services.getResourceExpandedOrFail(resourceId)

  const oas = resource.connectorConfig.connector.metadata?.openapiSpec?.proxied

  if (!oas) {
    return (
      <div className="p-6">
        {resource.connectorName} does not have OpenAPI spec
      </div>
    )
  }

  return <PlaygroundPage apikey={apikey} resourceId={resourceId} oas={oas} />
}
