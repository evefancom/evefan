import {z} from '@opensdks/util-zod'
import {literal, mapper} from './mapper'

const Account = z.object({
  name: z.string(),
  url: z.string(),
  id: z.string(),
})

const HubspotAccount = z.object({
  title: z.string(),
  hbId: z.number(),
})
const hbAccountMap = mapper(HubspotAccount, Account, {
  id: 'title',
  name: literal('hub name yo'),
  url: (vendor) => `${vendor.hbId}`,
}).mapping

const mapper2 = (vendor: z.infer<typeof HubspotAccount>) => ({
  id: vendor.title,
  name: 'qbooooo',
  url: `${vendor.hbId}`,
})

test('doc gen', () => {
  Object.entries(hbAccountMap).forEach(([k, v]) => {
    console.log(
      k,
      ':',
      typeof v === 'function'
        ? v.toString()
        : typeof v === 'object' && 'keypath' in v
          ? `.${v.keypath}`
          : JSON.stringify(v),
    )
  })
  console.log(mapper2.toString())
  expect(true).toBeTruthy()
})
