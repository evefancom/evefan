// TODO: Migrate to tree-shakable version 9 of firebase once we confirm
// compat is working
import 'firebase/compat/auth'
import 'firebase/compat/firestore'
import {UserImpl} from '@firebase/auth/internal'
import firebase from 'firebase/compat/app'
import {z, zFunction} from '@openint/util'
import {zAuthData, zFirebaseConfig} from './def'

export const makeFirebaseAuth = zFunction(zFirebaseConfig, (config) => {
  const fba = firebase.initializeApp(config, config.projectId)
  const auth = fba.auth()
  function getUser() {
    if (!auth.currentUser) {
      throw new Error('auth.currentUser missing')
    }
    return auth.currentUser
  }
  return {
    fba,
    auth,
    currentUserJson: zFunction(() => getUser().toJSON()),
    login: zFunction(zAuthData, async (input) => {
      const res = await (input.method === 'userJson'
        ? authUpdateCurrentUserFromJSON(auth, input.userJson)
        : input.method === 'customToken'
          ? auth.signInWithCustomToken(input.customToken)
          : auth.signInWithEmailAndPassword(input.email, input.password))
      return res.user?.toJSON()
    }),
    logout: zFunction(() => auth.signOut()),
    resetPassword: zFunction(z.string(), (email) =>
      auth.sendPasswordResetEmail(email),
    ),
    updatePassword: zFunction(z.string(), (pw) => getUser().updatePassword(pw)),
    verifyBeforeUpdateEmail: zFunction(z.string(), (email) =>
      getUser().verifyBeforeUpdateEmail(email),
    ),
  }
})

/**
 * Hacky solution to update the current user
 * @deprecated Every one should instead use makeFirebaseAuth
 */
export async function authUpdateCurrentUserFromJSON(
  auth: firebase.auth.Auth,
  uJson: Record<string, unknown>,
) {
  if (!uJson || !uJson['uid']) {
    console.error('Invalid user in authUpdateCurrentUserFromJSON', uJson)
    throw new Error('Invalid user')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  const user = UserImpl._fromJSON((auth as any)._delegate, uJson)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  await auth.updateCurrentUser(user as any)
  return {user: auth.currentUser}
}
