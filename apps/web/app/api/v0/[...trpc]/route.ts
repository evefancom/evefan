import {createAppHandler} from '@openint/api'

/** https://vercel.com/docs/functions/runtimes#max-duration */
export const maxDuration = 300

// TODO: Add handling for CORS
// Also we may need to check for req.headers['transfer-encoding'] === 'chunked'
// Was not supported on pages router, maybe better on app router?
const handler = createAppHandler({endpoint: '/api/v0'})

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
}
