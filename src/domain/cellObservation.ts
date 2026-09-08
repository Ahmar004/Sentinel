import { OBSERVATION_STATE } from './constants'
import type { CellObservation, CellUpdate } from './types'

/**
 * Narrows a wire `CellUpdate` into the strict `CellObservation` union.
 *
 * This is where the honesty invariant is enforced at the boundary: a
 * payload claiming `OBSERVED` without a `risk` or a `densityPerSqM` is a
 * malformed message, not a cell to render, so it throws rather than
 * guessing. Callers that must never crash on a bad tick (the live store's
 * ingestion loop) catch this and fall back to `GAP`, which is always a
 * safe, honest thing to show.
 */
export function toCellObservation(update: CellUpdate): CellObservation {
  switch (update.observationState) {
    case OBSERVATION_STATE.OBSERVED: {
      if (update.densityPerSqM == null || update.risk == null) {
        throw new Error(`OBSERVED cell ${update.cellId} is missing densityPerSqM or risk`)
      }
      return {
        observationState: 'OBSERVED',
        densityPerSqM: update.densityPerSqM,
        flow: update.flow,
        risk: update.risk,
        dwellMs: update.dwellMs,
      }
    }
    case OBSERVATION_STATE.NOT_ENOUGH_DWELL: {
      if (update.densityPerSqM == null) {
        throw new Error(`NOT_ENOUGH_DWELL cell ${update.cellId} is missing densityPerSqM`)
      }
      return {
        observationState: 'NOT_ENOUGH_DWELL',
        densityPerSqM: update.densityPerSqM,
        flow: update.flow,
        risk: null,
        dwellMs: update.dwellMs,
      }
    }
    case OBSERVATION_STATE.STALE: {
      if (update.densityPerSqM == null) {
        throw new Error(`STALE cell ${update.cellId} is missing densityPerSqM`)
      }
      return {
        observationState: 'STALE',
        densityPerSqM: update.densityPerSqM,
        flow: null,
        risk: null,
        ageMs: update.ageMs,
      }
    }
    case OBSERVATION_STATE.GAP:
      return { observationState: 'GAP', densityPerSqM: null, flow: null, risk: null }
  }
}

export const GAP_CELL: CellObservation = {
  observationState: 'GAP',
  densityPerSqM: null,
  flow: null,
  risk: null,
}
