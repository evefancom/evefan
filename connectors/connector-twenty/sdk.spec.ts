/* eslint-disable jest/no-standalone-expect */
import {initTwentySDK} from '@opensdks/sdk-twenty'

const accessToken = process.env['TWENTY_ACCESS_TOKEN']
const maybeTest = accessToken ? test : test.skip

const twenty = initTwentySDK({
  headers: {authorization: `Bearer ${accessToken}`},
})

maybeTest('should return a list of companies', async () => {
  const res = await twenty.core.GET('/companies')
  expect(res.data.data?.companies).toBeTruthy()
})

maybeTest('CRUD company', async () => {
  const create = await twenty.core.POST('/companies', {
    body: {name: 'test company', domainName: 'test.com'},
  })

  // Twenty bug. @see https://revert-dev.slack.com/archives/C06KH6J8UTD/p1711079562721159
  const company = create.data.data?.['createCompany']
  expect(company?.id).toBeTruthy()

  const update = await twenty.core.PATCH('/companies/{id}', {
    body: {domainName: 'test2.com'},
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params: {path: {id: company!.id!}},
  })
  expect(update.data.data?.['updateCompany']?.domainName).toEqual('test2.com')

  const get = await twenty.core.GET('/companies/{id}', {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params: {path: {id: company!.id!}},
  })

  expect(get.data.data?.company?.name).toBe('test company')

  const del = await twenty.core.DELETE('/companies/{id}', {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    params: {path: {id: company!.id!}},
  })
  expect(del.data.data?.['deleteCompany']?.id).toEqual(company?.id)

  // https://revert-dev.slack.com/archives/C06KH6J8UTD/p1711080124005239
  // This does not work at the moment due to bug in Twenty that actually returns 200
  // for not found...
  // await expect(() =>
  //   twenty.core.GET('/companies/{id}', {
  //     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //     params: {path: {id: company?.id!}},
  //   }),
  // ).rejects.toThrow('404')
})
