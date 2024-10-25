import type {NextApiHandler} from 'next'

import {serverAnalytics} from '../../lib-server/analytics-server'

//  true
export default (async (_req, _res) => {
  serverAnalytics.track('test', {name: 'debug/debug', data: {}})
  await serverAnalytics.flush()
  throw new Error('Sentry Backend Error')
}) satisfies NextApiHandler
