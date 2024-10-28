export function streamFromPromise<T>(promise: Promise<T>) {
  return new ReadableStream<T>({
    start(controller) {
      promise
        .then((value) => {
          controller.enqueue(value)
          controller.close()
        })
        .catch((err) => {
          controller.error(err)
        })
    },
  })
}

/** Polyfill for the `.from` method that is implemented in node but not Chromium */
export function streamFromIterable<T>(
  iterable: Iterable<T> | AsyncIterable<T>,
) {
  let iter: Iterator<T> | AsyncIterator<T>

  function handleResult(
    controller: ReadableStreamDefaultController<T>,
    result: IteratorResult<T>,
  ) {
    if (result.done) {
      controller.close()
    } else {
      controller.enqueue(result.value)
    }
  }

  return new ReadableStream<T>({
    start() {
      iter =
        Symbol.iterator in iterable
          ? iterable[Symbol.iterator]()
          : Symbol.asyncIterator in iterable
            ? iterable[Symbol.asyncIterator]()
            : (null as never)
    },
    pull(controller) {
      try {
        const res = iter.next()
        if ('then' in res) {
          res
            .then((result) => handleResult(controller, result))
            .catch((err) => {
              controller.error(err)
            })
        } else {
          handleResult(controller, res)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

export function noopWritable() {
  return new WritableStream<unknown>({})
}

export function flatMap<T, U>(transform: (chunk: T) => U[] | Promise<U[]>) {
  return new TransformStream<T, U>({
    transform: (chunk, controller) => {
      try {
        const res = transform(chunk)
        if (typeof res === 'object' && res && 'then' in res) {
          res
            .then((value) => value.forEach((v) => controller.enqueue(v)))
            .catch((err) => controller.error(err))
        } else {
          res.forEach((v) => controller.enqueue(v))
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

export function tap<T>(fn: (chunk: T) => void) {
  return flatMap((c: T) => {
    fn(c)
    return [c]
  })
}
