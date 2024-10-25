/* eslint-disable jest/no-standalone-expect */
import {initRevertSDK} from '@opensdks/sdk-revert'

const apiToken = process.env['_REVERT_API_TOKEN']
const maybeTest = apiToken ? test : test.skip

const revert = initRevertSDK({
  headers: {
    'x-revert-api-token': apiToken!,
    'x-revert-t-id': process.env['_REVERT_T_ID']!,
  },
})

maybeTest('should return a list of companies', async () => {
  const res = await revert.GET('/crm/companies')
  expect(res.data.status).toBe('ok')
})
