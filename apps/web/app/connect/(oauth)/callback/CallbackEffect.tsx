'use client'

import {Loader2} from 'lucide-react'
import React from 'react'
import type {FrameMessage} from '@openint/connect'

export function CallbackEffect(props: {
  msg: FrameMessage | null
  autoClose?: boolean
}) {
  const opener = (
    typeof window !== 'undefined' ? window.opener : null
  ) as Window | null

  React.useEffect(() => {
    if (props.msg) {
      opener?.postMessage(props.msg, '*')
    }

    if (props.autoClose) {
      setTimeout(() => {
        window.close()
      }, 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return opener ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null
}
