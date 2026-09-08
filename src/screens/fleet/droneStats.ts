import { OBSERVATION_STATE } from '@/domain/constants'
import { CELL_AREA_SQM, CELL_SIZE_M, parseCellId } from '@/domain/parameters'
import type { CellObservation, DroneUpdate } from '@/domain/types'

export interface FootprintStats {
  /** Cells the drone is currently writing to. */
  footprintCellCount: number
  /** Of those, how many carry a full-window observation. */
  observedCellCount: number
  /**
   * People over the drone's OBSERVED footprint cells only, or null when it
   * has none. Null rather than zero: a drone that has just arrived has not
   * measured an empty area, it has not finished measuring at all (FR1.5).
   */
  estimatedPeople: number | null
  /**
   * The longest dwell among the footprint's cells, which is how long this
   * drone has effectively been holding this ground. Derived rather than
   * reported, because dwell is a property of a cell's history and the
   * drone payload carries none.
   */
  longestDwellMs: number | null
}

export function footprintStats(
  drone: DroneUpdate,
  cellsById: Readonly<Record<string, CellObservation>>,
): FootprintStats {
  let people = 0
  let observedCellCount = 0
  let longestDwellMs: number | null = null

  for (const cellId of drone.footprintCells) {
    const cell = cellsById[cellId]
    if (!cell) continue
    if (cell.observationState === OBSERVATION_STATE.OBSERVED) {
      observedCellCount += 1
      people += cell.densityPerSqM * CELL_AREA_SQM
    }
    if (cell.observationState === OBSERVATION_STATE.OBSERVED || cell.observationState === OBSERVATION_STATE.NOT_ENOUGH_DWELL) {
      longestDwellMs = Math.max(longestDwellMs ?? 0, cell.dwellMs)
    }
  }

  return {
    footprintCellCount: drone.footprintCells.length,
    observedCellCount,
    estimatedPeople: observedCellCount === 0 ? null : Math.round(people),
    longestDwellMs,
  }
}

/** Cells observed by more than one drone at this moment. Fusion happens by
 * coordinates, so two drones writing to the same cell is the normal case
 * this makes visible rather than a conflict to resolve (FR6.1). */
export function overlappingCells(drones: DroneUpdate[]): Set<string> {
  const seen = new Set<string>()
  const overlap = new Set<string>()
  for (const drone of drones) {
    for (const cellId of drone.footprintCells) {
      if (seen.has(cellId)) overlap.add(cellId)
      else seen.add(cellId)
    }
  }
  return overlap
}

export function dronesObserving(cellId: string, drones: DroneUpdate[]): string[] {
  return drones.filter((d) => d.footprintCells.includes(cellId)).map((d) => d.droneId)
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`
}

/** Bounds covering the footprint plus padding, in the map's metre space. */
export function footprintBounds(
  footprintCells: string[],
  padCells: number,
): [[number, number], [number, number]] | undefined {
  let minCol = Infinity
  let maxCol = -Infinity
  let minRow = Infinity
  let maxRow = -Infinity
  for (const cellId of footprintCells) {
    const parsed = parseCellId(cellId)
    if (!parsed) continue
    minCol = Math.min(minCol, parsed.col)
    maxCol = Math.max(maxCol, parsed.col)
    minRow = Math.min(minRow, parsed.row)
    maxRow = Math.max(maxRow, parsed.row)
  }
  if (minCol === Infinity) return undefined
  return [
    [Math.max(0, (minRow - padCells) * CELL_SIZE_M), Math.max(0, (minCol - padCells) * CELL_SIZE_M)],
    [(maxRow + padCells + 1) * CELL_SIZE_M, (maxCol + padCells + 1) * CELL_SIZE_M],
  ]
}
