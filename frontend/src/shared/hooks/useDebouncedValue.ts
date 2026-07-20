import { useEffect, useState } from 'react'

// Delays reflecting a fast-changing value (e.g. a search input) so callers
// that key a query off it — and therefore trigger a request — don't fire one
// per keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
