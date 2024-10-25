// Adapted from https://github.com/blend/promise-utils/blob/6ca9c71c55781b6db20a5d196e61b58489ed0478/src/delay.ts#L9
import {Sema} from 'async-sema'
import type {MaybePromise} from './type-utils'

export {RateLimit} from 'async-sema'

/** Aka sleep */
export async function delay<T>(delayTimeMs: number, value: T): Promise<T>
export async function delay<T>(delayTimeMs: number): Promise<void>
export async function delay<T>(
  delayTimeMs: number,
  value?: T,
): Promise<void | T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayTimeMs))
}

export class Deferred<T> {
  resolve!: (ret: T | PromiseLike<T>) => void
  reject!: (reason?: unknown) => void
  completed = false
  promise = new Promise<T>((resolve, reject) => {
    this.reject = (err) => {
      // Should we prevent / warn on calls post-completion?
      reject(err)
      this.completed = true
    }
    this.resolve = (val) => {
      resolve(val)
      this.completed = true
    }
  })
}

export function withConcurrency<Args extends unknown[], T>(
  concurrency: number,
  fn: (...args: Args) => Promise<T>,
) {
  const sema = new Sema(concurrency)
  return async (...args: Args) => {
    await sema.acquire()
    try {
      return await fn(...args)
    } finally {
      sema.release()
    }
  }
}

export function fromMaybePromise<T>(maybePromise: MaybePromise<T>) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  if (maybePromise && typeof (maybePromise as any).then === 'function') {
    return maybePromise as Promise<T>
  }
  return Promise.resolve(maybePromise) as Promise<T>
}
