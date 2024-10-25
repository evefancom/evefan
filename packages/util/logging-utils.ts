export function makeLogger(tag?: string, data?: Record<string, unknown>) {
  function wrapLogFunction(
    fn: (message?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    return (message?: unknown, ...optionalParams: unknown[]) => {
      const args: unknown[] = []
      if (typeof tag == 'string') {
        args.push(`[${tag}]`)
      }
      if (typeof message === 'string') {
        args.push(message)
      }
      args.push(...optionalParams)
      if (data) {
        args.push(data)
      }

      fn(...args)
    }
  }

  return {
    log: wrapLogFunction(console.log),
    info: wrapLogFunction(console.info),
    warn: wrapLogFunction(console.warn),
    error: wrapLogFunction(console.error),
    debug: wrapLogFunction(console.debug),
  }
}

export type Logger = ReturnType<typeof makeLogger>
