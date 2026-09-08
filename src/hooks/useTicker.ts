import { useEffect, useState } from 'react'

/**
 * A counter that advances every `intervalMs`, for surfaces that need to
 * re-read something on a cadence of their own.
 *
 * Separate from `useClock`, which ticks once a second because the site
 * clock must. Health is pushed every 5 s (srs.md Section 3.2), so polling
 * it on the site clock would issue five requests for every one that could
 * carry new information, on every screen, for as long as the app is open.
 */
export function useTicker(intervalMs: number): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])

  return tick
}

/** The rate the backend pushes `health.update` at (srs.md Section 3.2). */
export const HEALTH_POLL_MS = 5000
