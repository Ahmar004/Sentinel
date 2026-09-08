import { describe, expect, it } from 'vitest'
import { toCellObservation } from './cellObservation'
import type { CellUpdate } from './types'

function baseUpdate(overrides: Partial<CellUpdate>): CellUpdate {
  return {
    cellId: 'C-001-001',
    ts: '2026-08-27T10:14:03.120Z',
    observationState: 'GAP',
    densityPerSqM: null,
    flow: null,
    risk: null,
    ageMs: 0,
    dwellMs: 0,
    observedBy: [],
    ...overrides,
  }
}

describe('toCellObservation', () => {
  it('narrows OBSERVED into the full variant', () => {
    const result = toCellObservation(
      baseUpdate({
        observationState: 'OBSERVED',
        densityPerSqM: 3.4,
        flow: { dirDeg: 90, speedMps: 0.5 },
        risk: { score: 0.5, band: 'WATCH' },
        dwellMs: 41_000,
      }),
    )
    expect(result).toEqual({
      observationState: 'OBSERVED',
      densityPerSqM: 3.4,
      flow: { dirDeg: 90, speedMps: 0.5 },
      risk: { score: 0.5, band: 'WATCH' },
      dwellMs: 41_000,
    })
  })

  it('rejects an OBSERVED payload with no risk, rather than guessing', () => {
    expect(() =>
      toCellObservation(baseUpdate({ observationState: 'OBSERVED', densityPerSqM: 1, risk: null })),
    ).toThrow()
  })

  it('narrows GAP with no density, flow or risk regardless of stray fields', () => {
    const result = toCellObservation(
      baseUpdate({ observationState: 'GAP', densityPerSqM: 9, flow: { dirDeg: 1, speedMps: 1 } }),
    )
    expect(result).toEqual({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null })
  })

  it('narrows STALE to density and age only, dropping flow', () => {
    const result = toCellObservation(
      baseUpdate({
        observationState: 'STALE',
        densityPerSqM: 2.1,
        flow: { dirDeg: 1, speedMps: 1 },
        ageMs: 7_000,
      }),
    )
    expect(result).toEqual({ observationState: 'STALE', densityPerSqM: 2.1, flow: null, risk: null, ageMs: 7_000 })
  })
})
