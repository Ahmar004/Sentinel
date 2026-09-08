import { describe, expect, it } from 'vitest'
import { densityBucket, getCellTreatment } from './cellTreatment'
import type { CellObservation } from '@/domain/types'
import { RISK_BAND } from '@/domain/constants'

describe('densityBucket', () => {
  it('is monotonically non-decreasing with density', () => {
    const samples = [0, 0.5, 1, 1.5, 2, 3, 4, 6, 10]
    const buckets = samples.map(densityBucket)
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]).toBeGreaterThanOrEqual(buckets[i - 1])
    }
  })

  it('reaches the darkest bucket at the default density threshold (4.0 /sqm)', () => {
    expect(densityBucket(4.0)).toBe(5)
    expect(densityBucket(3.99)).toBe(4)
  })
})

describe('getCellTreatment - the honesty invariant, rendered', () => {
  it('draws a risk-band outline only for OBSERVED cells', () => {
    const observed: CellObservation = {
      observationState: 'OBSERVED',
      densityPerSqM: 2,
      flow: null,
      risk: { score: 0.5, band: RISK_BAND.WATCH },
      dwellMs: 30_000,
    }
    const notEnoughDwell: CellObservation = {
      observationState: 'NOT_ENOUGH_DWELL',
      densityPerSqM: 2,
      flow: null,
      risk: null,
      dwellMs: 12_000,
    }
    const stale: CellObservation = {
      observationState: 'STALE',
      densityPerSqM: 2,
      flow: null,
      risk: null,
      ageMs: 5_000,
    }
    const gap: CellObservation = { observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }

    expect(getCellTreatment(observed).outline).not.toBeNull()
    expect(getCellTreatment(notEnoughDwell).outline).toBeNull()
    expect(getCellTreatment(stale).outline).toBeNull()
    expect(getCellTreatment(gap).outline).toBeNull()
  })

  it('gives each observation state its own, distinct fill pattern', () => {
    const base = { densityPerSqM: 2, flow: null } as const
    const patterns = new Set([
      getCellTreatment({ ...base, observationState: 'OBSERVED', risk: { score: 0.1, band: RISK_BAND.NORMAL }, dwellMs: 30_000 }).pattern,
      getCellTreatment({ ...base, observationState: 'NOT_ENOUGH_DWELL', risk: null, dwellMs: 1_000 }).pattern,
      getCellTreatment({ observationState: 'STALE', densityPerSqM: 2, flow: null, risk: null, ageMs: 5_000 }).pattern,
      getCellTreatment({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }).pattern,
    ])
    expect(patterns.size).toBe(4)
  })

  it('gives each risk band a distinct outline width and style', () => {
    const bands = [RISK_BAND.NORMAL, RISK_BAND.WATCH, RISK_BAND.ELEVATED, RISK_BAND.CRITICAL] as const
    const outlines = bands.map((band) =>
      getCellTreatment({
        observationState: 'OBSERVED',
        densityPerSqM: 1,
        flow: null,
        risk: { score: 0.5, band },
        dwellMs: 30_000,
      }).outline,
    )
    const widths = new Set(outlines.map((o) => o?.widthPx))
    expect(widths.size).toBe(4)
    // Only CRITICAL draws the extra inner ring.
    expect(outlines.map((o) => o?.innerRing)).toEqual([false, false, false, true])
  })

  it('never fills a GAP from the density ramp - it carries no density at all', () => {
    const treatment = getCellTreatment({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null })
    expect(treatment.densityBucket).toBeNull()
    expect(treatment.fillToken).toBe('var(--color-obs-gap-fill)')
  })
})
