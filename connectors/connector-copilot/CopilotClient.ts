import {initializeApp} from 'firebase/app'
import {getAuth, signInWithEmailAndPassword} from 'firebase/auth'
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from 'firebase/firestore'

// TODO: Replace the following with your app's Firebase project configuration

const app = initializeApp({
  apiKey: 'AIzaSyBi2Ht5k9K94Yi6McMSGyKeOcHC7vEsN_I',
  projectId: 'copilot-production-22904',
  databaseURL: 'https://copilot-production-22904.firebaseio.com',
  storageBucket: 'copilot-production-22904.appspot.com',
  messagingSenderId: '445606440735',
  //   APIKey: AIzaSyBi2Ht5k9K94Yi6McMSGyKeOcHC7vEsN_I
  // bundleID: com.copilot.production
  // clientID: 445606440735-nmgdjiedjntfcdf7gt3iie43v1r0sp5t.apps.googleusercontent.com
  // GCMSenderID: 445606440735
  // projectID: copilot-production-22904
  // databaseURL: https://copilot-production-22904.firebaseio.com
  // storageBucket: copilot-production-22904.appspot.com
})

const auth = getAuth(app)
const userId = process.env['COPILOT_USER_ID']!

signInWithEmailAndPassword(
  auth,
  process.env['COPILOT_EMAIL']!,
  process.env['COPILOT_PASSWORD']!,
)
  .then(async (creds) => {
    console.log('creds', creds)
    const db = getFirestore(app)
    // const col = collection(db, 'items')
    // getDocs(
    //   query(
    //     col,
    //     where('user_id', '==', userId),
    //     limit(10),
    //   ),
    // )
    //   .then((snapshot) => {
    //     console.log(
    //       'snap',
    //       snapshot.docs.map((doc) => doc.data()),
    //     )
    //   })
    //   .catch((err) => {
    //     console.error(err)
    //   })

    const col = collection(
      db,
      'items',
      'MybOEQl9OKbjZPnBkzoh',
      'accounts',
      'bFnoccIZuY11EmmwGtAM',
      'transactions',
    )
    getDocs(query(col, where('user_id', '==', userId), limit(10)))
      .then((snapshot) => {
        console.log(
          'snap',
          snapshot.docs.map((doc) => doc.data()),
        )
      })
      .catch((err) => {
        console.error(err)
      })

    const col2 = collection(
      db,
      'users',
      userId,
      'categories', // also 'budgets'
    )
    getDocs(query(col2, limit(10)))
      .then((snapshot) => {
        console.log(
          'snap',
          snapshot.docs.map((doc) => doc.data()),
        )
      })
      .catch((err) => {
        console.error(err)
      })

    // Does not work...
    // const colgrp = collectionGroup(db, 'transactions')
    // getDocs(
    //   query(colgrp, where('user_id', '==', userId)),
    // )
    //   .then((snapshot) => {
    //     console.log(
    //       'snap',
    //       snapshot.docs.map((doc) => doc.data()),
    //     )
    //   })
    //   .catch((err) => {
    //     console.error(err)
    //   })

    // const docRef = doc(db, 'items', 'aZO65ebnyauromy7Ex4Zirnrq0ELr1FZ1w6BY')
    // const docSnap = await getDoc(docRef);

    // if (docSnap.exists()) {
    //   console.log("Document data:", docSnap.data());
    // } else {
    //   // docSnap.data() will be undefined in this case
    //   console.log("No such document!");
    // }

    // const docRef = doc(db, 'users', userId)
    // const docSnap = await getDoc(docRef)

    // if (docSnap.exists()) {
    //   console.log('Document data:', docSnap.data())
    //   const collections = await docRef.listCollections()
    //   for (const col of collections) {
    //     console.log(`Found subcollection with id: ${col.path}`)
    //   }
    // } else {
    //   // docSnap.data() will be undefined in this case
    //   console.log('No such document!')
    // }
  })
  .catch((err) => {
    console.error(err)
  })
