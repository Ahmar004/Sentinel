import { describe, expect, it } from 'vitest'
import { OBSERVATION_STATE, RISK_BAND } from '@/domain/constants'
import type { CellObservation, Zone } from '@/domain/types'
import { summariseZone } from './zoneSummary'

const zone = (cellIds: string[]): Zone => ({
  zoneId: 'zone-c',
  siteId: 'site-01',
  name: 'Jamrat al-Wusta',
  cellIds,
  riskThreshold: 0.7,
  densityThreshold: 4,
})

const observed = (densityPerSqM: number): CellObservation => ({
  observationState: OBSERVATION_STATE.OBSERVED,
  densityPerSqM,
  flow: null,
  risk: { score: 0.2, band: RISK_BAND.NORMAL },
  dwellMs: 40_000,
})

const notEnoughDwell: CellObservation = {
  observationState: OBSERVATION_STATE.NOT_ENOUGH_DWELL,
  densityPerSqM: 3.2,
  flow: null,
  risk: null,
  dwellMs: 18_000,
}

const gap: CellObservation = {
  observationState: OBSERVATION_STATE.GAP,
  densityPerSqM: null,
  flow: null,
  risk: null,
}

describe('summariseZone', () => {
  it('counts people over observed cells only, at 25 square metres per cell', () => {
    const summary = summariseZone(zone(['a', 'b']), undefined, { a: observed(2), b: observed(1) })
    expect(summary.estimatedPeople).toBe(75)
    expect(summary.observedCellCount).toBe(2)
  })

  it('reports no estimate rather than zero when every cell is still filling its dwell window', () => {
    const summary = summariseZone(zone(['a', 'b']), undefined, { a: notEnoughDwell, b: notEnoughDwell })
    expect(summary.estimatedPeople).toBeNull()
    expect(summary.observedCellCount).toBe(0)
  })

  it('reports no estimate rather than zero when the zone is entirely unobserved', () => {
    const summary = summariseZone(zone(['a']), undefined, { a: gap })
    expect(summary.estimatedPeople).toBeNull()
  })

  it('excludes a not-enough-dwell cell from the count even though it carries a density', () => {
    const summary = summariseZone(zone(['a', 'b']), undefined, { a: observed(2), b: notEnoughDwell })
    expect(summary.estimatedPeople).toBe(50)
    expect(summary.observedCellCount).toBe(1)
  })

  it('treats a cell the feed has never sent as unobserved rather than as empty', () => {
    const summary = summariseZone(zone(['a', 'never-sent']), undefined, { a: observed(4) })
    expect(summary.estimatedPeople).toBe(100)
    expect(summary.observedCellCount).toBe(1)
  })
})
