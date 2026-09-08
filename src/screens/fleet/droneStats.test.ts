import { describe, expect, it } from 'vitest'
import { DRONE_LINK, DRONE_STATE, OBSERVATION_STATE, RISK_BAND } from '@/domain/constants'
import type { CellObservation, DroneUpdate } from '@/domain/types'
import { footprintStats, overlappingCells } from './droneStats'

const drone = (droneId: string, footprintCells: string[]): DroneUpdate => ({
  droneId,
  ts: '2026-09-08T14:03:12.000Z',
  state: DRONE_STATE.OBSERVE,
  link: DRONE_LINK.ONLINE,
  pose: { lat: 0, lon: 0, altM: 60, headingDeg: 0 },
  footprintCells,
  batteryPct: 80,
  registration: { referenceFrameLocked: true, inliers: 400 },
})

const observed = (densityPerSqM: number, dwellMs = 40_000): CellObservation => ({
  observationState: OBSERVATION_STATE.OBSERVED,
  densityPerSqM,
  flow: null,
  risk: { score: 0.3, band: RISK_BAND.NORMAL },
  dwellMs,
})

const filling: CellObservation = {
  observationState: OBSERVATION_STATE.NOT_ENOUGH_DWELL,
  densityPerSqM: 2,
  flow: null,
  risk: null,
  dwellMs: 12_000,
}

describe('footprintStats', () => {
  it('counts people over observed footprint cells at 25 square metres each', () => {
    const stats = footprintStats(drone('D-01', ['a', 'b']), { a: observed(2), b: observed(1) })
    expect(stats.estimatedPeople).toBe(75)
    expect(stats.observedCellCount).toBe(2)
    expect(stats.footprintCellCount).toBe(2)
  })

  it('reports no estimate rather than zero for a drone that has just arrived', () => {
    const stats = footprintStats(drone('D-03', ['a', 'b']), { a: filling, b: filling })
    expect(stats.estimatedPeople).toBeNull()
    expect(stats.observedCellCount).toBe(0)
  })

  it('derives the longest dwell from the footprint cells', () => {
    const stats = footprintStats(drone('D-01', ['a', 'b']), { a: observed(1, 51_000), b: filling })
    expect(stats.longestDwellMs).toBe(51_000)
  })

  it('has no dwell to report when no footprint cell carries one', () => {
    const stats = footprintStats(drone('D-03', ['a']), {})
    expect(stats.longestDwellMs).toBeNull()
  })
})

describe('overlappingCells', () => {
  it('finds cells two drones both write to, which is fusion by coordinates', () => {
    const overlap = overlappingCells([drone('D-02', ['x', 'y', 'z']), drone('D-04', ['y', 'z', 'w'])])
    expect([...overlap].sort()).toEqual(['y', 'z'])
  })

  it('finds nothing when footprints are disjoint', () => {
    expect(overlappingCells([drone('D-01', ['a']), drone('D-02', ['b'])]).size).toBe(0)
  })
})
