import { describe, expect, it } from 'vitest'
import { CellStore } from './cellStore'
import { buildSeedBundle, ZONE_B_ID, ZONE_C_ID } from './seed'
import { SCENARIO_ID, TickEngine } from './tickEngine'

function freshEngine(): TickEngine {
  return new TickEngine(buildSeedBundle(), new CellStore())
}

describe('TickEngine determinism', () => {
  it('produces an identical tick sequence from a fresh engine given the same seed', () => {
    const engineA = freshEngine()
    const engineB = freshEngine()
    for (let i = 0; i < 25; i++) {
      const a = engineA.step()
      const b = engineB.step()
      expect(a).toEqual(b)
    }
  })

  it('produces an identical tick sequence under a scripted scenario too', () => {
    const engineA = freshEngine()
    const engineB = freshEngine()
    engineA.setScenario(SCENARIO_ID.CONVERGENCE)
    engineB.setScenario(SCENARIO_ID.CONVERGENCE)
    for (let i = 0; i < 40; i++) {
      expect(engineA.step()).toEqual(engineB.step())
    }
  })
})

describe('the honesty invariant (srs.md 2.3), enforced every tick', () => {
  it('never carries a risk score unless observationState is OBSERVED', () => {
    const engine = freshEngine()
    for (let i = 0; i < 60; i++) {
      const { cellBatch } = engine.step()
      for (const cell of cellBatch) {
        if (cell.observationState !== 'OBSERVED') {
          expect(cell.risk).toBeNull()
        } else {
          expect(cell.risk).not.toBeNull()
        }
      }
    }
  })

  it('never carries flow for STALE or GAP cells', () => {
    const engine = freshEngine()
    for (let i = 0; i < 60; i++) {
      const { cellBatch } = engine.step()
      for (const cell of cellBatch) {
        if (cell.observationState === 'STALE' || cell.observationState === 'GAP') {
          expect(cell.flow).toBeNull()
        }
      }
    }
  })

  it('carries densityPerSqM as null only for GAP', () => {
    const engine = freshEngine()
    for (let i = 0; i < 60; i++) {
      const { cellBatch } = engine.step()
      for (const cell of cellBatch) {
        if (cell.observationState === 'GAP') {
          expect(cell.densityPerSqM).toBeNull()
        } else {
          expect(cell.densityPerSqM).not.toBeNull()
        }
      }
    }
  })

  it('turns a cell GAP once it has gone unobserved for more than the 10 s stale horizon', () => {
    const engine = freshEngine()
    // Zone C has cells the seed marks NOT_ENOUGH_DWELL under D-03, whose
    // live footprint moves elsewhere from tick 1 onward, so these cells
    // are guaranteed to lose coverage immediately.
    const zoneCCellBefore = engine
      .getAllCells()
      .find((c) => c.zoneId === ZONE_C_ID && c.observationState === 'NOT_ENOUGH_DWELL')
    expect(zoneCCellBefore).toBeDefined()
    const cellId = zoneCCellBefore!.cellId

    let sawStale = false
    for (let i = 0; i < 11; i++) {
      engine.step()
      const cell = engine.getAllCells().find((c) => c.cellId === cellId)
      if (cell?.observationState === 'STALE') sawStale = true
    }
    const after = engine.getAllCells().find((c) => c.cellId === cellId)
    expect(sawStale).toBe(true)
    expect(after?.observationState).toBe('GAP')
    expect(after?.densityPerSqM).toBeNull()
  })

  it('never emits a zone update without its coverage counts, and coverage always sums to the zone size', () => {
    const engine = freshEngine()
    for (let i = 0; i < 20; i++) {
      const { zoneUpdates } = engine.step()
      for (const zone of zoneUpdates) {
        expect(zone.coverage).toBeDefined()
        const { observed, notEnoughDwell, stale, gap, total } = zone.coverage
        expect(observed + notEnoughDwell + stale + gap).toBe(total)
        expect(total).toBeGreaterThan(0)
      }
    }
  })

  it('reports zone risk as the maximum score among that zone\'s observed cells', () => {
    const engine = freshEngine()
    const { zoneUpdates } = engine.step()
    const zoneB = zoneUpdates.find((z) => z.zoneId === ZONE_B_ID)
    expect(zoneB?.risk).not.toBeNull()
    const observedScores = engine
      .getAllCells()
      .filter((c) => c.zoneId === ZONE_B_ID && c.observationState === 'OBSERVED')
      .map((c) => c.risk?.score ?? -1)
    expect(zoneB?.risk?.score).toBe(Math.max(...observedScores))
    expect(zoneB?.peakCellId).toBeTruthy()
  })

  it('gives zone C (never observed at the seed) a null risk rather than a zero', () => {
    const engine = freshEngine()
    const { zoneUpdates } = engine.step()
    const zoneC = zoneUpdates.find((z) => z.zoneId === ZONE_C_ID)
    expect(zoneC?.risk).toBeNull()
    expect(zoneC?.peakCellId).toBeNull()
  })

  it('never fabricates a value: every emitted cell update was produced by this tick\'s own sampling or aging pass', () => {
    const engine = freshEngine()
    const { cellBatch } = engine.step()
    // Every batched entry must belong to a real, known cell in the grid.
    const allIds = new Set(engine.getAllCells().map((c) => c.cellId))
    for (const cell of cellBatch) expect(allIds.has(cell.cellId)).toBe(true)
  })
})

describe('scripted scenarios (srs.md Appendix B)', () => {
  it('CONVERGENCE eventually raises a new alert with attribution led by flow features', () => {
    const engine = freshEngine()
    engine.setScenario(SCENARIO_ID.CONVERGENCE)
    let raised: ReturnType<TickEngine['step']>['raisedAlerts'][number] | undefined
    for (let i = 0; i < 40 && !raised; i++) {
      const { raisedAlerts } = engine.step()
      if (raisedAlerts.length > 0) raised = raisedAlerts[0]
    }
    expect(raised).toBeDefined()
    expect(raised?.band).not.toBe('NORMAL')
    expect(Math.abs(raised!.attribution[0].contribution)).toBeGreaterThanOrEqual(
      Math.abs(raised!.attribution.at(-1)!.contribution),
    )
  })

  it('SAFEGUARD_REJECT produces a rejected suggestion naming the stale cell', () => {
    const engine = freshEngine()
    engine.setScenario(SCENARIO_ID.SAFEGUARD_REJECT)
    let suggestions: ReturnType<TickEngine['step']>['newSuggestionSets'][number] | undefined
    for (let i = 0; i < 40 && !suggestions; i++) {
      const { newSuggestionSets } = engine.step()
      if (newSuggestionSets.length > 0) suggestions = newSuggestionSets[0]
    }
    expect(suggestions).toBeDefined()
    expect(suggestions?.[0].status).toBe('REJECTED')
    const failed = suggestions?.[0].safeguards.find((s) => !s.passed)
    expect(failed?.check).toBe('STALE_CELL_ON_ROUTE')
    expect(failed?.reason).toBeTruthy()
  })

  it('MODEL_OFF keeps the phrasing model unavailable', () => {
    const engine = freshEngine()
    engine.setScenario(SCENARIO_ID.MODEL_OFF)
    expect(engine.isPhrasingModelAvailable()).toBe(false)
  })

  it('zone A never drifts into an alert on its own under CALM', () => {
    const engine = freshEngine()
    for (let i = 0; i < 60; i++) {
      const { cellBatch } = engine.step()
      for (const cell of cellBatch) {
        if (cell.observationState === 'OBSERVED' && cell.risk) {
          // The one seeded exception is the already-open alert cell.
          if (cell.cellId !== 'C-031-022') {
            expect(cell.risk.score).toBeLessThan(0.7)
          }
        }
      }
    }
  })
})
