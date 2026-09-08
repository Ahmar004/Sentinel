import { describe, expect, it } from 'vitest'
import { buildCellFrame, type CellGridEntry } from './cellFrame'
import { RISK_BAND } from '@/domain/constants'
import type { CellObservation } from '@/domain/types'

function entry(observation: CellObservation): CellGridEntry {
  return { cellId: 'C-010-020', col: 10, row: 20, observation }
}

describe('buildCellFrame - the eight cell treatments, plus caption and arrow rules', () => {
  it('draws a risk outline for every one of the four OBSERVED risk bands', () => {
    const bands = [RISK_BAND.NORMAL, RISK_BAND.WATCH, RISK_BAND.ELEVATED, RISK_BAND.CRITICAL] as const
    const outlines = bands.map(
      (band) =>
        buildCellFrame(
          entry({
            observationState: 'OBSERVED',
            densityPerSqM: 2,
            flow: null,
            risk: { score: 0.5, band },
            dwellMs: 30_000,
          }),
        ).treatment.outline,
    )
    expect(outlines.every((o) => o !== null)).toBe(true)
    expect(new Set(outlines.map((o) => o?.widthPx)).size).toBe(4)
  })

  it('never draws a risk outline for a non-OBSERVED cell', () => {
    const notEnoughDwell = buildCellFrame(
      entry({ observationState: 'NOT_ENOUGH_DWELL', densityPerSqM: 1, flow: null, risk: null, dwellMs: 5_000 }),
    )
    const stale = buildCellFrame(
      entry({ observationState: 'STALE', densityPerSqM: 1, flow: null, risk: null, ageMs: 5_000 }),
    )
    const gap = buildCellFrame(entry({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }))

    expect(notEnoughDwell.treatment.outline).toBeNull()
    expect(stale.treatment.outline).toBeNull()
    expect(gap.treatment.outline).toBeNull()
  })

  it('shows dwell progress for NOT_ENOUGH_DWELL and never a score', () => {
    const frame = buildCellFrame(
      entry({ observationState: 'NOT_ENOUGH_DWELL', densityPerSqM: 1, flow: null, risk: null, dwellMs: 18_000 }),
    )
    expect(frame.label).toBe('18 s of 30 s')
    expect(frame.label).not.toMatch(/0\.\d/)
  })

  it('carries a mandatory age badge for STALE', () => {
    const frame = buildCellFrame(
      entry({ observationState: 'STALE', densityPerSqM: 1, flow: null, risk: null, ageMs: 12_000 }),
    )
    expect(frame.label).toBe('12 s old')
  })

  it('carries no caption at all for GAP', () => {
    const frame = buildCellFrame(entry({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }))
    expect(frame.label).toBeNull()
    expect(frame.arrow).toBeNull()
    expect(frame.treatment.densityBucket).toBeNull()
  })

  it('carries no caption for OBSERVED - its score is the caption, read from risk', () => {
    const frame = buildCellFrame(
      entry({
        observationState: 'OBSERVED',
        densityPerSqM: 1,
        flow: null,
        risk: { score: 0.2, band: RISK_BAND.NORMAL },
        dwellMs: 30_000,
      }),
    )
    expect(frame.label).toBeNull()
  })

  it('draws an arrow only when flow is present, with no fabricated direction or length', () => {
    const noFlow = buildCellFrame(
      entry({
        observationState: 'OBSERVED',
        densityPerSqM: 1,
        flow: null,
        risk: { score: 0.2, band: RISK_BAND.NORMAL },
        dwellMs: 30_000,
      }),
    )
    const withFlow = buildCellFrame(
      entry({
        observationState: 'OBSERVED',
        densityPerSqM: 1,
        flow: { dirDeg: 137, speedMps: 1.4 },
        risk: { score: 0.2, band: RISK_BAND.NORMAL },
        dwellMs: 30_000,
      }),
    )

    expect(noFlow.arrow).toBeNull()
    expect(withFlow.arrow).toEqual({ dirDeg: 137, speedMps: 1.4 })
  })

  it('never draws an arrow for STALE or GAP, whose observation flow is always null', () => {
    const stale = buildCellFrame(
      entry({ observationState: 'STALE', densityPerSqM: 1, flow: null, risk: null, ageMs: 1_000 }),
    )
    const gap = buildCellFrame(entry({ observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }))
    expect(stale.arrow).toBeNull()
    expect(gap.arrow).toBeNull()
  })
})
