export function isAsyncIterable<T>(input: unknown): input is AsyncIterable<T> {
  return (
    input != null &&
    typeof input === 'object' &&
    typeof (input as Record<string | symbol, unknown>)[Symbol.asyncIterator] ===
      'function'
  )
}

export function isIterable<T>(input: unknown): input is Iterable<T> {
  return (
    input != null &&
    typeof input === 'object' &&
    typeof (input as Record<string | symbol, unknown>)[Symbol.iterator] ===
      'function'
  )
}
