import React from 'react'
import {useEffect} from 'react'

export function EffectContainer({
  effect,
  deps,
  children,
}: {
  effect: () => void
  deps?: React.DependencyList
  children?: React.ReactNode
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, deps ?? [])
  return <>{children}</>
}
