/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {noopFunctionMap} from './proxy-utils'

test('noopProxy', () => {
  const obj = noopFunctionMap()
  expect(obj.hello()).toEqual(undefined)
  expect(typeof obj.anything).toEqual('function')
})
