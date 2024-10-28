import {OpenIntFrontend} from '@openint/connect'
import {initOpenIntSDK} from '@openint/sdk'

const env = {
  OPENINT_API_KEY: 'YOUR_API_KEY',
}

export async function example() {
  // MARK: - 1) Server side create end user scoped token
  const serverSide = initOpenIntSDK({
    headers: {'x-apikey': env.OPENINT_API_KEY},
  })

  const endUserToken = await serverSide
    .POST('/connect/token', {
      body: {endUserId: 'YOUR_USER_ID', validityInSeconds: 3600},
    })
    .then((r) => r.data.token)

  // Pass the token to client side from server side any way you like
  // MARK: - 2) Client side use end user scoped token to authenticate
  const clientSide = initOpenIntSDK({
    headers: {authorization: `Bearer ${endUserToken}`},
  })

  const resourceId = await clientSide
    .POST('/connect/magic-link', {
      body: {
        connectorName: 'hubspot',
        // connectorConfigDisplayName: getEnv().NEXT_PUBLIC_APP_NAME,
        showExisting: false,
        validityInSeconds: 3600,
      },
    })
    .then((r) =>
      OpenIntFrontend.openMagicLink({
        url: r.data.url,
      }),
    )
    .then((r) => r.resourceId)

  // MARK: - 3) Server side or Client side. The unified API is now ready to use with
  // either server authentication or client authentication
  const openint = initOpenIntSDK({
    headers: {
      // 'x-apikey': env.OPENINT_API_KEY,
      authorization: `Bearer ${endUserToken}`,
      'x-resource-id': resourceId as `reso_${string}`,
    },
  })

  const contacts = openint
    .GET('/unified/crm/contact')
    .then((r) => r.data.items)
  console.log(contacts)
}
