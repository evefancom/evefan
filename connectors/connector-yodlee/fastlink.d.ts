declare global {
  interface Window {
    fastlink?: FastLink
  }
}

/** https://developer.yodlee.com/docs/fastlink/4.0/getting-started */
interface FastLink {
  open: (options: FastLinkOpenOptions, containerId: string) => unknown
  close: () => unknown
}

export interface FastLinkOpenOptions {
  fastLinkURL: string
  accessToken: string
  forceIframe?: boolean
  forceRedirect?: boolean
  iframeScrolling?: 'auto' | boolean
  params: {
    configName:
      | 'Aggregation'
      | 'Verification'
      | 'AggregationPlusVerification'
      | 'VerificationPlusAggregation'
  } & (
    | {
        /**
         * https://developer.yodlee.com/docs/fastlink/4.0/advanced#LinkAccount
         */
        flow: 'add'
        providerId?: number | string
      }
    | {
        /**
         * https://developer.yodlee.com/docs/fastlink/4.0/advanced#EditCredentials
         */
        flow: 'edit'
        providerAccountId: number | string
      }
    | {}
  )
  onSuccess?: (data: OnSuccessData) => void
  onError?: (data: OnErrorData) => void
  /**
   * Aka `onCancelled`
   * The onClose method is called to report when the FastLink application is closed
   * by user-initiated actions. For more details, refer to the onClose(data)
   * Method section in FastLink 4 Advanced Integration.
   */
  onClose?: (data: OnCloseData) => void

  onEvent?: (data: unknown) => void
}

/**
 * {
 *   "fnToCall": "accountStatus",
 *   "providerName": "Dag Site",
 *   "requestId": "COX3l5DppA40dIiJDrkJjmmhVt8=",
 *   "providerAccountId": 32132249739,
 *   "status": "SUCCESS",
 *   "providerId": 16441,
 *   "additionalStatus": "ACCT_SUMMARY_RECEIVED"
 * }
 */
interface OnSuccessData {
  fnToCall: string
  providerId: number
  providerName: string
  requestId: string
  status: string
  additionalStatus: string
  providerAccountId: number
}

/**
 * {
 *   "providerId": 16441,
 *   "providerName": "Dag Site",
 *   "requestId": "rsglj0CIMoQsopKQrNLE4fz7nzE=",
 *   "reason": "Please visit Dag Site to update your account information or password.",
 *   "status": "FAILED",
 *   "additionalStatus": "USER_ACTION_NEEDED_AT_SITE",
 *   "providerAccountId": 11350520
 * }
 */
type OnErrorData =
  | {
      providerId: number
      providerName: string
      requestId: string
      reason: string
      status: string
      additionalStatus: string
      providerAccountId: number
    }
  | {
      code: string // 'NXXX'
      title: string // '{error_title_NXX}'
      message: string // '{error_description_NXX}'
      fnToCall: string // 'errorHandler'
      redirectUrl: string // '{sso_redirect_url}'
    }
  | {
      code: string // 'E701'
      title: string // 'INVALID_PARAMETER_OR_VALUE'
      message: string // 'Invalid value for providerId'
      fnToCall: string // 'errorHandler'
    }

/**
 * {
 *   "action": "exit",
 *   "fnToCall": "accountStatus",
 *   "sites": [
 *     {
 *       "providerId": 5,
 *       "providerName": "Wells Fargo",
 *       "requestId": "vNHnOZ05sXZF1gFzEpF9BoMlSt0=",
 *       "status": "SUCCESS",
 *       "additionalStatus": "AVAILABLE_DATA_RETRIEVED",
 *       "providerAccountId": 11333937
 *     }
 *   ]
 * }
 */
interface OnCloseData {
  fnToCall: string
  action: string
  sites: Array<{
    providerId: number
    providerName: string
    requestId: string
    status: string
    additionalStatus: string
    providerAccountId: number
  }>
}
