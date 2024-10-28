import {R, Rx, toCompletion} from '@openint/util'
import type {
  AnyEntityPayload,
  Destination,
  Link,
  ResoUpdateData,
  Source,
  StateUpdateData,
  SyncOperation,
} from './protocol'

type Data = AnyEntityPayload

// Consider whether we should still have `init` and `shutdown` events...
const COMMIT: Extract<SyncOperation, {type: 'commit'}> = {type: 'commit'}

/** The most fundamental implementation of using using protocol */
export async function sync<
  T extends Data = Data,
  TResoUpdate extends object = ResoUpdateData,
  TStateUpdate extends object = StateUpdateData,
>(input: {
  source: Source<T, TResoUpdate, TStateUpdate>
  destination: Destination<T, TResoUpdate, TStateUpdate>
  links?: Array<Link<T, T, TResoUpdate, TStateUpdate>>
  watch?: boolean
}) {
  const start = Date.now()
  let count = 0
  let ready = false
  await toCompletion(
    // Raw Source, may come from fs, firestore or postgres
    input.source
      // Final commit in case the source does not emit one to make sure
      // destination always get a chance before pipeline shuts down
      .pipe(Rx.endWith(COMMIT))
      // Plugins
      .pipe(
        ...((input.links ?? []) as [NonNullable<typeof input.links>[number]]),
      )
      // Destination
      .pipe(input.destination)
      // Progress & flow controlß
      .pipe(
        !input.watch ? Rx.takeWhile((e) => e.type !== 'ready') : R.identity,
      ),
    (e) => {
      count++
      if (ready) {
        console.warn(`#${count}: Event received after ready`, e)
      }
      if (!e) {
        console.log(`#${count}: Bad event`, e)
      } else if (e.type === 'ready') {
        console.log(`#${count}: Ready in ${Date.now() - start}ms`)
        ready = true
      } else if (e.type === 'data') {
        console.log(`#${count}: ${e.data.id} exists=${e.data.entity != null}`)
      } else {
        console.log(`#${count}: Received ${e.type} ${Date.now() - start}ms`)
      }
    },
  )
  console.log('Sync complete, should exit unless we have open handles')
  return count
}
