import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAlerts, useCellsById, useDrones, useSuggestions, useZones } from './liveStore'

/**
 * React's `useSyncExternalStore` calls the snapshot function on every
 * render and bails out only when the result is referentially equal to the
 * last one. A selector that allocates a fresh object each call therefore
 * reports a change that never happened, re-renders, allocates again, and
 * loops until React throws "Maximum update depth exceeded".
 *
 * That is exactly what a previous `useCellEntries` did: `Object.entries`
 * builds a new `[key, value]` tuple per entry, so `useShallow`'s
 * element-by-element comparison could never match and S02 went blank on
 * first paint. These tests pin the property that broke.
 */
describe('live store selectors return cached snapshots', () => {
  it('useCellsById returns the same reference across renders when nothing changed', () => {
    const { result, rerender } = renderHook(() => useCellsById())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('useZones returns a stable snapshot across renders', () => {
    const { result, rerender } = renderHook(() => useZones())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('useDrones returns a stable snapshot across renders', () => {
    const { result, rerender } = renderHook(() => useDrones())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('useAlerts returns a stable snapshot across renders', () => {
    const { result, rerender } = renderHook(() => useAlerts())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('useSuggestions returns a stable snapshot across renders', () => {
    const { result, rerender } = renderHook(() => useSuggestions())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
