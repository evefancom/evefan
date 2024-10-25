import type {Id} from '@openint/cdk'
import {contextFactory} from '@/../app-config/backendConfig'
import {getOrCreateApikey} from '@/lib-server'
import {serverComponentGetViewer} from '@/lib-server/server-component-helpers'
import {SqlPage} from './SqlPage'

export default async function SqlPageServer({
  params: {resourceId},
}: {
  params: {resourceId: Id['reso']}
}) {
  const viewer = await serverComponentGetViewer()
  const apikey = await getOrCreateApikey(viewer)
  const ctx = contextFactory.fromViewer(viewer)

  const resource = await ctx.services.getResourceOrFail(resourceId)
  if (resource.connectorName !== 'postgres') {
    return (
      <div className="p-6">Only postgres resources are supported for sql</div>
    )
  }

  return <SqlPage apikey={apikey} resourceId={resourceId} />
}
