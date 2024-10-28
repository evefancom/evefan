/**
 * Wraps around the given object and throws an error if a property is accessed that is `null` or `undefined`.
 * Useful for getting values from things like headers or env vars
 */
export function proxyRequired<T extends object>(
  target: T,
  opts?: {formatError?: (key: string, value: unknown) => Error},
) {
  const formatError =
    opts?.formatError ?? ((key) => new Error(`${key} is required`))

  return new Proxy(target, {
    get(target, p) {
      const value = target[p as keyof typeof target]
      if (value == null) {
        throw formatError(p as string, value)
      }
      return value
    },
  }) as {[k in keyof typeof target]-?: NonNullable<(typeof target)[k]>}
}
