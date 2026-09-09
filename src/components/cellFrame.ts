import { OBSERVATION_STATE, type ObservationState } from '@/domain/constants'
import type { CellObservation } from '@/domain/types'
import { DWELL_GATE_MS } from '@/domain/parameters'
import { getCellTreatment, type CellTreatment } from '@/theme/cellTreatment'

/**
 * The per-cell input `CellLayer` (C02) draws from: a grid position plus the
 * store's `CellObservation` for that cell. Kept separate from the store
 * shape so this module, and everything below it, stays free of any
 * dependency on `src/store`.
 */
export interface CellGridEntry {
  cellId: string
  col: number
  row: number
  observation: CellObservation
}

export interface CellArrow {
  dirDeg: number
  speedMps: number
}

/**
 * Everything `CellLayer` needs to draw one cell, computed once per tick so
 * the imperative canvas pass is pure lookup with no per-frame branching on
 * `observationState`. `getCellTreatment` (src/theme/cellTreatment.ts) is
 * the single source for fill, pattern and outline: this module only adds
 * the two facts a canvas frame needs beyond that - the caption text and
 * the flow arrow - without touching the honesty invariant it enforces.
 */
export interface CellFrame {
  cellId: string
  col: number
  row: number
  /** Carried explicitly so the renderer can decide on the state itself
   * rather than inferring it from a treatment field that happens to
   * correlate with it today. */
  observationState: ObservationState
  treatment: CellTreatment
  /**
   * Dwell progress ("18 s of 30 s") for `NOT_ENOUGH_DWELL` - never a score.
   * A mandatory age badge ("12 s old") for `STALE`. Null for `OBSERVED`
   * (the risk score itself is the caption, read from `observation.risk`)
   * and for `GAP` (which carries nothing at all).
   */
  label: string | null
  /**
   * Present only when the observing drone reports a non-null flow. Never
   * fabricated: a cell with no flow measurement draws no arrow, rather
   * than a zero-length or default-direction one (FR3.5).
   */
  arrow: CellArrow | null
}

function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)} s`
}

export function buildCellFrame(entry: CellGridEntry): CellFrame {
  const { observation } = entry
  const treatment = getCellTreatment(observation)
  const arrow: CellArrow | null = observation.flow
    ? { dirDeg: observation.flow.dirDeg, speedMps: observation.flow.speedMps }
    : null

  let label: string | null = null
  if (observation.observationState === OBSERVATION_STATE.NOT_ENOUGH_DWELL) {
    label = `${formatSeconds(observation.dwellMs)} of ${formatSeconds(DWELL_GATE_MS)}`
  } else if (observation.observationState === OBSERVATION_STATE.STALE) {
    label = `${formatSeconds(observation.ageMs)} old`
  }

  return {
    cellId: entry.cellId,
    col: entry.col,
    row: entry.row,
    observationState: observation.observationState,
    treatment,
    label,
    arrow,
  }
}

export function buildCellFrames(entries: CellGridEntry[]): CellFrame[] {
  return entries.map(buildCellFrame)
}
