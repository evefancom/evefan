/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace Expensify {
  export interface AuthenticateResponse {
    accountID: number
    authToken: string
    email: string
    expensify_activePolicyID: string
    httpCode: number
    jsonCode: number
    /** Object is too complicated right now */
    policy: any
    private_expensifyCredits: number
    requestID: string
  }
}
