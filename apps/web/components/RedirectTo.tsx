'use client'

import {useRouter} from 'next/navigation'
import {useEffect} from 'react'

export function RedirectToNext13(props: {
  url: string
  children?: React.ReactNode
}) {
  const router = useRouter()
  // Only trigger once...
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    router.push(props.url as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{props.children}</>
}
