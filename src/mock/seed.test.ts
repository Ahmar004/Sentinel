import { describe, expect, it } from 'vitest'
import { GRID_CELL_COUNT } from '@/domain/parameters'
import {
  ZONE_A_ID,
  ZONE_A_PEAK_CELL,
  ZONE_B_ID,
  ZONE_B_PEAK_CELL,
  ZONE_C_ID,
  ZONE_COVERAGE,
  buildSeedBundle,
} from './seed'

describe('buildSeedBundle determinism', () => {
  it('produces byte-identical output on two independent calls', () => {
    const a = buildSeedBundle()
    const b = buildSeedBundle()
    // Maps do not survive JSON.stringify usefully; compare their entries.
    expect([...a.simCells.entries()]).toEqual([...b.simCells.entries()])
    expect(a.zones).toEqual(b.zones)
    expect(a.alert).toEqual(b.alert)
    expect(a.suggestions).toEqual(b.suggestions)
    expect(a.setupProposals).toEqual(b.setupProposals)
    expect(a.historyEvents).toEqual(b.historyEvents)
    expect(a.auditLog).toEqual(b.auditLog)
  })
})

describe('the canonical dataset - wireframes.md Section 5', () => {
  const seed = buildSeedBundle()

  it('has exactly 2400 cells, partitioned with no overlap', () => {
    expect(seed.cells).toHaveLength(GRID_CELL_COUNT)
    const uniqueIds = new Set(seed.cells.map((c) => c.cellId))
    expect(uniqueIds.size).toBe(GRID_CELL_COUNT)
  })

  it('gives each zone exactly the cell count the coverage table sums to', () => {
    expect(seed.zones.find((z) => z.zoneId === ZONE_A_ID)?.cellIds).toHaveLength(800)
    expect(seed.zones.find((z) => z.zoneId === ZONE_B_ID)?.cellIds).toHaveLength(800)
    expect(seed.zones.find((z) => z.zoneId === ZONE_C_ID)?.cellIds).toHaveLength(600)
  })

  it('matches the zone coverage counts exactly', () => {
    for (const zoneId of [ZONE_A_ID, ZONE_B_ID, ZONE_C_ID]) {
      const expected = ZONE_COVERAGE[zoneId]
      const cellIds = seed.zones.find((z) => z.zoneId === zoneId)?.cellIds ?? []
      const counts = { observed: 0, notEnoughDwell: 0, stale: 0, gap: 0 }
      for (const cellId of cellIds) {
        const cell = seed.simCells.get(cellId)
        expect(cell).toBeDefined()
        switch (cell?.observationState) {
          case 'OBSERVED':
            counts.observed++
            break
          case 'NOT_ENOUGH_DWELL':
            counts.notEnoughDwell++
            break
          case 'STALE':
            counts.stale++
            break
          case 'GAP':
            counts.gap++
            break
        }
      }
      expect(counts).toEqual(expected)
    }
  })

  it('gives zone A its peak cell at 0.31 and zone B its peak (the alert cell) at 0.78', () => {
    expect(seed.simCells.get(ZONE_A_PEAK_CELL)?.risk?.score).toBe(0.31)
    expect(seed.simCells.get(ZONE_B_PEAK_CELL)?.risk?.score).toBe(0.78)
  })

  it('never gives zone C (all not-enough-dwell or gap) a risk score anywhere', () => {
    const zoneC = seed.zones.find((z) => z.zoneId === ZONE_C_ID)
    for (const cellId of zoneC?.cellIds ?? []) {
      expect(seed.simCells.get(cellId)?.risk).toBeNull()
    }
  })

  it('assigns the FR6.1 fusion cells to both D-02 and D-04', () => {
    for (const cellId of ['C-020-030', 'C-021-030', 'C-022-030']) {
      const cell = seed.simCells.get(cellId)
      expect(cell?.observedBy).toEqual(expect.arrayContaining(['D-02', 'D-04']))
    }
  })

  it('gives the walkable/exit/barrier/obstruction counts from the canonical table', () => {
    let walkableOnly = 0
    let exit = 0
    let barrier = 0
    let obstruction = 0
    for (const cell of seed.cells) {
      if (cell.isExit) exit++
      else if (cell.isBarrier) barrier++
      else if (cell.isObstruction) obstruction++
      else walkableOnly++
    }
    expect({ walkableOnly, exit, barrier, obstruction }).toEqual({
      walkableOnly: 2104,
      exit: 14,
      barrier: 118,
      obstruction: 164,
    })
  })

  it('seeds A-1042 already acknowledged, led by flowConvergence as wireframes.md Section 5 gives it', () => {
    expect(seed.alert.status).toBe('ACKNOWLEDGED')
    expect(seed.alert.acknowledgedBy).toBe('a.rahman')
    expect(seed.alert.attribution[0]).toEqual({ feature: 'flowConvergence', contribution: 0.19, value: 0.71 })
    expect(seed.alert.attribution).toHaveLength(9)
  })

  it('rejects the third A-1042 suggestion on the stale route cell, with a reason', () => {
    const rejected = seed.suggestions.find((s) => s.status === 'REJECTED')
    expect(rejected).toBeDefined()
    const failing = rejected?.safeguards.find((s) => !s.passed)
    expect(failing?.check).toBe('STALE_CELL_ON_ROUTE')
    expect(failing?.reason).toBeTruthy()
  })

  it('deactivates exactly one seeded user, k.javed', () => {
    const inactive = seed.users.filter((u) => !u.active)
    expect(inactive).toHaveLength(1)
    expect(inactive[0].username).toBe('k.javed')
  })

  it('seeds at least 40 history events', () => {
    expect(seed.historyEvents.length).toBeGreaterThanOrEqual(40)
  })

  it('gives the SG-0771 outcome an IMPROVED verdict with a falling trajectory', () => {
    expect(seed.outcome.verdict).toBe('IMPROVED')
    expect(seed.outcome.trajectory[0].risk).toBe(seed.outcome.riskAtConfirm)
    expect(seed.outcome.trajectory.at(-1)?.risk).toBeCloseTo(seed.outcome.peakRiskInWindow, 1)
  })
})
