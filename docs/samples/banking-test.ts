import {createRouterHandler} from '@openint/api'
import {loopbackLink} from '@openint/loopback-link'
import {initOpenIntSDK} from '@openint/sdk'
import bankingRouter from '@openint/unified-banking'

const openint = initOpenIntSDK({
  links: [
    loopbackLink({port: 3999}),
    // This can be used for code splitting, such that every router gets bundled into its own
    // separate serverless function, vastly improving startup times during both development and production
    // Will require a bit of code-generation to turn them into separate files so next.js knows to bundle
    // separate entry points
    createRouterHandler({router: bankingRouter}),
  ], // This bypasses the entire server-stack! And handles request directly in memory for easy testing.
  baseUrl: process.env['_VENICE_API_HOST'],
  headers: {
    'x-apikey': process.env['_VENICE_API_KEY'],
    'x-resource-id': process.env['_XERO_RESOURCE_ID'] as `reso_${string}`,
    // resourceId: process.env['_QBO_RESOURCE_ID'],
  },
})

void openint.GET('/unified/banking/category').then((r) => {
  console.log(r.data)
})

void openint
  .POST('/core/pipeline', {
    body: {
      id: '',
      streams: {contact: {fields: ['name', 'email'], disabled: true}},
    },
  })
  .then((r) => {
    console.log(r.data)
  })
