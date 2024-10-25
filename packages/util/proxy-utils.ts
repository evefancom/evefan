/* eslint-disable @typescript-eslint/no-explicit-any */
export function noopFunctionMap<T = any>() {
  return new Proxy({}, {get: () => () => undefined}) as T
}
