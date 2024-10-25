import type {NextApiRequest, NextApiResponse} from 'next'
import {renderTrpcPanel} from 'trpc-panel'
import {appRouter} from '@openint/api'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // req.url is normally `/api/trpc` already which is the right place
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  res.status(200).send(renderTrpcPanel(appRouter, {url: req.url!}))
}
