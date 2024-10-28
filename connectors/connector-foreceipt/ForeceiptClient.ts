import firebase from 'firebase/compat/app'
import {
  getQuerySnapshot$,
  initFirebase,
  zFirebaseUserConfig,
  zServiceAccount,
} from '@openint/connector-firebase'
import type {HTTPError} from '@openint/util'
import {createHTTPClient, Rx, rxjs, z, zCast, zFunction} from '@openint/util'
import {_parseResourceInfo} from './foreceipt-utils'

class ForeceiptError extends Error {
  override name = 'ForeceiptError'

  constructor(
    public readonly data: unknown,
    public readonly originalError: HTTPError,
  ) {
    super(originalError.message)
    Object.setPrototypeOf(this, ForeceiptError.prototype)
  }
}

export interface ForeceiptClientOptions {
  /** Should be received by caller */
  onRefreshCredentials?: (credentials: Foreceipt.Credentials) => void
}

const zSettings = z.discriminatedUnion('role', [
  z.object({role: z.literal('admin'), serviceAccount: zServiceAccount}),
  z.object({role: z.literal('user')}).merge(zFirebaseUserConfig),
])

export const zForeceiptConfig = z.object({
  credentials: zCast<Readonly<Foreceipt.Credentials>>(),
  options: zCast<ForeceiptClientOptions>(),
  _id: zCast<ExternalId>(),
  envName: z.enum(['staging', 'production']),
})

export const makeForeceiptClient = zFunction(zForeceiptConfig, (cfg) => {
  const patchCredentials = (partial: Partial<Foreceipt.Credentials>) => {
    cfg.credentials = {...cfg.credentials, ...partial}
    // cfg.options.onRefreshCredentials?.(cfg.credentials)
  }
  const fbaConfig = {
    apiUrl: 'https://api.foreceipt.io/v1/receipt',
    apiKey: 'AIzaSyCWLdIMQO_A_WGhP_gh8IzSEv2_HbOvdAs',
    authDomain: 'app.foreceipt.com',
    databaseURL: 'https://foreceipt-firestore.firebaseio.com',
    projectId: 'foreceipt-firestore',
    storageBucket: 'foreceipt-firestore.appspot.com',
    messagingSenderId: '982132137828',
    appId: '1:982132137828:web:cc83d2bcf734222c',
  }

  // TODO: Remove this when sync is complete
  const fba = firebase.initializeApp(
    {
      apiUrl: 'https://api.foreceipt.io/v1/receipt',
      apiKey: 'AIzaSyCWLdIMQO_A_WGhP_gh8IzSEv2_HbOvdAs',
      authDomain: 'app.foreceipt.com',
      databaseURL: 'https://foreceipt-firestore.firebaseio.com',
      projectId: 'foreceipt-firestore',
      storageBucket: 'foreceipt-firestore.appspot.com',
      messagingSenderId: '982132137828',
      appId: '1:982132137828:web:cc83d2bcf734222c',
    },
    // So every time is unique. remember to clean up open connection
    `foreceipt-${Math.random()}`,
  )

  const fbSettings = {
    role: 'user',
    authData: {
      method: cfg.credentials.userJSON ? 'userJson' : 'emailPassword',
      email: cfg.credentials.email,
      password: cfg.credentials.password,
      userJson: cfg.credentials.userJSON,
    },
    firebaseConfig: fbaConfig,
  } as z.infer<typeof zSettings>

  // This is to initizialize firebase on foreceipt client that will be use to get the query
  let fb: ReturnType<typeof initFirebase>
  const initFB = () => {
    fb = initFirebase(fbSettings)
    return fb
  }
  const login = async () => {
    const currentUser = await fb.connect()
    if (!currentUser) {
      throw new Error('Unexpectedly missing fb currentUser')
    }
    return currentUser
  }

  const ensureIdToken = async () => {
    if (cfg.credentials.idTokenResult) {
      return cfg.credentials.idTokenResult
    }

    const currentUser = await login()
    const _idTokenResult = await currentUser.getIdTokenResult()
    const idTokenResult = JSON.parse(
      JSON.stringify(_idTokenResult),
    ) as typeof _idTokenResult
    patchCredentials({idTokenResult})

    return idTokenResult
  }

  const createClient = createHTTPClient({
    baseURL: 'https://api.foreceipt.io/v1/',
    requestTransformer: async (req) => {
      const idToken = await ensureIdToken()
      req.headers = {
        ...(req.headers as Record<string, unknown>),
        auth: idToken.token,
      }
      return req
    },
    errorTransformer: (err) => {
      if (err.response?.data) {
        return new ForeceiptError(err.response.data, err)
      }
      return err
    },
  })
  const getUserGuid = async () => {
    const idTokenRes = await ensureIdToken()
    return idTokenRes.claims['foreceipt_user_id'] as string
  }

  const getCurrentUser = async () =>
    createClient
      .post<string[]>('receipt/api/GetTeamMembersByUserId')
      .then(
        (r) =>
          r.data.map((d) => JSON.parse(d) as Foreceipt.TeamMember)[0] ?? null,
      )

  const getTeam = async (teamId: string) =>
    createClient
      .post<Foreceipt.Team>('receipt/api/GetTeam', {TeamId: teamId})
      .then((r) => r.data)

  const getTeamMembersInTeam = async (teamId: string) =>
    createClient
      .post<string[]>('receipt/api/GetTeamMembersInTeam', {TeamId: teamId})
      .then((r) => r.data.map((d) => JSON.parse(d) as Foreceipt.TeamMember))

  const getUserAndTeamGuid = async () => {
    const userGuid = await getUserGuid()
    let teamGuid = cfg.credentials.teamGuid
    if (teamGuid === null) {
      const member = await getCurrentUser()
      teamGuid = member?.team_guid ?? null

      patchCredentials({teamGuid})
    }
    return {userGuid, teamGuid}
  }

  const getReceiptsSnapshot$ = (updatedSince?: Date) =>
    rxjs.from(getUserAndTeamGuid()).pipe(
      Rx.mergeMap(({teamGuid, userGuid}) => {
        let query = fba
          .firestore()
          .collection<Foreceipt.Receipt>('Receipts')
          .where(
            teamGuid ? 'team_guid' : 'user_guid',
            '==',
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            teamGuid || userGuid,
          )
        if (updatedSince) {
          query = query.orderBy('last_update_time').startAt(updatedSince)
        }

        return getQuerySnapshot$(query)
      }),
    )
  const getQuery$ = (updatedSince?: Date) =>
    rxjs.from(getUserAndTeamGuid()).pipe(
      Rx.mergeMap(({teamGuid, userGuid}) => {
        let query = fb.fst.collection<Foreceipt.Receipt>('Receipts').where(
          teamGuid ? 'team_guid' : 'user_guid',
          '==',
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          teamGuid || userGuid,
        )

        if (updatedSince) {
          query = query.orderBy('last_update_time').startAt(updatedSince)
        }

        const query2 = fb.fst
          .collection<Foreceipt.UserSetting>('user_setting')
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          .where('owner_guid', '==', teamGuid || userGuid)

        return rxjs.forkJoin(
          rxjs.of({receiptQuery: query, userSetting: query2}),
          rxjs.from(getInfo()),
        )
      }),
    )

  const getUserSettings$ = () =>
    rxjs.from(getUserAndTeamGuid()).pipe(
      Rx.mergeMap(({teamGuid, userGuid}) =>
        getQuerySnapshot$(
          fb.fst
            .collection<Foreceipt.UserSetting>('user_setting')
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            .where('owner_guid', '==', teamGuid || userGuid) as Parameters<
            typeof getQuerySnapshot$
          >,
        ),
      ),
      Rx.map((snap) =>
        snap.docs.map((d) => {
          const data = d.data() as Foreceipt.UserSetting
          return {
            type: data.setting_type,
            json: JSON.parse(data.setting_in_json) as Foreceipt.UserSettingJson,
          }
        }),
      ),
    )

  const EXPENSE_TYPE: Foreceipt.Receipt['content']['type'] = 1
  const INCOME_TYPE: Foreceipt.Receipt['content']['type'] = 2
  const TRANSFER_TYPE: Foreceipt.Receipt['content']['type'] = 3
  const getInfo = zFunction(async () => {
    const userGuid = await getUserGuid()
    const user = await getCurrentUser()
    const [team, teamMembers] = await Promise.all([
      user ? getTeam(user.team_guid) : null,
      user ? getTeamMembersInTeam(user.team_guid) : [],
    ])
    const userAndTeam = {
      userGuid,
      teamGuid: user?.team_guid ?? null,
      user,
      team,
      teamMembers,
    }

    const [settings] = await Promise.all([
      rxjs.firstValueFrom(getUserSettings$()),
    ])
    const info = _parseResourceInfo(userAndTeam, settings)

    return info
  })
  return {
    getReceipts: zFunction(z.date().optional(), async (updatedSince) => {
      const snap = await rxjs.firstValueFrom(getReceiptsSnapshot$(updatedSince))
      return snap.docs.map((d) => ({
        _docId: d.id,
        ...d.data(),
      }))
    }),
    getUserAndTeamInfo: zFunction(async () => {
      const userGuid = await getUserGuid()
      const user = await getCurrentUser()
      const [team, teamMembers] = await Promise.all([
        user ? getTeam(user.team_guid) : null,
        user ? getTeamMembersInTeam(user.team_guid) : [],
      ])
      return {
        userGuid,
        teamGuid: user?.team_guid ?? null,
        user,
        team,
        teamMembers,
      }
    }),

    getUserSettings: zFunction(async () =>
      rxjs.firstValueFrom(getUserSettings$()),
    ),

    // TODO: Make it cleaner
    getReceiptsSnapshot$: zFunction(z.date().optional(), (updatedSince) =>
      getReceiptsSnapshot$(updatedSince),
    ),
    getInfo: zFunction(async () => await getInfo()), // Still need this to get the info type
    getUserSettings$: zFunction(() => getUserSettings$()),
    initFb: zFunction(() => initFB()),
    EXPENSE_TYPE,
    INCOME_TYPE,
    TRANSFER_TYPE,
    getQuery$,
    fbaConfig,
    fbSettings,
  }
})
