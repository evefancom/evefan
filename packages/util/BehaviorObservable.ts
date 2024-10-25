import {Rx, rxjs} from './observable-utils'

export interface BehaviorObservable<T> extends rxjs.Observable<T> {
  readonly value: T
}

/**
 * Observable with shared subscription and current value
 * (similar to BehaviorSubject if it was lazily instantiated and readonly)
 */
export class MulticastedBehaviorObservable<T>
  extends rxjs.Observable<T>
  implements BehaviorObservable<T>
{
  private subject: rxjs.BehaviorSubject<T>

  constructor(
    initialValue: T,
    subscribe?: (
      this: rxjs.Observable<T>,
      subscriber: rxjs.Subscriber<T>,
    ) => rxjs.TeardownLogic,
  ) {
    const subject = new rxjs.BehaviorSubject(initialValue)
    const source = new rxjs.Observable(subscribe).pipe(
      Rx.share({connector: () => subject}),
    )
    super((subscriber) => source.subscribe(subscriber))
    this.subject = subject
  }

  get value(): T {
    return this.subject.value
  }
}

export function mapBehaviorObservable<T, R>(
  source$: BehaviorObservable<T>,
  project: (value: T) => R,
): BehaviorObservable<R> {
  return new MulticastedBehaviorObservable<R>(
    project(source$.value),
    (subscriber) =>
      source$
        .pipe(
          Rx.skip(1),
          Rx.map((value) => project(value)),
          Rx.distinctUntilChanged(),
        )
        .subscribe(subscriber),
  )
}

export async function asyncMapBehaviorObservable<T, R>(
  source$: BehaviorObservable<T>,
  project: (value: T) => Promise<R>,
): Promise<BehaviorObservable<R>> {
  return new MulticastedBehaviorObservable<R>(
    await project(source$.value),
    (subscriber) =>
      source$
        .pipe(
          Rx.skip(1),
          Rx.switchMap((value) => rxjs.from(project(value))),
          Rx.distinctUntilChanged(),
        )
        .subscribe(subscriber),
  )
}

export function combineBehaviorObservables<
  TSources extends [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BehaviorObservable<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...Array<BehaviorObservable<any>>,
  ],
>(
  sources: TSources,
): BehaviorObservable<{
  [K in keyof TSources]: rxjs.ObservedValueOf<TSources[K]>
}>
export function combineBehaviorObservables<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSources extends Array<BehaviorObservable<any>>,
>(
  sources: TSources,
): BehaviorObservable<{
  [K in keyof TSources]: rxjs.ObservedValueOf<TSources[K]>
}>
export function combineBehaviorObservables<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSources extends Array<BehaviorObservable<any>>,
>(
  sources: TSources,
): BehaviorObservable<{
  [K in keyof TSources]: rxjs.ObservedValueOf<TSources[K]>
}> {
  return new MulticastedBehaviorObservable<{
    [K in keyof TSources]: rxjs.ObservedValueOf<TSources[K]>
  }>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    sources.map((s) => s.value) as {
      [K in keyof TSources]: rxjs.ObservedValueOf<TSources[K]>
    },
    (subscriber) =>
      rxjs
        .combineLatest(sources)
        .pipe(Rx.skip(1))
        .subscribe(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subscriber as rxjs.Subscriber<any[]>,
        ),
  )
}
