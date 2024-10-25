import React from 'react'

/**
 * Used to create a callback to get the current value without re-rendering
 * whenever value changes...
 *
 * TODO: Move me to a separate frontend utils package...
 */
export function useGetter<T>(value: T) {
  const ref = React.useRef(value)
  React.useEffect(() => {
    ref.current = value
  }, [value, ref])
  return React.useCallback(() => ref.current, [ref])
}
