import type firestoreAdmin from '@google-cloud/firestore'
import type firebaseAdmin from 'firebase-admin'
import type firebase from 'firebase/compat'
import type {Merge} from '@openint/util'

export {firebase, firebaseAdmin, firestoreAdmin}

export type FirebaseApp = firebase.app.App
export type AdminFirebaseApp = firebaseAdmin.app.App
export type AnyFirebaseApp = FirebaseApp | AdminFirebaseApp

export type FirebaseAuth = firebase.auth.Auth
export type AdminFirebaseAuth = firebaseAdmin.auth.Auth
export type AnyFirebaseAuth = FirebaseAuth | AdminFirebaseAuth

export type Firestore = firebase.firestore.Firestore
export type AdminFirestore = firestoreAdmin.Firestore
export type AnyFirestore = Firestore | AdminFirestore

export type AuthUserRecord = firebaseAdmin.auth.UserRecord

export type AnyWriteBatch<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? firestoreAdmin.WriteBatch
    : firebase.firestore.WriteBatch

export type AnyFieldPath<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? firestoreAdmin.FieldPath
    : firebase.firestore.FieldPath

export type AnyFieldPathClass<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? typeof firestoreAdmin.FieldPath
    : typeof firebase.firestore.FieldPath

export type AnyFieldValueClass<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? typeof firestoreAdmin.FieldValue
    : typeof firebase.firestore.FieldValue

export type AnyTimestampClass<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? typeof firestoreAdmin.Timestamp
    : typeof firebase.firestore.Timestamp

export type AnyTimestamp<TStore extends AnyFirestore = AnyFirestore> =
  TStore extends AdminFirestore
    ? firestoreAdmin.Timestamp
    : firebase.firestore.Timestamp

export type SerializedTimestamp =
  | AnyTimestamp
  | {seconds: number; nanoseconds: number}

export type AnyQuery<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.Query<T>
  : firebase.firestore.Query<T>

export type AnyDocumentReference<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.DocumentReference<T>
  : firebase.firestore.DocumentReference<T>

export type AnyCollectionReference<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.CollectionReference<T>
  : firebase.firestore.CollectionReference<T>

export type AnyDocumentSnapshot<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.DocumentSnapshot<T>
  : firebase.firestore.DocumentSnapshot<T>

export type AnyQuerySnapshot<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.QuerySnapshot<T>
  : firebase.firestore.QuerySnapshot<T>

export type AnyDataConverter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T = any,
  TStore extends AnyFirestore = AnyFirestore,
> = TStore extends AdminFirestore
  ? firestoreAdmin.FirestoreDataConverter<T>
  : firebase.firestore.FirestoreDataConverter<T>

export type GetOptions = firebase.firestore.GetOptions
export type SetOptions = firebase.firestore.SetOptions

/** Used to help with typing */
export type QueryUnion<T> = firebase.firestore.Query<
  T extends firebase.firestore.Query<infer U> ? U : never
>

// Migrated from Raw.d.ts
export type Timestamp =
  | {seconds: number; nanoseconds: number}
  | import('firebase-admin').firestore.Timestamp
  | firebase.firestore.Timestamp

export interface Doc<TId extends string = string> {
  id: TId
  createdAt?: Timestamp | null
  createdByUserId?: DeprecatedUserId | null
  createdByBookId?: DeprecatedLedgerId | null
  updatedAt?: Timestamp | null
  updatedByUserId?: DeprecatedUserId | null
  updatedByBookId?: DeprecatedLedgerId | null
  deletedAt?: Timestamp | null
}

interface DeletedDoc {
  id?: string | null
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
  deletedAt: Timestamp
}

export type SnapshotData<TRaw> = {_TRaw?: TRaw} & ([TRaw] extends [Doc]
  ?
      | Merge<TRaw, {id?: TRaw['id']}>
      | Merge<
          {
            [K in keyof TRaw]?: never
          },
          DeletedDoc
        >
  : TRaw)

export type RawOf<T> = T extends SnapshotData<infer TRaw> ? TRaw : T

export type DocIdOf<T> = T extends Doc<infer TId> ? TId : string
