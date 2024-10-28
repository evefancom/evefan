import type {ConnectorServer, SyncOperation} from '@openint/cdk'
import {handlersLink} from '@openint/cdk'
import type {z} from '@openint/util'
import {
  $chokidar,
  $path,
  $readFile,
  fromCompletion,
  joinPath,
  mapAsync,
  R,
  Rx,
  rxjs,
  safeJSONParse,
  writeJson,
} from '@openint/util'
import type {fsSchemas, zWatchPathsInput} from './def'

export const _pathFromId = (basePath: string, id: string) =>
  joinPath(basePath, `${id}.json`)

export const fsServer = {
  sourceSync: ({settings, state}) =>
    _fsWatchPaths$({...settings, ...state}).pipe(_readPathData()),
  destinationSync: ({settings: {basePath}}) =>
    // TODO: Should we add the resourceId to data?
    handlersLink({
      data: ({data}) =>
        fromCompletion(
          writeJson(
            _pathFromId(basePath, `${data.entityName}/${data.id}`),
            data.entity,
          ),
        ),
    }),
} satisfies ConnectorServer<typeof fsSchemas>

// MARK: - Source sync helpers

/** id: filename, entityName: dirname */
type FSPathEvent = SyncOperation<
  | {entity: 'add'; entityName: string; id: string; path: string}
  | {entity: 'change'; entityName: string; id: string; path: string}
  | {entity: 'unlink'; entityName: string; id: string; path: string}
>

type FSDataEvent = SyncOperation

function _fsWatchPaths$({basePath, paths}: z.infer<typeof zWatchPathsInput>) {
  return new rxjs.Observable<FSPathEvent>((sub) => {
    console.log('[fsWatchLedger] Start watching', paths)
    const watcher = $chokidar() // Can we do await import('chodikar')?
      .watch(paths?.map((p) => $path().join(basePath, p)) ?? basePath, {
        awaitWriteFinish: {stabilityThreshold: 1000},
      })
      // eslint-disable-next-line @typescript-eslint/require-await
      .on('all', async (event, path) => {
        if (event !== 'add' && event !== 'change' && event !== 'unlink') {
          return
        }
        const entityName = R.pipe(
          path,
          (p) => $path().relative(basePath, p),
          (p) => $path().dirname(p),
        )
        const id = R.pipe(
          path,
          (p) => [$path().basename(p), $path().extname(p)] as const,
          ([base, ext]) =>
            ext === '.json' ? base.slice(0, -1 * ext.length) : null,
        )
        if (!id) {
          // !filename is noop, hacking type
          console.debug(`[fsWatchLedger$] Ignored ${event} ${path}`)
          return
        }
        // const id = filename.slice(0, -1 * extName.length)
        sub.next({
          type: 'data',
          data: {entity: event, id, entityName, path},
        })
      })
      .on('error', (err) => sub.error(err))
      .on('ready', () => {
        sub.next({type: 'ready'})
      })
    return () => {
      console.log('[fsWatchLedger] Stopped watching', paths)
      void watcher.close()
    }
  }).pipe(Rx.share())
}

function _readPathData() {
  // Order matters, we want to delay initialDataEmitted until, all the files
  // from before the ready event has been emitted
  // I had multiple attempts but couldn't figure out a way to ignore the order of
  // data events among themselves and only care about the order of data vs. ready event cleanly
  // For helpful Rx illustrations, @see https://thinkrx.io/rxjs/mergeMap-vs-exhaustMap-vs-switchMap-vs-concatMap/
  // For attempts @see https://share.cleanshot.com/ueqr9Z
  return rxjs.pipe(
    mapAsync(async (e: FSPathEvent) => {
      if (e.type !== 'data') {
        return e
      }
      return $readFile(e.data.path)
        .then(safeJSONParse)
        .then((data) => {
          if (!e.data.entity) {
            return undefined
          }
          if (!data && e.data.entity !== 'unlink') {
            console.error(`Invalid json at ${e.data.path}`, data)
            return undefined
          }
          return R.identity<FSDataEvent>({
            type: 'data',
            data: {
              entity: data ?? null,
              id: e.data.id,
              entityName: e.data.entityName,
            },
          })
        })
    }, 100), // 100 concurrent readFiles
    Rx.filter((e): e is NonNullable<typeof e> => !!e),
  )
}

export default fsServer
