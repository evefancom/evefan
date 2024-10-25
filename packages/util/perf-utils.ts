export function withPerf<T = void>(
  message: string | [string, ...unknown[]],
  fn: () => T,
) {
  const start = performance.now()
  const ret = fn()
  const end = performance.now()
  if (typeof process !== 'undefined' && process.env['LOG_LEVEL'] === 'warn') {
    return ret
  }
  if (Array.isArray(message)) {
    console.debug(`${message[0]} (in ${end - start}ms)`, ...message.slice(1))
  } else {
    console.debug(`${message} (in ${end - start}ms)`)
  }
  return ret
}
