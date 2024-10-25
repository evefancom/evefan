import type {NextApiHandler} from 'next'

export default ((_req, res) => {
  console.log('req.query', _req.query)
  res.send({ok: true})
}) satisfies NextApiHandler
