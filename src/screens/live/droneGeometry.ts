import { CELL_SIZE_M, parseCellId } from '@/domain/parameters'

/**
 * A drone is placed on the map from the cells it is currently observing,
 * not from its `pose` latitude and longitude.
 *
 * The map is a `CRS.Simple` metre space laid over the site plan, while
 * `pose` is geographic. Deriving the marker from `footprintCells` keeps
 * the icon exactly over the cells the drone is actually writing to, so the
 * picture cannot drift from the data.
 *
 * Returns null when the drone has no footprint - one in transit that has
 * not acquired ground - because placing it somewhere would be inventing a
 * position (FR3.5).
 */
export function footprintCentroid(footprintCells: string[]): [number, number] | null {
  let sumX = 0
  let sumY = 0
  let n = 0
  for (const cellId of footprintCells) {
    const parsed = parseCellId(cellId)
    if (!parsed) continue
    sumX += (parsed.col + 0.5) * CELL_SIZE_M
    sumY += (parsed.row + 0.5) * CELL_SIZE_M
    n += 1
  }
  if (n === 0) return null
  return [sumY / n, sumX / n]
}

/** The observed cells as map positions, for outlining the footprint. */
export function footprintOutline(footprintCells: string[]): [number, number][] {
  const points: [number, number][] = []
  for (const cellId of footprintCells) {
    const parsed = parseCellId(cellId)
    if (!parsed) continue
    const x0 = parsed.col * CELL_SIZE_M
    const y0 = parsed.row * CELL_SIZE_M
    points.push([y0, x0], [y0 + CELL_SIZE_M, x0], [y0 + CELL_SIZE_M, x0 + CELL_SIZE_M], [y0, x0 + CELL_SIZE_M])
  }
  return points
}
