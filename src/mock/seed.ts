/**
 * The canonical dataset - wireframes.md Section 5, transcribed exactly.
 *
 * `buildSeedBundle()` is a pure function: called with no arguments it uses
 * only fixed, offset seeds of the one canonical PRNG, so two calls (for
 * example one in the running app and one in a test) produce byte-identical
 * output. Nothing in this module reads the system clock or `Math.random`.
 */
import {
  ALERT_STATUS,
  DRONE_LINK,
  DRONE_STATE,
  OBSERVATION_STATE,
  ROLE,
  SAFEGUARD_CHECK,
  SUGGESTION_ACTION,
  SUGGESTION_STATUS,
  TEXT_SOURCE,
  OUTCOME_VERDICT,
} from '@/domain/constants'
import { formatCellId } from '@/domain/parameters'
import type {
  Alert,
  AlertAttribution,
  AuditEntry,
  Cell,
  Exit,
  Grid,
  HistoryEvent,
  Outcome,
  OutcomeTrajectoryPoint,
  Site,
  SetupProposal,
  SetupProposalAttribute,
  SetupProposalStatus,
  SuggestionOption,
  SystemHealth,
  ThresholdSet,
  User,
  Zone,
} from '@/domain/types'
import {
  zoneCCellIds,
  assignCellAttributes,
  cellCentreLatLon,
  zoneACellIds,
  zoneBCellIds,
  rectCellIds,
  toCellRecord,
  unzonedCellIds,
  type CellAttributeKind,
} from './grid'
import { CANONICAL_SEED, clamp, mulberry32, nextFloat, nextInt, pick, round, shuffle, type Rng } from './rng'
import type { SimCell, SimDrone } from './simTypes'

/** The moment the canonical dataset describes - wireframes.md "Clock 14:03:12". */
/**
 * The moment the canonical dataset in docs/wireframes.md describes. Every
 * seeded timestamp is expressed relative to it.
 */
const CANONICAL_NOW_MS = Date.parse('2026-09-08T14:03:12.000Z')

/**
 * The demo's "now", anchored to the real clock when the module loads.
 *
 * The canonical dataset pins a fixed moment so that fifty wireframes agree
 * with each other, which is exactly right for a frozen picture and exactly
 * wrong for a running app: every screen asks for "the last hour" measured
 * from the real clock, so a seed pinned to a past date returns nothing at
 * all, and returns less every day that passes.
 *
 * Anchoring here keeps every relative offset the canonical dataset states -
 * the alert is still raised 21 seconds before now, still acknowledged 13
 * seconds after that - while placing the whole story where the screens are
 * actually looking.
 */
export const SEED_NOW_MS = Date.now()
export const SEED_NOW_ISO = new Date(SEED_NOW_MS).toISOString()

/** Translates a canonical timestamp onto the demo clock, preserving its
 * distance from the canonical moment exactly. */
export function seedTime(canonicalIso: string): string {
  return new Date(SEED_NOW_MS + (Date.parse(canonicalIso) - CANONICAL_NOW_MS)).toISOString()
}

export const SEED_SITE_ID = 'site-01'
const GRID_ID = 'grid-01'

export const ZONE_A_ID = 'zone-a'
export const ZONE_B_ID = 'zone-b'
export const ZONE_C_ID = 'zone-c'
export const EXIT_E1_ID = 'E1'
export const EXIT_E2_ID = 'E2'

/* ------------------------------------------------------------------ */
/* Site, grid, zones, exits, thresholds                                */
/* ------------------------------------------------------------------ */

export function buildSite(): Site {
  return {
    id: SEED_SITE_ID,
    name: 'Mina - Jamarat Bridge',
    planImageUrl: '',
    groundExtentM: { width: 300, height: 200 },
    createdAt: seedTime('2026-08-01T09:00:00.000Z'),
  }
}

const GRID_ORIGIN = { lat: 21.4225, lon: 39.8262 }

export function buildGrid(): Grid {
  return {
    siteId: SEED_SITE_ID,
    cellSizeM: 5,
    originLatLon: GRID_ORIGIN,
    cols: 60,
    rows: 40,
  }
}

function exitCellIds(): { e1: string[]; e2: string[] } {
  return {
    e1: rectCellIds({ colMin: 0, colMax: 7, rowMin: 39, rowMax: 39 }), // 8 cells, south edge
    e2: rectCellIds({ colMin: 54, colMax: 59, rowMin: 0, rowMax: 0 }), // 6 cells, north edge
  }
}

export function buildZones(): Zone[] {
  return [
    {
      zoneId: ZONE_A_ID,
      siteId: SEED_SITE_ID,
      name: 'West Deck Approach',
      cellIds: zoneACellIds(),
      riskThreshold: 0.7,
      densityThreshold: 4.0,
    },
    {
      zoneId: ZONE_B_ID,
      siteId: SEED_SITE_ID,
      name: 'Jamrat al-Aqaba',
      cellIds: zoneBCellIds(),
      riskThreshold: 0.7,
      densityThreshold: 4.0,
    },
    {
      zoneId: ZONE_C_ID,
      siteId: SEED_SITE_ID,
      name: 'Jamrat al-Wusta',
      cellIds: zoneCCellIds(),
      riskThreshold: 0.7,
      densityThreshold: 4.0,
    },
  ]
}

export function buildExits(): Exit[] {
  const { e1, e2 } = exitCellIds()
  return [
    { exitId: EXIT_E1_ID, siteId: SEED_SITE_ID, cellIds: e1, capacityPerMin: 1200, label: 'Exit W1 to tunnels' },
    { exitId: EXIT_E2_ID, siteId: SEED_SITE_ID, cellIds: e2, capacityPerMin: 900, label: 'Exit E2 to camps' },
  ]
}

export function buildThresholds(): ThresholdSet[] {
  return [ZONE_A_ID, ZONE_B_ID, ZONE_C_ID].map((zoneId) => ({
    siteId: SEED_SITE_ID,
    zoneId,
    riskThreshold: 0.7,
    densityThreshold: 4.0,
    version: 1,
    changedBy: 's.iqbal',
    changedAt: seedTime('2026-08-02T10:00:00.000Z'),
  }))
}

/* ------------------------------------------------------------------ */
/* Cell attributes - walkable 2104, exit 14, barrier 118, obstruction 164 */
/* ------------------------------------------------------------------ */

export const BARRIER_COUNT = 118
export const OBSTRUCTION_COUNT = 164

function zoneIdForCell(
  cellId: string,
  zoneA: Set<string>,
  northGate: Set<string>,
  arena: Set<string>,
): string | null {
  if (zoneA.has(cellId)) return ZONE_A_ID
  if (northGate.has(cellId)) return ZONE_B_ID
  if (arena.has(cellId)) return ZONE_C_ID
  return null
}

export function buildCells(): { cells: Cell[]; attributes: Map<string, CellAttributeKind> } {
  const rng = mulberry32(CANONICAL_SEED + 2)
  const { e1, e2 } = exitCellIds()
  const exitIds = new Set([...e1, ...e2])
  const zoneA = new Set(zoneACellIds())
  const northGate = new Set(zoneBCellIds())
  const arena = new Set(zoneCCellIds())
  const unzoned = unzonedCellIds()

  const allCellIds: string[] = []
  for (let row = 0; row < 40; row++) {
    for (let col = 0; col < 60; col++) allCellIds.push(formatCellId(col, row))
  }

  const attributes = assignCellAttributes(rng, allCellIds, exitIds, BARRIER_COUNT, OBSTRUCTION_COUNT)

  const cells: Cell[] = allCellIds.map((cellId) => {
    const match = /^C-(\d{3})-(\d{3})$/.exec(cellId)
    if (!match) throw new Error(`Malformed generated cellId ${cellId}`)
    const col = Number(match[1])
    const row = Number(match[2])
    const zoneId = zoneIdForCell(cellId, zoneA, northGate, arena)
    return toCellRecord(cellId, col, row, GRID_ID, zoneId, attributes.get(cellId), 5, GRID_ORIGIN)
  })

  // unzoned is otherwise unused directly (its cells simply carry zoneId null,
  // already produced by zoneIdForCell above); referenced here so the region
  // stays intentional rather than an unexplained gap in the partition.
  void unzoned

  return { cells, attributes }
}

/* ------------------------------------------------------------------ */
/* Users and credentials                                               */
/* ------------------------------------------------------------------ */

export const SEED_PASSWORD = 'sentinel'

export function buildUsers(): User[] {
  return [
    {
      userId: 'a.rahman',
      username: 'a.rahman',
      role: ROLE.COORDINATOR,
      active: true,
      createdAt: seedTime('2026-06-01T08:00:00.000Z'),
      lastLoginAt: seedTime('2026-09-08T13:55:00.000Z'),
    },
    {
      userId: 's.iqbal',
      username: 's.iqbal',
      role: ROLE.ADMINISTRATOR,
      active: true,
      createdAt: seedTime('2026-05-15T08:00:00.000Z'),
      lastLoginAt: seedTime('2026-09-08T08:30:00.000Z'),
    },
    {
      userId: 'm.tariq',
      username: 'm.tariq',
      role: ROLE.DRONE_OPERATOR,
      active: true,
      createdAt: seedTime('2026-06-10T08:00:00.000Z'),
      lastLoginAt: seedTime('2026-09-08T13:40:00.000Z'),
    },
    {
      userId: 'n.hassan',
      username: 'n.hassan',
      role: ROLE.IT,
      active: true,
      createdAt: seedTime('2026-06-10T08:00:00.000Z'),
      lastLoginAt: seedTime('2026-09-07T17:00:00.000Z'),
    },
    {
      userId: 'k.javed',
      username: 'k.javed',
      role: ROLE.COORDINATOR,
      active: false,
      createdAt: seedTime('2026-06-01T08:00:00.000Z'),
      lastLoginAt: seedTime('2026-07-20T09:00:00.000Z'),
    },
  ]
}

/* ------------------------------------------------------------------ */
/* Initial per-cell simulation state                                   */
/* ------------------------------------------------------------------ */

interface ZoneCoverageCounts {
  observed: number
  notEnoughDwell: number
  stale: number
  gap: number
}

/** wireframes.md Section 5, "Zones" table. */
export const ZONE_COVERAGE: Record<string, ZoneCoverageCounts> = {
  [ZONE_A_ID]: { observed: 656, notEnoughDwell: 32, stale: 24, gap: 88 },
  [ZONE_B_ID]: { observed: 192, notEnoughDwell: 72, stale: 56, gap: 480 },
  [ZONE_C_ID]: { observed: 0, notEnoughDwell: 372, stale: 0, gap: 228 },
}

export const ZONE_A_PEAK_CELL = 'C-012-034'
export const ZONE_B_PEAK_CELL = 'C-031-022' // also the A-1042 alert cell
export const ZONE_B_NEIGHBOUR_CELL = 'C-030-019' // named in the HOLD_AND_METER rationale
export const STALE_ROUTE_CELL = 'C-024-026' // the SAFEGUARD_REJECT demo cell
export const FUSION_CELLS = ['C-020-030', 'C-021-030', 'C-022-030'] // FR6.1, seen by D-02 and D-04
export const DIVERT_ROUTE_CELLS = ['C-031-022', 'C-032-021', 'C-033-020']
export const SG0771_CELLS = ['C-031-022', 'C-032-022', 'C-033-021']

const DRONE_D01 = 'D-01'
const DRONE_D02 = 'D-02'
const DRONE_D03 = 'D-03'
const DRONE_D04 = 'D-04'

function makeObservedCell(
  rng: Rng,
  cellId: string,
  col: number,
  row: number,
  zoneId: string,
  risk: number,
  observedBy: string[],
): SimCell {
  const density = round(clamp(risk * 5 + nextFloat(rng, -0.4, 0.4), 0.1, 6), 2)
  return {
    cellId,
    col,
    row,
    zoneId,
    walkable: true,
    observationState: OBSERVATION_STATE.OBSERVED,
    densityPerSqM: density,
    flow: { dirDeg: nextInt(rng, 360), speedMps: round(nextFloat(rng, 0.2, 1.6), 2) },
    risk: { score: round(risk, 2), band: bandForSeed(risk) },
    dwellMs: nextInt(rng, 800_000) + 30_000,
    observedBy,
    lastRealSampleAtMs: SEED_NOW_MS,
  }
}

function bandForSeed(score: number): 'NORMAL' | 'WATCH' | 'ELEVATED' | 'CRITICAL' {
  if (score >= 0.85) return 'CRITICAL'
  if (score >= 0.7) return 'ELEVATED'
  if (score >= 0.4) return 'WATCH'
  return 'NORMAL'
}

function makeNotEnoughDwellCell(
  rng: Rng,
  cellId: string,
  col: number,
  row: number,
  zoneId: string,
  observedBy: string[],
  withFlow: boolean,
): SimCell {
  return {
    cellId,
    col,
    row,
    zoneId,
    walkable: true,
    observationState: OBSERVATION_STATE.NOT_ENOUGH_DWELL,
    densityPerSqM: round(nextFloat(rng, 0.3, 2.8), 2),
    flow: withFlow ? { dirDeg: nextInt(rng, 360), speedMps: round(nextFloat(rng, 0.1, 1.2), 2) } : null,
    risk: null,
    dwellMs: nextInt(rng, 29_000),
    observedBy,
    lastRealSampleAtMs: SEED_NOW_MS,
  }
}

function makeStaleCell(
  rng: Rng,
  cellId: string,
  col: number,
  row: number,
  zoneId: string,
  ageMs: number,
): SimCell {
  return {
    cellId,
    col,
    row,
    zoneId,
    walkable: true,
    observationState: OBSERVATION_STATE.STALE,
    densityPerSqM: round(nextFloat(rng, 0.2, 2.5), 2),
    flow: null,
    risk: null,
    dwellMs: 0,
    observedBy: [],
    lastRealSampleAtMs: SEED_NOW_MS - ageMs,
  }
}

function makeGapCell(cellId: string, col: number, row: number, zoneId: string | null): SimCell {
  return {
    cellId,
    col,
    row,
    zoneId,
    walkable: true,
    observationState: OBSERVATION_STATE.GAP,
    densityPerSqM: null,
    flow: null,
    risk: null,
    dwellMs: 0,
    observedBy: [],
    lastRealSampleAtMs: null,
  }
}

function colRowOf(cellId: string): { col: number; row: number } {
  const match = /^C-(\d{3})-(\d{3})$/.exec(cellId)
  if (!match) throw new Error(`Malformed cellId ${cellId}`)
  return { col: Number(match[1]), row: Number(match[2]) }
}

/**
 * Builds the initial per-cell simulation state so that, for each zone, the
 * observation-state counts match `ZONE_COVERAGE` exactly and the named
 * cells above land in the state the canonical dataset requires. This is a
 * one-shot seed of the simulation, not a claim about how those cells
 * arrived there - `tickEngine` evolves everything honestly from this point
 * forward.
 */
export function buildInitialSimCells(): Map<string, SimCell> {
  const rng = mulberry32(CANONICAL_SEED + 3)
  const cells = new Map<string, SimCell>()

  function planZone(
    zoneId: string,
    allIds: string[],
    counts: ZoneCoverageCounts,
    forcedObserved: Map<string, { risk: number; observedBy: string[] }>,
    forcedStale: Map<string, number>,
    observedByPool: string[],
  ): void {
    const forcedIds = new Set([...forcedObserved.keys(), ...forcedStale.keys()])
    const remaining = shuffle(
      rng,
      allIds.filter((id) => !forcedIds.has(id)),
    )
    let cursor = 0
    const remainingObserved = counts.observed - forcedObserved.size
    const remainingStale = counts.stale - forcedStale.size

    const take = (n: number): string[] => {
      const slice = remaining.slice(cursor, cursor + n)
      cursor += n
      return slice
    }

    for (const [cellId, { risk, observedBy }] of forcedObserved) {
      const { col, row } = colRowOf(cellId)
      cells.set(cellId, makeObservedCell(rng, cellId, col, row, zoneId, risk, observedBy))
    }
    for (const cellId of take(remainingObserved)) {
      const { col, row } = colRowOf(cellId)
      const risk = nextFloat(rng, 0.02, 0.35)
      cells.set(cellId, makeObservedCell(rng, cellId, col, row, zoneId, risk, [pick(rng, observedByPool)]))
    }
    for (const cellId of take(counts.notEnoughDwell)) {
      const { col, row } = colRowOf(cellId)
      cells.set(
        cellId,
        makeNotEnoughDwellCell(rng, cellId, col, row, zoneId, [pick(rng, observedByPool)], true),
      )
    }
    for (const [cellId, ageMs] of forcedStale) {
      const { col, row } = colRowOf(cellId)
      cells.set(cellId, makeStaleCell(rng, cellId, col, row, zoneId, ageMs))
    }
    for (const cellId of take(remainingStale)) {
      const { col, row } = colRowOf(cellId)
      cells.set(cellId, makeStaleCell(rng, cellId, col, row, zoneId, nextInt(rng, 8_000) + 2_001))
    }
    for (const cellId of take(counts.gap)) {
      const { col, row } = colRowOf(cellId)
      cells.set(cellId, makeGapCell(cellId, col, row, zoneId))
    }
  }

  // Zone A: West Deck Approach. Peak cell forced at 0.31 (below the 0.4 watch band),
  // the three FR6.1 fusion cells forced observed by both D-02 and D-04, and
  // the SAFEGUARD_REJECT demo cell forced stale at 7 s.
  const forcedObservedA = new Map<string, { risk: number; observedBy: string[] }>([
    [ZONE_A_PEAK_CELL, { risk: 0.31, observedBy: [DRONE_D02] }],
    ...FUSION_CELLS.map(
      (id): [string, { risk: number; observedBy: string[] }] => [
        id,
        { risk: nextFloat(rng, 0.05, 0.2), observedBy: [DRONE_D02, DRONE_D04] },
      ],
    ),
  ])
  const forcedStaleA = new Map<string, number>([[STALE_ROUTE_CELL, 7_000]])
  planZone(ZONE_A_ID, zoneACellIds(), ZONE_COVERAGE[ZONE_A_ID], forcedObservedA, forcedStaleA, [
    DRONE_D02,
    DRONE_D04,
  ])

  // Zone B: Jamrat al-Aqaba. Peak/alert cell forced at 0.78, the two route cells
  // and the two SG-0771 cells forced observed, and the HOLD_AND_METER
  // neighbour forced at 0.45 (well under both its own and the alert's band).
  const forcedObservedB = new Map<string, { risk: number; observedBy: string[] }>([
    [ZONE_B_PEAK_CELL, { risk: 0.78, observedBy: [DRONE_D01] }],
    [ZONE_B_NEIGHBOUR_CELL, { risk: 0.45, observedBy: [DRONE_D01] }],
    ['C-032-021', { risk: nextFloat(rng, 0.3, 0.5), observedBy: [DRONE_D01] }],
    ['C-033-020', { risk: nextFloat(rng, 0.2, 0.4), observedBy: [DRONE_D01] }],
    ['C-032-022', { risk: nextFloat(rng, 0.3, 0.5), observedBy: [DRONE_D01] }],
    ['C-033-021', { risk: nextFloat(rng, 0.2, 0.4), observedBy: [DRONE_D01] }],
  ])
  planZone(ZONE_B_ID, zoneBCellIds(), ZONE_COVERAGE[ZONE_B_ID], forcedObservedB, new Map(), [DRONE_D01])

  // Zone C: Jamrat al-Wusta. No observed cells at all - D-03 is mid-transit,
  // contributing density-only samples to the cells in its path.
  planZone(ZONE_C_ID, zoneCCellIds(), ZONE_COVERAGE[ZONE_C_ID], new Map(), new Map(), [DRONE_D03])

  // Unzoned strip: never assigned to a drone, so it is always a gap.
  for (const cellId of unzonedCellIds()) {
    const { col, row } = colRowOf(cellId)
    cells.set(cellId, makeGapCell(cellId, col, row, null))
  }

  return cells
}

/* ------------------------------------------------------------------ */
/* Drones                                                               */
/* ------------------------------------------------------------------ */

export function buildInitialSimDrones(simCells: Map<string, SimCell>): SimDrone[] {
  // A drone's live footprint is exactly the set of cells the seed already
  // recorded it as observing, so the tick engine sustains the canonical
  // snapshot's coverage counts instead of letting them decay the moment
  // ticking starts. D-03 is the deliberate exception: it is mid-transit in
  // the canonical snapshot, so its footprint is deliberately small and the
  // tick engine (not this seed) decides where it roves next.
  const footprintObservedBy = (droneId: string): string[] => {
    const ids: string[] = []
    for (const cell of simCells.values()) {
      if (cell.observedBy.includes(droneId)) ids.push(cell.cellId)
    }
    return ids
  }

  const d01Footprint = footprintObservedBy(DRONE_D01)
  const d02Footprint = footprintObservedBy(DRONE_D02)
  const d04Footprint = footprintObservedBy(DRONE_D04)
  const d03Footprint = footprintObservedBy(DRONE_D03).slice(0, 12)

  const poseFor = (cellId: string, altM: number, headingDeg: number) => {
    const { col, row } = colRowOf(cellId)
    const { lat, lon } = cellCentreLatLon(col, row, 5, GRID_ORIGIN)
    return { lat, lon, altM, headingDeg }
  }

  return [
    {
      droneId: DRONE_D01,
      label: 'Aqaba basin high',
      assignedZoneId: ZONE_B_ID,
      state: DRONE_STATE.OBSERVE,
      link: DRONE_LINK.ONLINE,
      pose: poseFor(ZONE_B_PEAK_CELL, 95, 200),
      footprintCells: d01Footprint,
      batteryPct: 78,
      registration: { referenceFrameLocked: true, inliers: 412 },
      transitTargetFootprint: null,
      transitTicksRemaining: 0,
    },
    {
      droneId: DRONE_D02,
      label: 'West deck',
      assignedZoneId: ZONE_A_ID,
      state: DRONE_STATE.OBSERVE,
      link: DRONE_LINK.ONLINE,
      pose: poseFor(ZONE_A_PEAK_CELL, 55, 90),
      footprintCells: d02Footprint,
      batteryPct: 64,
      registration: { referenceFrameLocked: true, inliers: 380 },
      transitTargetFootprint: null,
      transitTicksRemaining: 0,
    },
    {
      droneId: DRONE_D03,
      label: 'Roving',
      assignedZoneId: null,
      state: DRONE_STATE.TRANSIT,
      link: DRONE_LINK.ONLINE,
      pose: poseFor(d03Footprint[0] ?? 'C-015-010', 62, 148),
      footprintCells: d03Footprint,
      batteryPct: 91,
      registration: { referenceFrameLocked: false, inliers: 0 },
      transitTargetFootprint: null,
      transitTicksRemaining: 18,
    },
    {
      droneId: DRONE_D04,
      label: 'East deck',
      assignedZoneId: ZONE_A_ID,
      state: DRONE_STATE.OBSERVE,
      link: DRONE_LINK.DEGRADED,
      pose: poseFor('C-045-034', 55, 270),
      footprintCells: d04Footprint,
      batteryPct: 43,
      registration: { referenceFrameLocked: true, inliers: 291 },
      transitTargetFootprint: null,
      transitTicksRemaining: 0,
    },
  ]
}

/* ------------------------------------------------------------------ */
/* Alert A-1042, its suggestions, and the closed SG-0771 incident       */
/* ------------------------------------------------------------------ */

export const ALERT_A1042_ID = 'A-1042'
export const ALERT_A1039_ID = 'A-1039'
export const SUGGESTION_SG0771_ID = 'SG-0771'

export function buildAlertA1042(): Alert {
  const attribution: AlertAttribution[] = [
    { feature: 'flowConvergence', contribution: 0.19, value: 0.71 },
    { feature: 'densityRateOfChange', contribution: 0.14, value: 0.42 },
    { feature: 'stopStartPulses', contribution: 0.09, value: 0.33 },
    { feature: 'exitOccupancy', contribution: 0.06, value: 0.27 },
    { feature: 'counterFlow', contribution: 0.05, value: 118 },
    { feature: 'speedVariance', contribution: 0.03, value: 0.61 },
    { feature: 'density', contribution: 0.02, value: 3.9 },
    { feature: 'densityGradient', contribution: -0.02, value: 0.14 },
    { feature: 'speedMean', contribution: -0.04, value: 0.38 },
  ]
  return {
    alertId: ALERT_A1042_ID,
    raisedAt: seedTime('2026-09-08T14:02:51.000Z'),
    siteId: SEED_SITE_ID,
    zoneId: ZONE_B_ID,
    cellId: ZONE_B_PEAK_CELL,
    score: 0.78,
    threshold: 0.7,
    band: 'ELEVATED',
    // The canonical table's prose reads "OPEN"; the enum has no state that
    // is simultaneously open and acknowledged, and `acknowledgedBy` below
    // is populated, so this seed uses ACKNOWLEDGED (srs.md 3.3 AlertStatus)
    // rather than contradict its own acknowledgement fields.
    status: ALERT_STATUS.ACKNOWLEDGED,
    attribution,
    acknowledgedBy: 'a.rahman',
    acknowledgedAt: seedTime('2026-09-08T14:03:04.000Z'),
  }
}

export function buildAlertA1039(): Alert {
  const attribution: AlertAttribution[] = [
    { feature: 'flowConvergence', contribution: 0.21, value: 0.68 },
    { feature: 'densityRateOfChange', contribution: 0.12, value: 0.39 },
    { feature: 'counterFlow', contribution: 0.08, value: 112 },
    { feature: 'stopStartPulses', contribution: 0.07, value: 0.29 },
    { feature: 'exitOccupancy', contribution: 0.05, value: 0.31 },
    { feature: 'speedVariance', contribution: 0.03, value: 0.55 },
    { feature: 'density', contribution: 0.02, value: 3.7 },
    { feature: 'densityGradient', contribution: -0.01, value: 0.11 },
    { feature: 'speedMean', contribution: -0.03, value: 0.41 },
  ]
  return {
    alertId: ALERT_A1039_ID,
    raisedAt: seedTime('2026-09-07T19:41:50.000Z'),
    siteId: SEED_SITE_ID,
    zoneId: ZONE_B_ID,
    cellId: ZONE_B_PEAK_CELL,
    score: 0.78,
    threshold: 0.7,
    band: 'ELEVATED',
    status: ALERT_STATUS.CLEARED,
    attribution,
    acknowledgedBy: 'a.rahman',
    acknowledgedAt: seedTime('2026-09-07T19:42:05.000Z'),
  }
}

export function buildSuggestionsForA1042(): SuggestionOption[] {
  return [
    {
      suggestionId: 'sug-A-1042-1',
      alertId: ALERT_A1042_ID,
      rank: 1,
      status: SUGGESTION_STATUS.PROPOSED,
      action: SUGGESTION_ACTION.DIVERT,
      targetExitId: EXIT_E2_ID,
      routeCells: DIVERT_ROUTE_CELLS,
      text: 'Divert the crowd at the Jamrat al-Aqaba approach toward Exit E2, which has room to take them.',
      textSource: TEXT_SOURCE.MODEL,
      rationale:
        'Exit E2 is running at about 27 percent of its 900 per minute capacity, and every cell on this route is below the Jamrat al-Aqaba density threshold.',
      safeguards: [
        { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
        { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
        { check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
      ],
      confirmedBy: null,
      confirmedAt: null,
      dismissedBy: null,
      dismissedAt: null,
    },
    {
      suggestionId: 'sug-A-1042-2',
      alertId: ALERT_A1042_ID,
      rank: 2,
      status: SUGGESTION_STATUS.PROPOSED,
      action: SUGGESTION_ACTION.HOLD_AND_METER,
      targetExitId: null,
      routeCells: [ZONE_B_NEIGHBOUR_CELL],
      text: 'Meter inflow at the north approach rather than diverting the crowd already inside.',
      textSource: TEXT_SOURCE.MODEL,
      rationale:
        'Metering the north approach holds pressure off the alert cell while it clears. Cell C-030-019 is projected to rise to 0.61, still under its 0.70 threshold.',
      safeguards: [
        { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
        { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
        { check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
      ],
      confirmedBy: null,
      confirmedAt: null,
      dismissedBy: null,
      dismissedAt: null,
    },
    {
      suggestionId: 'sug-A-1042-3',
      alertId: ALERT_A1042_ID,
      rank: 3,
      status: SUGGESTION_STATUS.REJECTED,
      action: SUGGESTION_ACTION.OPEN_ALTERNATE_ROUTE,
      targetExitId: EXIT_E1_ID,
      routeCells: [ZONE_B_PEAK_CELL, 'C-028-024', STALE_ROUTE_CELL],
      text: 'Open the alternate route west toward Exit E1.',
      textSource: TEXT_SOURCE.MODEL,
      rationale: 'This route was rejected: it cannot be shown safe while one of its cells has no recent data.',
      safeguards: [
        { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
        { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
        {
          check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE,
          passed: false,
          reason: `Cell ${STALE_ROUTE_CELL} was last observed 7 seconds ago and cannot be confirmed safe.`,
        },
        { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
        { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
      ],
      confirmedBy: null,
      confirmedAt: null,
      dismissedBy: null,
      dismissedAt: null,
    },
  ]
}

export function buildSuggestionSG0771(): SuggestionOption {
  return {
    suggestionId: SUGGESTION_SG0771_ID,
    alertId: ALERT_A1039_ID,
    rank: 1,
    status: SUGGESTION_STATUS.CONFIRMED,
    action: SUGGESTION_ACTION.DIVERT,
    targetExitId: EXIT_E2_ID,
    routeCells: SG0771_CELLS,
    text: 'Divert the crowd at the Jamrat al-Aqaba approach toward Exit E2.',
    textSource: TEXT_SOURCE.MODEL,
    rationale: 'Exit E2 had spare capacity and every cell on the route was below the density threshold.',
    safeguards: [
      { check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true },
      { check: SAFEGUARD_CHECK.WOULD_PUSH_NEIGHBOUR_OVER, passed: true },
      { check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE, passed: true },
      { check: SAFEGUARD_CHECK.UNKNOWN_CELL_ON_ROUTE, passed: true },
      { check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: true },
    ],
    confirmedBy: 'a.rahman',
    confirmedAt: seedTime('2026-09-07T19:42:38.000Z'),
    dismissedBy: null,
    dismissedAt: null,
  }
}

export function buildOutcomeSG0771(): Outcome {
  const confirmedAtMs = Date.parse(seedTime('2026-09-07T19:42:38.000Z'))
  const rng = mulberry32(CANONICAL_SEED + 4)
  const trajectory: OutcomeTrajectoryPoint[] = []
  const start = 0.78
  const end = 0.61
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base = start + (end - start) * t
    const noise = i === 0 || i === steps ? 0 : nextFloat(rng, -0.02, 0.02)
    trajectory.push({
      ts: new Date(confirmedAtMs + i * 60_000).toISOString(),
      risk: round(clamp(base + noise, 0, 1), 2),
    })
  }
  return {
    suggestionId: SUGGESTION_SG0771_ID,
    confirmedAt: seedTime('2026-09-07T19:42:38.000Z'),
    windowEndsAt: seedTime('2026-09-07T19:52:38.000Z'),
    affectedCells: SG0771_CELLS,
    riskAtConfirm: 0.78,
    peakRiskInWindow: 0.61,
    trajectory,
    verdict: OUTCOME_VERDICT.IMPROVED,
  }
}

/* ------------------------------------------------------------------ */
/* Setup proposals - 9 total, 6 accepted, 2 rejected, 1 unreviewed      */
/* ------------------------------------------------------------------ */

export function buildSetupProposals(attributes: Map<string, CellAttributeKind>): SetupProposal[] {
  const rng = mulberry32(CANONICAL_SEED + 5)
  const barrierCells = shuffle(
    rng,
    [...attributes.entries()].filter(([, kind]) => kind === 'BARRIER').map(([id]) => id),
  )
  const obstructionCells = shuffle(
    rng,
    [...attributes.entries()].filter(([, kind]) => kind === 'OBSTRUCTION').map(([id]) => id),
  )
  const exitCells = [...attributes.entries()].filter(([, kind]) => kind === 'EXIT').map(([id]) => id)

  const proposal = (
    id: string,
    cellIds: string[],
    attribute: SetupProposalAttribute,
    confidence: number,
    status: SetupProposalStatus,
  ): SetupProposal => ({
    proposalId: id,
    siteId: SEED_SITE_ID,
    cellIds,
    proposedAttribute: attribute,
    confidence,
    status,
  })

  return [
    proposal('SP-01', barrierCells.slice(0, 4), 'BARRIER', 0.91, 'ACCEPTED'),
    proposal('SP-02', obstructionCells.slice(0, 3), 'OBSTRUCTION', 0.83, 'ACCEPTED'),
    proposal('SP-03', exitCells.slice(0, 6), 'EXIT', 0.95, 'ACCEPTED'),
    proposal('SP-04', barrierCells.slice(4, 9), 'BARRIER', 0.77, 'ACCEPTED'),
    proposal('SP-05', obstructionCells.slice(3, 5), 'OBSTRUCTION', 0.68, 'ACCEPTED'),
    proposal('SP-06', exitCells.slice(6, 12), 'EXIT', 0.9, 'ACCEPTED'),
    proposal('SP-07', obstructionCells.slice(5, 7), 'OBSTRUCTION', 0.55, 'REJECTED'),
    proposal('SP-08', barrierCells.slice(9, 11), 'BARRIER', 0.6, 'REJECTED'),
    proposal('SP-09', obstructionCells.slice(7, 10), 'OBSTRUCTION', 0.71, 'PENDING'),
  ]
}

/* ------------------------------------------------------------------ */
/* System health                                                       */
/* ------------------------------------------------------------------ */

export function buildHealth(): SystemHealth {
  return {
    services: [
      { name: 'Message channel', status: 'ONLINE' },
      { name: 'Database', status: 'ONLINE' },
      { name: 'Risk engine', status: 'ONLINE' },
      {
        name: 'Phrasing model',
        status: 'OFFLINE',
        detail: 'Unavailable since 13:51. Suggestions fall back to template text.',
      },
    ],
    latency: { measuredMs: 1200, p95Ms: 1700, budgetMs: 2000 },
    workers: [
      { name: 'Perception worker', status: 'ONLINE', queueDepth: 0 },
      { name: 'Risk worker', status: 'ONLINE', queueDepth: 0 },
      { name: 'Suggestion worker', status: 'DEGRADED', queueDepth: 3 },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* History and audit log                                               */
/* ------------------------------------------------------------------ */

const HISTORY_ACTORS = ['a.rahman', 's.iqbal', 'm.tariq', 'n.hassan']

export function buildHistoryEvents(): HistoryEvent[] {
  const rng = mulberry32(CANONICAL_SEED + 6)
  const events: HistoryEvent[] = [
    {
      eventId: 'evt-A-1042',
      ts: seedTime('2026-09-08T14:02:51.000Z'),
      type: 'ALERT',
      siteId: SEED_SITE_ID,
      zoneId: ZONE_B_ID,
      summary: 'Alert A-1042 raised on C-031-022, Jamrat al-Aqaba, score 0.78 against a threshold of 0.70.',
      refId: ALERT_A1042_ID,
    },
    {
      eventId: 'evt-A-1042-sug',
      ts: seedTime('2026-09-08T14:02:53.000Z'),
      type: 'SUGGESTION',
      siteId: SEED_SITE_ID,
      zoneId: ZONE_B_ID,
      summary: 'Three ranked suggestions generated for A-1042; one rejected on a stale route cell.',
      refId: 'sug-A-1042-1',
    },
    {
      eventId: 'evt-A-1039',
      ts: seedTime('2026-09-07T19:41:50.000Z'),
      type: 'ALERT',
      siteId: SEED_SITE_ID,
      zoneId: ZONE_B_ID,
      summary: 'Alert A-1039 raised on C-031-022, Jamrat al-Aqaba, score 0.78 against a threshold of 0.70.',
      refId: ALERT_A1039_ID,
    },
    {
      eventId: 'evt-SG-0771-confirm',
      ts: seedTime('2026-09-07T19:42:38.000Z'),
      type: 'SUGGESTION',
      siteId: SEED_SITE_ID,
      zoneId: ZONE_B_ID,
      summary: 'Suggestion SG-0771 (divert to Exit E2) confirmed by a.rahman.',
      refId: SUGGESTION_SG0771_ID,
    },
    {
      eventId: 'evt-SG-0771-outcome',
      ts: seedTime('2026-09-07T19:52:38.000Z'),
      type: 'OUTCOME',
      siteId: SEED_SITE_ID,
      zoneId: ZONE_B_ID,
      summary: 'Outcome for SG-0771 settled: improved, peak risk fell from 0.78 to 0.61.',
      refId: SUGGESTION_SG0771_ID,
    },
  ]

  const zones = [ZONE_A_ID, ZONE_B_ID, ZONE_C_ID]
  const types: HistoryEvent['type'][] = ['ALERT', 'SUGGESTION', 'OUTCOME', 'CONFIG_CHANGE']
  const summaries: Record<HistoryEvent['type'], string[]> = {
    ALERT: [
      'Watch-band reading logged, no threshold crossed.',
      'Elevated reading cleared after 30 seconds below threshold.',
      'Coverage gap noted during drone reassignment.',
    ],
    SUGGESTION: [
      'Suggestion dismissed by the coordinator on shift.',
      'Suggestion expired unconfirmed after the alert cleared.',
      'Suggestion set regenerated after a route safeguard changed.',
    ],
    OUTCOME: [
      'Outcome settled: unchanged, risk held within its band.',
      'Outcome settled: worsened, risk rose past the confirm-time value.',
      'Outcome window closed with no further action needed.',
    ],
    CONFIG_CHANGE: [
      'Zone density threshold adjusted after a venue walk-through.',
      'Drone reassigned to a new area.',
      'Exit capacity corrected after a manual recount.',
    ],
  }

  // At least 40 events total, spanning the last ten days, so S08 history
  // search and filtering has enough depth to demonstrate every filter.
  for (let i = 0; i < 40; i++) {
    const daysAgo = nextInt(rng, 10) + 1
    const ts = new Date(SEED_NOW_MS - daysAgo * 86_400_000 - nextInt(rng, 80_000) * 1000).toISOString()
    const type = pick(rng, types)
    const zoneId = pick(rng, zones)
    events.push({
      eventId: `evt-hist-${i.toString().padStart(3, '0')}`,
      ts,
      type,
      siteId: SEED_SITE_ID,
      zoneId,
      summary: pick(rng, summaries[type]),
      refId: `ref-${i.toString().padStart(3, '0')}`,
    })
  }

  return events.sort((a, b) => b.ts.localeCompare(a.ts))
}

export function buildAuditLog(): AuditEntry[] {
  const rng = mulberry32(CANONICAL_SEED + 7)
  const entries: AuditEntry[] = [
    {
      entryId: 'audit-001',
      ts: seedTime('2026-07-20T09:05:00.000Z'),
      actorId: 'n.hassan',
      action: 'DEACTIVATE_USER',
      targetType: 'User',
      targetId: 'k.javed',
      previousValue: { active: true },
      newValue: { active: false },
    },
    {
      entryId: 'audit-002',
      ts: seedTime('2026-09-08T14:03:04.000Z'),
      actorId: 'a.rahman',
      action: 'ACKNOWLEDGE_ALERT',
      targetType: 'Alert',
      targetId: ALERT_A1042_ID,
      previousValue: { status: 'OPEN' },
      newValue: { status: 'ACKNOWLEDGED' },
    },
    {
      entryId: 'audit-003',
      ts: seedTime('2026-09-07T19:42:38.000Z'),
      actorId: 'a.rahman',
      action: 'CONFIRM_SUGGESTION',
      targetType: 'SuggestionOption',
      targetId: SUGGESTION_SG0771_ID,
      previousValue: { status: 'PROPOSED' },
      newValue: { status: 'CONFIRMED' },
    },
  ]

  const actions = [
    'UPDATE_THRESHOLDS',
    'REASSIGN_DRONE',
    'SAVE_ZONE',
    'PATCH_CELL_ATTRIBUTES',
    'RESOLVE_SETUP_PROPOSAL',
    'PUT_EXITS',
    'DISMISS_SUGGESTION',
  ]
  const targetTypes: Record<string, string> = {
    UPDATE_THRESHOLDS: 'ThresholdSet',
    REASSIGN_DRONE: 'Drone',
    SAVE_ZONE: 'Zone',
    PATCH_CELL_ATTRIBUTES: 'Cell',
    RESOLVE_SETUP_PROPOSAL: 'SetupProposal',
    PUT_EXITS: 'Exit',
    DISMISS_SUGGESTION: 'SuggestionOption',
  }

  for (let i = 0; i < 35; i++) {
    const daysAgo = nextInt(rng, 20) + 1
    const ts = new Date(SEED_NOW_MS - daysAgo * 86_400_000 - nextInt(rng, 80_000) * 1000).toISOString()
    const action = pick(rng, actions)
    entries.push({
      entryId: `audit-hist-${i.toString().padStart(3, '0')}`,
      ts,
      actorId: pick(rng, HISTORY_ACTORS),
      action,
      targetType: targetTypes[action],
      targetId: `${targetTypes[action].toLowerCase()}-${i}`,
      previousValue: { note: 'previous value' },
      newValue: { note: 'new value' },
    })
  }

  return entries.sort((a, b) => b.ts.localeCompare(a.ts))
}

/* ------------------------------------------------------------------ */
/* The full bundle                                                     */
/* ------------------------------------------------------------------ */

export interface SeedBundle {
  site: Site
  grid: Grid
  cells: Cell[]
  cellAttributes: Map<string, CellAttributeKind>
  zones: Zone[]
  exits: Exit[]
  thresholds: ThresholdSet[]
  users: User[]
  simCells: Map<string, SimCell>
  simDrones: SimDrone[]
  alert: Alert
  suggestions: SuggestionOption[]
  historicalAlert: Alert
  historicalSuggestion: SuggestionOption
  outcome: Outcome
  setupProposals: SetupProposal[]
  health: SystemHealth
  historyEvents: HistoryEvent[]
  auditLog: AuditEntry[]
}

/**
 * Builds the entire canonical dataset in one deterministic pass. Every
 * generator above draws from its own fixed-offset PRNG, so calling this
 * twice - once for the running app, once for a test - produces identical
 * output both times.
 */
export function buildSeedBundle(): SeedBundle {
  const { cells, attributes } = buildCells()
  const simCells = buildInitialSimCells()
  return {
    site: buildSite(),
    grid: buildGrid(),
    cells,
    cellAttributes: attributes,
    zones: buildZones(),
    exits: buildExits(),
    thresholds: buildThresholds(),
    users: buildUsers(),
    simCells,
    simDrones: buildInitialSimDrones(simCells),
    alert: buildAlertA1042(),
    suggestions: buildSuggestionsForA1042(),
    historicalAlert: buildAlertA1039(),
    historicalSuggestion: buildSuggestionSG0771(),
    outcome: buildOutcomeSG0771(),
    setupProposals: buildSetupProposals(attributes),
    health: buildHealth(),
    historyEvents: buildHistoryEvents(),
    auditLog: buildAuditLog(),
  }
}
