'use client'

import {useIntervalEffect} from '@react-hookz/web'
import React from 'react'

export function LoadingText({
  text = 'Loading',
  className,
}: {
  text?: string
  className?: string
}) {
  const [count, setCount] = React.useState(0)
  useIntervalEffect(() => {
    setCount((prev) => (prev + 1) % 3)
  }, INTERVAL_MS)
  return (
    <span className={className}>
      {text}
      {'.'.repeat(count + 1)}
    </span>
  )
}

const INTERVAL_MS = 500
