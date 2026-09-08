import { useEffect, useState } from 'react'

/** The site clock in the top bar (design.md 3.1). Ticks once a second. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return now
}
