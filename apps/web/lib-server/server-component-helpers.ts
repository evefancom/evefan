import {cookies} from 'next/headers'
import type {kAccessToken} from '@openint/app-config/constants'
import {createSSRHelpers, serverGetViewer} from './server-helpers'

export function createServerComponentHelpers(opts?: {
  searchParams: {[kAccessToken]?: string | string[]} | URLSearchParams
}) {
  return createSSRHelpers({cookies, searchParams: opts?.searchParams})
}

/** Used in router handler actually, not just server component */
export function serverComponentGetViewer(opts?: {
  searchParams: {[kAccessToken]?: string | string[]} | URLSearchParams
}) {
  return serverGetViewer({cookies, searchParams: opts?.searchParams})
}
