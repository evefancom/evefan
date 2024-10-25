import firebase from 'firebase/compat/app'
import type {ConnectorServer, Link, SyncOperation} from '@openint/cdk'
import {handlersLink, mergeReady} from '@openint/cdk'
import {
  defineProxyFn,
  fromCompletion,
  getDefaultProxyAgent,
  mapDeep,
  R,
  Rx,
  rxjs,
  tapTeartown,
  z,
  zFunction,
} from '@openint/util'
import type {firebaseSchemas} from './def'
import {zSettings} from './def'
import type {AnyQuery} from './firebase-types'
import {
  getPathForQuery,
  getQueryDocumentSnapshot$,
  getQuerySnapshot$,
  isTimestamp,
} from './firebase-utils'
import {makeFirebaseAuth} from './firebaseAuth'
import {MultiBatch} from './MultiBatch'

export const $admin =
  defineProxyFn<() => typeof import('firebase-admin')>('firebase-admin')

type AuthSettings = z.infer<typeof zSettings>

type _query<T> = firebase.firestore.Query<T>
type _adminQuery<T> = import('firebase-admin').firestore.Query<T>

// One challenge - we don't know when the `ready` event should fire
// because we don't ever have a list of initial snapshots...
export function fromAdminQuery<T extends Record<string, unknown>>(
  query: _adminQuery<T>,
) {
  return getQueryDocumentSnapshot$(query).pipe(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Rx.map((snap) => opData(snap.ref.parent.path, snap.id, snap.data()!)),
  )
}

function fromQuery<T extends Record<string, unknown>>(query: AnyQuery<T>) {
  const queryPath = getPathForQuery(query)
  return getQuerySnapshot$(query as _query<T>).pipe(
    Rx.tap((snap) => {
      const meta = R.toPairs(snap.metadata as {})
        .map((kv) => kv.join('='))
        .join(' ')
      console.log(`[fromQuery] snapshot ${queryPath} size=${snap.size}`, meta)
    }),
    Rx.mergeMap((snap, i) =>
      R.pipe(
        // ready after the first snap https://share.cleanshot.com/rh3s3X
        snap
          .docChanges()
          .map((c) => opData(c.doc.ref.parent.path, c.doc.id, c.doc.data())),
        (ops) => [
          ...ops,
          _op({type: 'commit'}),
          ...R.compact([i === 0 && _op({type: 'ready'})]),
        ],
        // Should we fire `commit?`
        (ops) => rxjs.from(ops),
      ),
    ),
    // logLink({prefix: queryPath}),
  )
}
export const firebaseServer = {
  sourceSync: ({settings, state}) => {
    const {fst, cleanup, connect} = state._fb ?? initFirebase(settings)
    const queries = [
      ...(state._queries ?? []),
      ...(state.collectionPaths ?? []).map((path) => fst.collection(path)),
    ]
    if (queries.length === 0) {
      throw new Error('[firebase] queries missing')
    }
    console.log(
      `[firebase sourceSync] Will sync ${queries.length} queries`,
      queries.map(getPathForQuery),
    )
    return rxjs.from(connect()).pipe(
      Rx.mergeMap(() => rxjs.merge(...queries.map(fromQuery))),
      mergeReady(queries.length),
      fromFirestore,
      tapTeartown(cleanup),
    )
  },

  // Should we add the connectionId to data...
  destinationSync: ({settings}) => {
    const {fst, cleanup, connect} = initFirebase(settings)
    const batch = new MultiBatch(fst)
    console.log('[Firestore] destSync', settings)
    return rxjs.pipe(
      handlersLink({
        data: ({data}) => {
          console.log('[Firestore] Did get data', data.entityName, data.id)
          const doc = fst.collection<object>(data.entityName).doc(data.id)
          if (data.entity == null) {
            batch.delete(doc)
          } else if (typeof data.entity === 'object') {
            batch.setWithMerge(doc, data.entity)
          } else {
            console.error('[FB] Invalid entity for path', data)
          }
        },
        commit: () =>
          fromCompletion(async () => {
            console.log('[Firestore] Will commit')
            await connect()
            await batch.commit()
          }),
      }),
      // Cleanup is async, but we don't really have a way to handle this...
      tapTeartown(cleanup),
    )
  },
} satisfies ConnectorServer<typeof firebaseSchemas>

export type WrappedFirebase = ReturnType<typeof initFirebase>

export const anyFirestore = zFunction(
  z.enum(Array.from(zSettings.optionsMap.keys()) as [AuthSettings['role']]),
  (role) => (role === 'admin' ? $admin().firestore : firebase.firestore),
)

export const initFirebase = zFunction(zSettings, (settings) => {
  const firestore = anyFirestore(settings.role)
  if (settings.role === 'admin') {
    const {serviceAccount: sa} = settings
    const admin = $admin()
    const fba = admin.initializeApp(
      {
        projectId: sa.project_id,
        credential: admin.credential.cert(
          sa as import('firebase-admin').ServiceAccount,
        ),
        httpAgent: getDefaultProxyAgent(),
      },
      sa.project_id, // Prevent from being default app
    )

    const fst = fba.firestore()
    const connect = async () => {}

    const cleanup = () => {
      console.log(`[FB Admin ${sa.project_id}] Cleaning up fba connection`)
      return fba.delete()
    }
    return {settings, fst, connect, cleanup, firestore}
  } else {
    const {fba, auth, login} = makeFirebaseAuth(settings.firebaseConfig)

    // Set the projectId to prevent from being the default app
    const fst = fba.firestore()

    const connect = async () => {
      // @bayu this is where you should handle refreshToken for foreceipt
      if (!auth.currentUser && settings.authData) {
        await login(settings.authData)
      }
      return auth.currentUser // Need to return currentUser to be use on the foreceipt client
    }
    const cleanup = () => {
      console.log(
        `[FB ${settings.firebaseConfig.projectId}] Cleaning up fba connection`,
      )
      return fba.delete()
    }
    return {settings, fst, connect, cleanup, firestore}
  }
})

const opData = (
  entityName: string,
  id: string,
  entity: Record<string, unknown> | null,
): SyncOperation => ({type: 'data', data: {entity, entityName, id}})

const _op = (operation: SyncOperation) => operation

export const fromFirestore: Link = Rx.map((op) =>
  op.type !== 'data'
    ? op
    : mapDeep(op, (v) =>
        isTimestamp(v) ? {seconds: v.seconds, nanoseconds: v.nanoseconds} : v,
      ),
)

export default firebaseServer
