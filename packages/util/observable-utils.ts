import * as rxjs from 'rxjs'
import * as Rx from 'rxjs/operators'

import {Deferred, withConcurrency} from './promise-utils'

export {rxjs, Rx}

/** Observable version of async-limiter / async-sema RateLimit */
export function operateForEach<T, U>(
  item$: rxjs.Observable<T>,
  fn: (item: T, index: number) => Promise<U>,
  opts?: {concurrency?: number},
) {
  const concurrency = opts?.concurrency ?? 50
  let i = 0
  return rxjs.lastValueFrom(
    item$.pipe(
      Rx.map((item) => {
        const index = i // Capture the value
        return rxjs.defer(() => fn(item, index))
      }),
      Rx.tap(() => i++),
      Rx.mergeAll(concurrency),
      // Rx.flatMap(fn),
      // Rx.map((op) => pick(op, 'result', 'errorMessage', 'id')),
      Rx.toArray(),
    ),
  )
}

/**
 * Does this work?
 * Inspiration from
 * https://stackoverflow.com/questions/57045892/rxjs-mergemap-with-original-order
 */
export function mapAsync<T, U>(
  fn: (value: T, index: number) => Promise<U>,
  concurrency?: number,
): rxjs.OperatorFunction<T, U> {
  const project = concurrency ? withConcurrency(concurrency, fn) : fn
  return rxjs.pipe(Rx.map(project), Rx.concatAll())
}

/**
 * Courtesy of https://stackoverflow.com/questions/50515357/debounce-and-buffer-an-rxjs-subscription
 * Initially discovered while working on rehydrateRepos to buffer changes
 */
export function bufferDebounce<T>(
  debounce: number,
): rxjs.OperatorFunction<T, T[]> {
  return (source) => {
    const src = source.pipe(Rx.share()) // Avoid subscribing to the source more than once
    return new rxjs.Observable((observer) =>
      src
        .pipe(Rx.buffer(src.pipe(Rx.debounceTime(debounce))))
        .subscribe(observer),
    )
  }
}

export function tapTeartown<T>(
  teardown: rxjs.TeardownLogic,
): rxjs.OperatorFunction<T, T> {
  return (obs) =>
    new rxjs.Observable((observer) => {
      const sub = obs.subscribe(observer)
      sub.add(teardown)
      return sub
    })
}

interface CancellablePromise<T> extends Promise<T> {
  /**
   * Cancel will unsub and complete the promise
   * Unlike rxjs.unsub which will not complete or error
   * Nor like AbortController which will reject promise with error
   *
   */
  cancel(): void
}

/**
 * Turns observable into a promise that completes with little helper to abort
 * Will throw if error occurs. If aborted, promise will never resolve.
 */
export const toCompletion = <T>(
  obs: rxjs.Observable<T>,
  next?: (value: T) => void,
) => {
  const def = new Deferred<void>()
  const sub = obs.subscribe({next, complete: def.resolve, error: def.reject})
  const promise = def.promise as unknown as CancellablePromise<T>
  promise.cancel = () => {
    console.log('[toCompletion] Cancelled')
    sub.unsubscribe()
    def.resolve()
    return promise
  }
  return promise
}

export const fromCompletion = <T = never>(
  promise: Promise<unknown> | (() => Promise<unknown>),
) =>
  rxjs
    .from(typeof promise === 'function' ? promise() : promise)
    // Promise<void> would still emit `undefined`. Therefore we need to ignore it
    .pipe(Rx.ignoreElements()) as rxjs.Observable<T>

export const fromNonVoid = <T>(
  promise: Promise<T>,
): rxjs.Observable<Exclude<T, undefined>> =>
  rxjs
    .from(promise) // void returns as undefined
    .pipe(Rx.filter((v): v is Exclude<typeof v, undefined> => v !== undefined))

// Not clear to me why the observable equivalent does not work
// https://share.cleanshot.com/SICrdY. Oh well...
// export function withConcurrency2<Args extends unknown[], T>(
//   concurrency: number,
//   fn: (...args: Args) => rxjs.ObservableInput<T>,
// ) {
//   const sema = new Sema(concurrency)
//   return (...args: Args): rxjs.ObservableInput<T> =>
//     rxjs.from(sema.acquire().then(() => {
//       console.log('acquire')
//     })).pipe(
//       Rx.mergeMap(() => fn(...args)),
//       Rx.concatWith(rxjs.defer(() => {
//         console.log('release')
//         sema.release()
//         return rxjs.EMPTY
//       })),
//     )
// }
