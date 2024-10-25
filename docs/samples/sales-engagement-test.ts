import {initOpenIntSDK} from '@openint/sdk'

const openint = initOpenIntSDK({
  baseUrl: process.env['_VENICE_API_HOST'],
  headers: {
    'x-apikey': process.env['_VENICE_API_KEY'],
    'x-resource-id': process.env['_APOLLO_RESOURCE_ID'] as `reso_${string}`,
    // resourceId: process.env['_OUTREACH_RESOURCE_ID'],
    // resourceId: process.env['_SALESLOFT_RESOURCE_ID'],
  },
})

void openint.GET('/unified/sales-engagement/contact').then((r) => {
  console.log(r.data)
})

// void venice
//   .POST('/core/resource/{id}/source_sync', {
//     params: {path: {id: process.env['_APOLLO_RESOURCE_ID']!}},
//     body: {streams: {contact: true}},
//   })
//   .then((r) => {
//     console.log(r.data)
//   })
