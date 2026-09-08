import {
  ALERT_STATUS,
  DRONE_STATE,
  OBSERVATION_STATE,
  SAFEGUARD_CHECK,
  SUGGESTION_ACTION,
  SUGGESTION_STATUS,
  TEXT_SOURCE,
  type ObservationState,
} from '@/domain/constants'
import {
  ALERT_CLEAR_HOLD_MS,
  ALERT_CLEAR_HYSTERESIS,
  DEFAULT_ALERT_THRESHOLD,
  DWELL_GATE_MS,
  STALE_MAX_AGE_MS,
} from '@/domain/parameters'
import type {
  Alert,
  AlertAttribution,
  CellUpdate,
  DroneUpdate,
  SafeguardResult,
  SuggestionOption,
  Zone,
  ZoneCoverage,
  ZoneUpdate,
} from '@/domain/types'
import { CellStore } from './cellStore'
import { bandFor, riskFor } from './riskModel'
import { clamp, mulberry32, nextFloat, nextInt, round, type Rng } from './rng'
import { SEED_NOW_MS, STALE_ROUTE_CELL, ZONE_B_PEAK_CELL, type SeedBundle } from './seed'
import type { SimCell, SimDrone } from './simTypes'

export const SCENARIO_ID = {
  CALM: 'CALM',
  CONVERGENCE: 'CONVERGENCE',
  TRANSIT_GAP: 'TRANSIT_GAP',
  SAFEGUARD_REJECT: 'SAFEGUARD_REJECT',
  MODEL_OFF: 'MODEL_OFF',
} as const
export type ScenarioId = (typeof SCENARIO_ID)[keyof typeof SCENARIO_ID]

export interface TickResult {
  ts: string
  cellBatch: CellUpdate[]
  zoneUpdates: ZoneUpdate[]
  droneUpdates: DroneUpdate[]
  raisedAlerts: Alert[]
  updatedAlerts: Alert[]
  clearedAlerts: Alert[]
  newSuggestionSets: SuggestionOption[][]
}

const D03_TRANSIT_TICKS = 12
const D03_OBSERVE_TICKS = 55 // >= DWELL_GATE_MS worth of ticks, plus a margin to linger OBSERVED
const D03_FOOTPRINTS: string[][] = [
  ['C-006-005', 'C-007-005', 'C-006-006', 'C-007-006'],
  ['C-018-012', 'C-019-012', 'C-018-013', 'C-019-013'],
  ['C-010-003', 'C-011-003', 'C-010-004', 'C-011-004'],
]

const CONVERGENCE_CELL = 'C-006-028' // a Concourse cell, distinct from the seeded A-1042 cell
const SAFEGUARD_REJECT_CELL = 'C-041-028' // a Concourse cell used only by this scenario

interface ScriptedEvent {
  kind: 'CONVERGENCE' | 'SAFEGUARD_REJECT'
  targetCellId: string
  alertId: string
  raised: boolean
  clearing: boolean
  belowHysteresisSinceMs: number | null
}

function toCellUpdate(cell: SimCell, ts: string): CellUpdate {
  return {
    cellId: cell.cellId,
    ts,
    observationState: cell.observationState,
    densityPerSqM: cell.densityPerSqM,
    flow: cell.flow,
    risk: cell.risk,
    ageMs:
      cell.observationState === OBSERVATION_STATE.STALE && cell.lastRealSampleAtMs !== null
        ? Date.parse(ts) - cell.lastRealSampleAtMs
        : 0,
    dwellMs: cell.dwellMs,
    observedBy: cell.observedBy,
  }
}

function makeAttribution(rng: Rng, dominant: readonly [string, number][]): AlertAttribution[] {
  const rest: AlertAttribution[] = [
    { feature: 'speedVariance', contribution: round(nextFloat(rng, 0.01, 0.05), 2), value: round(nextFloat(rng, 0.3, 0.7), 2) },
    { feature: 'density', contribution: round(nextFloat(rng, 0.01, 0.04), 2), value: round(nextFloat(rng, 2, 4.5), 2) },
    { feature: 'densityGradient', contribution: round(-nextFloat(rng, 0.01, 0.03), 2), value: round(nextFloat(rng, 0.05, 0.2), 2) },
    { feature: 'speedMean', contribution: round(-nextFloat(rng, 0.01, 0.05), 2), value: round(nextFloat(rng, 0.3, 0.5), 2) },
  ]
  const dominantEntries: AlertAttribution[] = dominant.map(([feature, contribution]) => ({
    feature: feature as AlertAttribution['feature'],
    contribution,
    value: round(nextFloat(rng, 0.2, 0.9), 2),
  }))
  return [...dominantEntries, ...rest].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}

/**
 * The deterministic 1 Hz simulator. `step()` advances exactly one tick and
 * returns only what changed - the batching and honesty rules from
 * CLAUDE.md live here:
 *   - risk is set only when `observationState` is `OBSERVED`.
 *   - `flow` is null while the observing drone is in `TRANSIT`.
 *   - `densityPerSqM` is null only for `GAP`.
 *   - a cell not sampled for more than `STALE_MAX_AGE_MS` becomes `GAP`.
 *   - nothing is ever interpolated, forward-filled or smoothed: every
 *     value written to a cell comes from this tick's own sampling pass.
 */
export class TickEngine {
  private readonly rng: Rng
  private tickCount = 0
  private readonly cells: Map<string, SimCell>
  private readonly drones: Map<string, SimDrone>
  private readonly zones: Zone[]
  private readonly alerts = new Map<string, Alert>()
  private readonly suggestionsByAlert = new Map<string, SuggestionOption[]>()
  private readonly cellStore: CellStore
  private scenario: ScenarioId = SCENARIO_ID.CALM
  private phrasingModelAvailable = false
  private nextAlertSeq = 1043
  private nextSuggestionSeq = 1
  private scripted: ScriptedEvent | null = null
  private d03Phase: 'TRANSIT' | 'OBSERVE' = 'TRANSIT'
  private d03PhaseTicks = 0
  private d03FootprintIndex = 0

  constructor(seed: SeedBundle, cellStore: CellStore) {
    this.rng = mulberry32(0x7a5a5) // continuation seed, independent of the seed-data offsets
    this.cells = seed.simCells
    this.drones = new Map(seed.simDrones.map((d) => [d.droneId, d]))
    this.zones = seed.zones
    this.alerts.set(seed.alert.alertId, seed.alert)
    this.alerts.set(seed.historicalAlert.alertId, seed.historicalAlert)
    this.suggestionsByAlert.set(seed.alert.alertId, seed.suggestions)
    this.suggestionsByAlert.set(seed.historicalAlert.alertId, [seed.historicalSuggestion])
    this.cellStore = cellStore
  }

  getScenario(): ScenarioId {
    return this.scenario
  }

  isPhrasingModelAvailable(): boolean {
    return this.phrasingModelAvailable
  }

  setScenario(scenario: ScenarioId): void {
    this.scenario = scenario
    if (scenario === SCENARIO_ID.TRANSIT_GAP) {
      this.d03Phase = 'TRANSIT'
      this.d03PhaseTicks = 0
    }
    if (scenario === SCENARIO_ID.MODEL_OFF) {
      this.phrasingModelAvailable = false
    }
    if (scenario === SCENARIO_ID.CALM && this.scripted && !this.scripted.raised) {
      // Cancel a ramp that had not yet crossed threshold; nothing to clear.
      this.scripted = null
    }
    if ((scenario === SCENARIO_ID.CONVERGENCE || scenario === SCENARIO_ID.SAFEGUARD_REJECT) && !this.scripted) {
      const kind = scenario
      const targetCellId = kind === SCENARIO_ID.CONVERGENCE ? CONVERGENCE_CELL : SAFEGUARD_REJECT_CELL
      this.scripted = {
        kind,
        targetCellId,
        alertId: `A-${this.nextAlertSeq++}`,
        raised: false,
        clearing: false,
        belowHysteresisSinceMs: null,
      }
    }
  }

  getAllCells(): SimCell[] {
    return [...this.cells.values()]
  }

  getAllDrones(): SimDrone[] {
    return [...this.drones.values()]
  }

  getAlerts(): Alert[] {
    return [...this.alerts.values()]
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId)
  }

  getSuggestions(alertId: string): SuggestionOption[] {
    return this.suggestionsByAlert.get(alertId) ?? []
  }

  getAllSuggestions(): SuggestionOption[] {
    return [...this.suggestionsByAlert.values()].flat()
  }

  acknowledgeAlert(alertId: string, actorId: string, ts: string): Alert | undefined {
    const alert = this.alerts.get(alertId)
    if (!alert) return undefined
    const updated: Alert = { ...alert, status: ALERT_STATUS.ACKNOWLEDGED, acknowledgedBy: actorId, acknowledgedAt: ts }
    this.alerts.set(alertId, updated)
    return updated
  }

  setSuggestion(suggestion: SuggestionOption): void {
    const list = this.suggestionsByAlert.get(suggestion.alertId) ?? []
    const next = list.map((s) => (s.suggestionId === suggestion.suggestionId ? suggestion : s))
    this.suggestionsByAlert.set(suggestion.alertId, next)
  }

  private isoAt(tick: number): string {
    return new Date(SEED_NOW_MS + tick * 1000).toISOString()
  }

  /** The `ts` the most recent `step()` emitted, or the seed moment before the first tick. */
  getCurrentTs(): string {
    return this.isoAt(this.tickCount)
  }

  /** A full snapshot of every cell at `ts` - used for `snapshot` messages and `getSiteState`. */
  getCellUpdates(ts: string): CellUpdate[] {
    return [...this.cells.values()].map((cell) => toCellUpdate(cell, ts))
  }

  getZoneUpdates(ts: string): ZoneUpdate[] {
    return this.zones.map((zone) => this.computeZoneUpdate(zone, ts))
  }

  getDroneUpdates(ts: string): DroneUpdate[] {
    return [...this.drones.values()].map((drone) => this.toDroneUpdate(drone, ts))
  }

  step(): TickResult {
    this.tickCount += 1
    const ts = this.isoAt(this.tickCount)
    const nowMs = Date.parse(ts)

    const cellBatch: CellUpdate[] = []
    const touched = new Set<string>()

    this.stepD03()
    this.applyDroneCoverage(nowMs, touched, cellBatch, ts)
    this.ageUncoveredCells(nowMs, touched, cellBatch, ts)

    const { raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets } = this.stepScriptedEvent(nowMs, ts)

    for (const cellId of touched) {
      const cell = this.cells.get(cellId)
      if (cell) this.cellStore.push(toCellUpdate(cell, ts))
    }

    const zoneUpdates = this.zones.map((zone) => this.computeZoneUpdate(zone, ts))
    const droneUpdates = [...this.drones.values()].map((d) => this.toDroneUpdate(d, ts))

    return { ts, cellBatch, zoneUpdates, droneUpdates, raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets }
  }

  /* ---------------------------------------------------------------- */
  /* Drone coverage and cell sampling                                   */
  /* ---------------------------------------------------------------- */

  private applyDroneCoverage(nowMs: number, touched: Set<string>, cellBatch: CellUpdate[], ts: string): void {
    // Group by cell so a cell seen by two drones (FR6.1) gets one entry.
    const coverage = new Map<string, { droneIds: string[]; anyObserve: boolean }>()
    for (const drone of this.drones.values()) {
      const anyObserve = drone.state === DRONE_STATE.OBSERVE
      for (const cellId of drone.footprintCells) {
        const entry = coverage.get(cellId) ?? { droneIds: [], anyObserve: false }
        entry.droneIds.push(drone.droneId)
        entry.anyObserve = entry.anyObserve || anyObserve
        coverage.set(cellId, entry)
      }
    }

    for (const [cellId, { droneIds, anyObserve }] of coverage) {
      const cell = this.cells.get(cellId)
      if (!cell) continue
      this.sampleCell(cell, droneIds, anyObserve, nowMs)
      touched.add(cellId)
      cellBatch.push(toCellUpdate(cell, ts))
    }
  }

  private sampleCell(cell: SimCell, droneIds: string[], anyObserve: boolean, nowMs: number): void {
    const wasContinuous = cell.lastRealSampleAtMs !== null && nowMs - cell.lastRealSampleAtMs <= 1500
    const prevDensity = cell.densityPerSqM ?? nextFloat(this.rng, 0.3, 1.5)
    cell.densityPerSqM = round(clamp(prevDensity + nextFloat(this.rng, -0.25, 0.25), 0, 6.5), 2)
    cell.observedBy = droneIds
    cell.lastRealSampleAtMs = nowMs

    if (!anyObserve) {
      // Transit-only coverage: density only, never risk - domain vocab
      // "Transit state ... Density only; risk shows not enough dwell".
      cell.dwellMs = wasContinuous ? cell.dwellMs + 1000 : 1000
      cell.flow = null
      cell.risk = null
      cell.observationState = OBSERVATION_STATE.NOT_ENOUGH_DWELL
      return
    }

    cell.dwellMs = wasContinuous ? cell.dwellMs + 1000 : 1000
    const prevHeading = cell.flow?.dirDeg ?? nextInt(this.rng, 360)
    cell.flow = {
      dirDeg: (prevHeading + nextInt(this.rng, 21) - 10 + 360) % 360,
      speedMps: round(clamp(nextFloat(this.rng, 0.1, 1.8), 0, 2.5), 2),
    }

    if (cell.dwellMs < DWELL_GATE_MS) {
      cell.risk = null
      cell.observationState = OBSERVATION_STATE.NOT_ENOUGH_DWELL
      return
    }

    cell.observationState = OBSERVATION_STATE.OBSERVED
    const scriptedOverride = this.scriptedRiskFor(cell.cellId)
    const baseline = cell.risk?.score ?? nextFloat(this.rng, 0.05, 0.3)
    const score =
      scriptedOverride ?? clamp(baseline + nextFloat(this.rng, -0.02, 0.02), 0, this.ambientCap(cell.cellId))
    cell.risk = riskFor(round(score, 2))
  }

  /** Ambient cells never drift into an undocumented alert on their own. */
  private ambientCap(cellId: string): number {
    if (cellId === ZONE_B_PEAK_CELL) return 0.85 // the seeded, already-open alert cell
    return 0.65
  }

  private scriptedRiskFor(cellId: string): number | null {
    if (!this.scripted || this.scripted.targetCellId !== cellId) return null
    const cell = this.cells.get(cellId)
    const current = cell?.risk?.score ?? 0.2
    if (this.scripted.clearing) {
      return clamp(current - 0.03, 0, 1)
    }
    return clamp(current + 0.035, 0, 0.9)
  }

  /* ---------------------------------------------------------------- */
  /* Aging: STALE within the gap horizon, GAP beyond it                 */
  /* ---------------------------------------------------------------- */

  private ageUncoveredCells(nowMs: number, touched: Set<string>, cellBatch: CellUpdate[], ts: string): void {
    for (const cell of this.cells.values()) {
      if (touched.has(cell.cellId)) continue
      // Already a gap: nothing changed, and a gap is never re-emitted for
      // want of a change (FR6.3) - it simply has no observation to report.
      if (cell.observationState === OBSERVATION_STATE.GAP) continue
      if (cell.lastRealSampleAtMs === null) continue

      // Reaching here, the cell was OBSERVED, NOT_ENOUGH_DWELL or STALE and
      // was not covered by any drone this tick, so it is aging: emitted
      // every tick either way, so a STALE cell's `ageMs` stays current.
      const age = nowMs - cell.lastRealSampleAtMs
      const next: ObservationState =
        age > STALE_MAX_AGE_MS ? OBSERVATION_STATE.GAP : OBSERVATION_STATE.STALE

      cell.observationState = next
      cell.dwellMs = 0
      cell.observedBy = []
      cell.flow = null
      cell.risk = null
      if (next === OBSERVATION_STATE.GAP) {
        cell.densityPerSqM = null
      }
      cellBatch.push(toCellUpdate(cell, ts))
    }
  }

  /* ---------------------------------------------------------------- */
  /* D-03's rove cycle - the TRANSIT_GAP demonstration                  */
  /* ---------------------------------------------------------------- */

  private stepD03(): void {
    const d03 = this.drones.get('D-03')
    if (!d03) return
    this.d03PhaseTicks += 1

    if (this.d03Phase === 'TRANSIT') {
      d03.state = DRONE_STATE.TRANSIT
      d03.link = 'ONLINE'
      d03.registration = { referenceFrameLocked: false, inliers: 0 }
      const target = D03_FOOTPRINTS[this.d03FootprintIndex % D03_FOOTPRINTS.length]
      // While transiting, D-03 samples only its current lead cell (density
      // only); its previous footprint is no longer covered by anyone and
      // ages naturally through ageUncoveredCells.
      const leadCell = target[this.d03PhaseTicks % target.length]
      d03.footprintCells = [leadCell]
      d03.pose = { ...d03.pose, headingDeg: (d03.pose.headingDeg + 7) % 360 }
      if (this.d03PhaseTicks >= D03_TRANSIT_TICKS) {
        this.d03Phase = 'OBSERVE'
        this.d03PhaseTicks = 0
        d03.footprintCells = target
      }
      return
    }

    // OBSERVE phase: hold the footprint so its cells can clear the dwell gate.
    d03.state = DRONE_STATE.OBSERVE
    d03.registration = { referenceFrameLocked: true, inliers: 260 + nextInt(this.rng, 60) }
    if (this.d03PhaseTicks >= D03_OBSERVE_TICKS) {
      this.d03Phase = 'TRANSIT'
      this.d03PhaseTicks = 0
      this.d03FootprintIndex += 1
    }
  }

  /* ---------------------------------------------------------------- */
  /* Scripted alert lifecycle - CONVERGENCE and SAFEGUARD_REJECT         */
  /* ---------------------------------------------------------------- */

  private stepScriptedEvent(
    nowMs: number,
    ts: string,
  ): {
    raisedAlerts: Alert[]
    updatedAlerts: Alert[]
    clearedAlerts: Alert[]
    newSuggestionSets: SuggestionOption[][]
  } {
    const raisedAlerts: Alert[] = []
    const updatedAlerts: Alert[] = []
    const clearedAlerts: Alert[] = []
    const newSuggestionSets: SuggestionOption[][] = []

    if (!this.scripted) return { raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets }
    const s = this.scripted
    const cell = this.cells.get(s.targetCellId)
    const score = cell?.risk?.score ?? 0

    if (!s.raised && score >= DEFAULT_ALERT_THRESHOLD) {
      const zoneId = cell?.zoneId ?? null
      if (!zoneId) return { raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets }
      const attribution =
        s.kind === 'CONVERGENCE'
          ? makeAttribution(this.rng, [
              ['flowConvergence', round(nextFloat(this.rng, 0.15, 0.22), 2)],
              ['counterFlow', round(nextFloat(this.rng, 0.08, 0.14), 2)],
              ['densityRateOfChange', round(nextFloat(this.rng, 0.08, 0.13), 2)],
            ])
          : makeAttribution(this.rng, [
              ['stopStartPulses', round(nextFloat(this.rng, 0.12, 0.18), 2)],
              ['exitOccupancy', round(nextFloat(this.rng, 0.08, 0.12), 2)],
              ['densityRateOfChange', round(nextFloat(this.rng, 0.06, 0.1), 2)],
            ])
      const alert: Alert = {
        alertId: s.alertId,
        raisedAt: ts,
        siteId: 'site-01',
        zoneId,
        cellId: s.targetCellId,
        score: round(score, 2),
        threshold: DEFAULT_ALERT_THRESHOLD,
        band: bandFor(score),
        status: ALERT_STATUS.OPEN,
        attribution,
        acknowledgedBy: null,
        acknowledgedAt: null,
      }
      this.alerts.set(alert.alertId, alert)
      raisedAlerts.push(alert)
      s.raised = true

      const suggestions = this.buildScriptedSuggestions(s)
      this.suggestionsByAlert.set(alert.alertId, suggestions)
      newSuggestionSets.push(suggestions)
      return { raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets }
    }

    if (s.raised && !s.clearing) {
      const alert = this.alerts.get(s.alertId)
      if (alert && round(score, 2) !== alert.score) {
        const updated: Alert = { ...alert, score: round(score, 2), band: bandFor(score) }
        this.alerts.set(alert.alertId, updated)
        updatedAlerts.push(updated)
      }
    }

    if (s.raised && s.clearing) {
      const clearFloor = DEFAULT_ALERT_THRESHOLD - ALERT_CLEAR_HYSTERESIS
      if (score < clearFloor) {
        s.belowHysteresisSinceMs ??= nowMs
        if (nowMs - s.belowHysteresisSinceMs >= ALERT_CLEAR_HOLD_MS) {
          const alert = this.alerts.get(s.alertId)
          if (alert) {
            const cleared: Alert = { ...alert, status: ALERT_STATUS.CLEARED }
            this.alerts.set(alert.alertId, cleared)
            clearedAlerts.push(cleared)
          }
          this.scripted = null
        }
      } else {
        s.belowHysteresisSinceMs = null
      }
    }

    return { raisedAlerts, updatedAlerts, clearedAlerts, newSuggestionSets }
  }

  /** Call to start the clearing (decay-to-baseline) phase of the current scripted alert. */
  beginClearingScriptedAlert(): void {
    if (this.scripted && this.scripted.raised) this.scripted.clearing = true
  }

  private buildScriptedSuggestions(scripted: ScriptedEvent): SuggestionOption[] {
    const source = this.phrasingModelAvailable ? TEXT_SOURCE.MODEL : TEXT_SOURCE.TEMPLATE
    const id = () => `sug-${scripted.alertId}-${this.nextSuggestionSeq++}`

    if (scripted.kind === 'SAFEGUARD_REJECT') {
      // Force the demo route cell stale right as the option is generated,
      // so the safeguard visibly fails rather than being pre-scripted text.
      const staleCell = this.cells.get(STALE_ROUTE_CELL)
      if (staleCell) {
        staleCell.observationState = OBSERVATION_STATE.STALE
        staleCell.risk = null
        staleCell.flow = null
        staleCell.dwellMs = 0
        staleCell.observedBy = []
      }
      const safeguards: SafeguardResult[] = [
        { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
        { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
        {
          check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE,
          passed: false,
          reason: `Cell ${STALE_ROUTE_CELL} has no recent data and cannot be confirmed safe.`,
        },
        { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
      ]
      return [
        {
          suggestionId: id(),
          alertId: scripted.alertId,
          rank: 1,
          status: SUGGESTION_STATUS.REJECTED,
          action: SUGGESTION_ACTION.OPEN_ALTERNATE_ROUTE,
          targetExitId: 'E1',
          routeCells: [scripted.targetCellId, STALE_ROUTE_CELL],
          text: 'Open an alternate route toward Exit E1.',
          textSource: source,
          rationale: 'This route was rejected: it cannot be shown safe while one of its cells has no recent data.',
          safeguards,
          confirmedBy: null,
          confirmedAt: null,
          dismissedBy: null,
          dismissedAt: null,
        },
      ]
    }

    const passedAll: SafeguardResult[] = [
      { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
      { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
      { check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE, passed: true },
      { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
      { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
    ]
    return [
      {
        suggestionId: id(),
        alertId: scripted.alertId,
        rank: 1,
        status: SUGGESTION_STATUS.PROPOSED,
        action: SUGGESTION_ACTION.DIVERT,
        targetExitId: 'E2',
        routeCells: [scripted.targetCellId],
        text: 'Divert the crowd toward Exit E2, which has spare capacity.',
        textSource: source,
        rationale: 'Exit E2 has spare capacity and the cells on this route are below the density threshold.',
        safeguards: passedAll,
        confirmedBy: null,
        confirmedAt: null,
        dismissedBy: null,
        dismissedAt: null,
      },
    ]
  }

  /* ---------------------------------------------------------------- */
  /* Zone and drone wire shapes                                         */
  /* ---------------------------------------------------------------- */

  private computeZoneUpdate(zone: Zone, ts: string): ZoneUpdate {
    const coverage: ZoneCoverage = { observed: 0, notEnoughDwell: 0, stale: 0, gap: 0, total: 0 }
    let peakCellId: string | null = null
    let peakScore = -1
    for (const cellId of zone.cellIds) {
      const cell = this.cells.get(cellId)
      if (!cell) continue
      coverage.total += 1
      switch (cell.observationState) {
        case OBSERVATION_STATE.OBSERVED:
          coverage.observed += 1
          if (cell.risk && cell.risk.score > peakScore) {
            peakScore = cell.risk.score
            peakCellId = cell.cellId
          }
          break
        case OBSERVATION_STATE.NOT_ENOUGH_DWELL:
          coverage.notEnoughDwell += 1
          break
        case OBSERVATION_STATE.STALE:
          coverage.stale += 1
          break
        case OBSERVATION_STATE.GAP:
          coverage.gap += 1
          break
      }
    }
    return {
      zoneId: zone.zoneId,
      ts,
      risk: peakCellId ? riskFor(peakScore) : null,
      coverage,
      peakCellId,
    }
  }

  private toDroneUpdate(drone: SimDrone, ts: string): DroneUpdate {
    return {
      droneId: drone.droneId,
      ts,
      state: drone.state,
      link: drone.link,
      pose: drone.pose,
      footprintCells: drone.footprintCells,
      batteryPct: drone.batteryPct,
      registration: drone.registration,
    }
  }
}
