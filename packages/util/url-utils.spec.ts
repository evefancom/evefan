import {
  parseUrl,
  stringifyUrl,
  joinPath,
  stringifyQueryParams,
} from './url-utils'
// import path from 'node:path'

test.each([
  ['http://example.com/', '/hello', 'http://example.com/hello'],
  ['http://example.com', '/hello', 'http://example.com/hello'],
  ['http://example.com', 'hello', 'http://example.com/hello'],
  ['http://example.com', 'hello/', 'http://example.com/hello/'],
  ['graphql/v1', '', 'graphql/v1'],
  ['rest/v1/', '', 'rest/v1/'],
  ['rest/v1/', '/', 'rest/v1/'],
  ['rest/v1/', '//', 'rest/v1/'],
  ['rest/v1/', '///', 'rest/v1/'],
  ['/rest/v1/', '', '/rest/v1/'],
  ['/', '/api/v1', '/api/v1'],
])('joinPath(%o, %o) -> %o', (p1, p2, output) => {
  // os.path.join does not handle :// , so this is actually not the same
  // expect(path.join(p1, p2)).toEqual(output)
  expect(joinPath(p1, p2)).toEqual(output)
})

test('delete query param', () => {
  const parsed = parseUrl('/rest/v1/?token=key_01GSH1T4KV4BP8QEA2SM0MTDS1')
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete parsed.query['token']
  expect(stringifyUrl(parsed)).toEqual('/rest/v1/')
})

test.each([
  [{metadata: {id: 123}}, 'metadata%5Bid%5D=123'],
  [{hello: 'world', again: '123'}, 'hello=world&again=123'],
])('stringifyQueryParams(%o) -> %o', (input, output) => {
  expect(stringifyQueryParams(input)).toEqual(output)
})
