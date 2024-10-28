import type {
  AnyEntityPayload,
  ConnectorDef,
  ConnectorSchemas,
} from '@openint/cdk'
import {connHelpers} from '@openint/cdk'
import {z, zCast} from '@openint/util'
import type {AnyQuery} from './firebase-types'
import type {WrappedFirebase} from './server'

export const zFirebaseConfig = z.object({
  projectId: z.string(),
  apiKey: z.string(),
  appId: z.string(),
  authDomain: z.string(),
  databaseURL: z.string(),
  storageBucket: z.string().optional(),
  measurementId: z.string().optional(),
  messagingSenderId: z.string().optional(),
})

/**
 * Can be obtained by executing the following in the browser
 * `console.log(JSON.stringify(fba.auth().currentUser.toJSON(), null, 2))`
 */
export type AuthUserJson = z.infer<typeof zAuthUserJson>
export const zAuthUserJson = z
  .object({
    uid: z.string(),
    appName: z.string(),
    stsTokenManager: z.record(z.unknown()),
  })
  .catchall(z.unknown())

export const zAuthData = z.discriminatedUnion('method', [
  z.object({method: z.literal('userJson'), userJson: zAuthUserJson}),
  z.object({method: z.literal('customToken'), customToken: z.string()}),
  z.object({
    method: z.literal('emailPassword'),
    email: z.string(),
    password: z.string(),
  }),
])

export const zFirebaseUserConfig = z.object({
  firebaseConfig: zFirebaseConfig,
  authData: zAuthData,
})

export const zServiceAccount = z
  .object({project_id: z.string()})
  .catchall(z.unknown())

export const zSettings = z.discriminatedUnion('role', [
  z.object({role: z.literal('admin'), serviceAccount: zServiceAccount}),
  z.object({role: z.literal('user')}).merge(zFirebaseUserConfig),
])

export const firebaseSchemas = {
  name: z.literal('firebase'),
  resourceSettings: zSettings,
  sourceState: z.object({
    /**
     * Only used for sourceSync, not destSync. Though these are not technically states...
     * And they are not safe to just erase if fullSync = true.
     * TODO: Introduce a separate sourceOptions / destinationOptions type later when it becomes an
     * actual problem... for now this issue only impacts FirebaseProvider and FSProvider
     * which are not actually being used as top level providers
     */
    collectionPaths: z.array(z.string()).nullish(),
    /**
     * NEXT: We should use a JSON representation of query so that it can be transfered over the network
     * However firestore doesn't expose serialize / deserialize, therefore using Query type directly as a short
     * term hack...
     * @see https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery
     */
    _queries: zCast<AnyQuery[] | undefined>(),
    _fb: zCast<WrappedFirebase | undefined>(),
  }),
  sourceOutputEntity: zCast<AnyEntityPayload>(),
  destinationInputEntity: zCast<AnyEntityPayload>(),
} satisfies ConnectorSchemas

export const firebaseHelpers = connHelpers(firebaseSchemas)

export const firebaseDef = {
  name: 'firebase',
  metadata: {verticals: ['database'], logoUrl: '/_assets/logo-firebase.png'},
  schemas: firebaseSchemas,
} satisfies ConnectorDef<typeof firebaseSchemas>

export default firebaseDef
