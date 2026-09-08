import { OBSERVATION_STATE } from '@/domain/constants'
import { CELL_AREA_SQM } from '@/domain/parameters'
import type { CellObservation, Zone, ZoneUpdate } from '@/domain/types'

export interface ZoneSummary {
  zoneId: string
  name: string
  /** Undefined until the first `zone.update` for this zone arrives. */
  update: ZoneUpdate | undefined
  /**
   * Estimated people over OBSERVED cells only (FR1.5, decision D21), or
   * null when the zone holds no observed cell at all.
   *
   * Null rather than zero is the whole point: a zone whose every cell is
   * still filling its dwell window has not been measured as empty, it has
   * not been measured at all. Zone C in the canonical dataset is exactly
   * this case, and the dataset gives it no estimate rather than 0.
   *
   * `NOT_ENOUGH_DWELL` cells are excluded even though they carry a
   * density, because including them would let a figure cross the line
   * between what was measured over a full window and what was merely
   * glimpsed.
   */
  estimatedPeople: number | null
  observedCellCount: number
}

export function summariseZone(
  zone: Zone,
  update: ZoneUpdate | undefined,
  cellsById: Readonly<Record<string, CellObservation>>,
): ZoneSummary {
  let people = 0
  let observedCellCount = 0

  for (const cellId of zone.cellIds) {
    const cell = cellsById[cellId]
    if (!cell || cell.observationState !== OBSERVATION_STATE.OBSERVED) continue
    observedCellCount += 1
    people += cell.densityPerSqM * CELL_AREA_SQM
  }

  return {
    zoneId: zone.zoneId,
    name: zone.name,
    update,
    estimatedPeople: observedCellCount === 0 ? null : Math.round(people),
    observedCellCount,
  }
}

export function summariseZones(
  zones: Zone[],
  updatesById: Readonly<Record<string, ZoneUpdate>>,
  cellsById: Readonly<Record<string, CellObservation>>,
): ZoneSummary[] {
  return zones.map((zone) => summariseZone(zone, updatesById[zone.zoneId], cellsById))
}
