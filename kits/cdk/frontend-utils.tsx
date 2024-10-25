import React from 'react'
import useScriptHook from 'react-script-hook'
import {Deferred} from '@openint/util'

export function useScript(src: string) {
  const [loaded, error] = useScriptHook({src, checkForExisting: true})

  const deferred = React.useRef(new Deferred<void>())
  React.useEffect(() => {
    if (loaded) {
      deferred.current.resolve()
    } else if (error) {
      deferred.current.reject(error)
    }
  }, [deferred, loaded, error])

  return deferred.current.promise // TODO: return loaded / error also
}

/** Casting to `Error` type to suppress warning */
export const CANCELLATION_TOKEN = 'CANCELLED' as unknown as Error

/** Used by yodlee container among others */
export function DivContainer(props: {
  id: string
  /** Does not cause re-render */
  onMount?: () => void
  /** Does not cause re-render */
  onUnmount?: () => void
}) {
  React.useLayoutEffect(
    () => {
      setTimeout(() => {
        console.log('[DivContainer] onMount')
        props.onMount?.()
      }, 0)
      return () => {
        console.log('[DivContainer] onUnmount')
        props.onUnmount?.()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  return <div id={props.id} />
}
