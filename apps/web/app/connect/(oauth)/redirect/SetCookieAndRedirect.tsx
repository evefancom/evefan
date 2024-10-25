'use client'

import {setCookie} from 'cookies-next'
import type {OptionsType} from 'cookies-next/lib/types'
import React from 'react'

/**
 * Workaround for inability to set cookie in server components
 * @see https://github.com/vercel/next.js/discussions/49843
 */
export function SetCookieAndRedirect(props: {
  cookies: Array<{key: string; value: string; options: OptionsType}>
  redirectUrl: string
}) {
  React.useEffect(() => {
    for (const {key, value, options} of props.cookies) {
      setCookie(key, value, options)
    }

    // no need for NextRouter since we are doing a full page redirect
    window.location.href = props.redirectUrl

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
