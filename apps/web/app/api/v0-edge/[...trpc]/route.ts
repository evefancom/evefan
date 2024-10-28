import {modifyRequest, modifyResponse} from '@opensdks/fetch-links'

// edge runtime does not have a max duration but must return response within 25 seconds then must begin streaming
// This means we should explore running more things (like sync) on top fo the edge runtime and stream messages back
export const runtime = 'edge'

// Used to workaround issues where next.js node handler does not support incoming request with
// transfer-encoding: chunked
const handler = async (req: Request) => {
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
    ? await req.blob()
    : null
  console.log('[v0-edge] Request', {url: req.url, method: req.method})

  const modifiedReq = modifyRequest(req, {
    url: req.url.replace('/api/v0-edge', '/api/v0'),
    headers: (h) => {
      if (body) {
        h.set('content-length', body.size.toString())
      }
      h.delete('transfer-encoding')
    },
    body,
  })
  const res = await fetch(modifiedReq)

  console.log('[v0-edge] response', res.status, res.headers)

  // otherwise crash if header exists...
  return modifyResponse(res, {headers: (h) => h.delete('x-middleware-rewrite')})
}

export {
  handler as GET,
  handler as PUT,
  handler as POST,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
  handler as PATCH,
  handler as TRACE,
}
