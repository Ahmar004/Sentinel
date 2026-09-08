import { formatCellId, GRID_COLUMNS, GRID_ROWS } from '@/domain/parameters'
import type { Cell, LatLon } from '@/domain/types'
import { type Rng, shuffle } from './rng'

/**
 * Grid geometry for the canonical Riverside Arena dataset - wireframes.md
 * Section 5. The site is partitioned into four disjoint rectangular blocks
 * so every zone's cell count matches the canonical table exactly:
 *
 *   Arena Floor (zone C): 600 cells, top-left quadrant.
 *   North Gate  (zone B): 800 cells, top-right quadrant plus a strip below it.
 *   Concourse   (zone A): 800 cells, bottom-left quadrant plus a strip beside it.
 *   Unzoned:              200 cells, remaining bottom-right strip.
 *
 * The partition has no bearing on the venue's visual layout (that is the
 * uploaded plan image); it exists only to give every cell exactly one zone
 * membership, with the specific named cells from the canonical dataset
 * (the alert cell, its peak, the safeguard route cells) landing in the
 * zone the wireframe requires.
 */
export interface RectRegion {
  colMin: number
  colMax: number // inclusive
  rowMin: number
  rowMax: number // inclusive
}

export function rectCellIds(region: RectRegion): string[] {
  const ids: string[] = []
  for (let row = region.rowMin; row <= region.rowMax; row++) {
    for (let col = region.colMin; col <= region.colMax; col++) {
      ids.push(formatCellId(col, row))
    }
  }
  return ids
}

export function rectSize(region: RectRegion): number {
  return (region.colMax - region.colMin + 1) * (region.rowMax - region.rowMin + 1)
}

export const ARENA_FLOOR_REGION: RectRegion = { colMin: 0, colMax: 29, rowMin: 0, rowMax: 19 }
export const NORTH_GATE_REGIONS: RectRegion[] = [
  { colMin: 30, colMax: 59, rowMin: 0, rowMax: 19 },
  { colMin: 30, colMax: 39, rowMin: 20, rowMax: 39 },
]
export const CONCOURSE_REGIONS: RectRegion[] = [
  { colMin: 0, colMax: 29, rowMin: 20, rowMax: 39 },
  { colMin: 40, colMax: 49, rowMin: 20, rowMax: 39 },
]
export const UNZONED_REGION: RectRegion = { colMin: 50, colMax: 59, rowMin: 20, rowMax: 39 }

export function arenaFloorCellIds(): string[] {
  return rectCellIds(ARENA_FLOOR_REGION)
}
export function northGateCellIds(): string[] {
  return NORTH_GATE_REGIONS.flatMap(rectCellIds)
}
export function concourseCellIds(): string[] {
  return CONCOURSE_REGIONS.flatMap(rectCellIds)
}
export function unzonedCellIds(): string[] {
  return rectCellIds(UNZONED_REGION)
}

/** Ground-space centre of a cell, in metres from the site origin. */
export function cellCentreMetres(col: number, row: number, cellSizeM: number): { x: number; y: number } {
  return { x: (col + 0.5) * cellSizeM, y: (row + 0.5) * cellSizeM }
}

/**
 * A flat lat/lon projection for the demo: `lat` carries the north-south
 * metre offset and `lon` the east-west metre offset, both scaled down so
 * they resemble real coordinates. `CRS.Simple` on the Leaflet side means
 * the map never interprets these as real-world geographic coordinates.
 */
export function cellCentreLatLon(col: number, row: number, cellSizeM: number, origin: LatLon): LatLon {
  const { x, y } = cellCentreMetres(col, row, cellSizeM)
  return { lat: origin.lat + y * 0.00001, lon: origin.lon + x * 0.00001 }
}

export type CellAttributeKind = 'WALKABLE' | 'EXIT' | 'BARRIER' | 'OBSTRUCTION'

/**
 * Assigns exactly one static attribute per cell so the counts in
 * wireframes.md Section 5 (walkable 2104, exit 14, barrier 118,
 * obstruction 164, summing to all 2400 cells) hold exactly. Exit cells are
 * pinned to the given exit cell ids; barrier and obstruction cells are
 * chosen deterministically from the remaining walkable-eligible pool,
 * never from an exit cell.
 */
export function assignCellAttributes(
  rng: Rng,
  allCellIds: readonly string[],
  exitCellIds: ReadonlySet<string>,
  barrierCount: number,
  obstructionCount: number,
): Map<string, CellAttributeKind> {
  const attributes = new Map<string, CellAttributeKind>()
  const pool = shuffle(
    rng,
    allCellIds.filter((id) => !exitCellIds.has(id)),
  )
  let i = 0
  for (; i < barrierCount; i++) attributes.set(pool[i], 'BARRIER')
  for (let j = 0; j < obstructionCount; j++, i++) attributes.set(pool[i], 'OBSTRUCTION')
  for (const id of exitCellIds) attributes.set(id, 'EXIT')
  return attributes
}

export function toCellRecord(
  cellId: string,
  col: number,
  row: number,
  gridId: string,
  zoneId: string | null,
  attribute: CellAttributeKind | undefined,
  cellSizeM: number,
  origin: LatLon,
): Cell {
  return {
    cellId,
    gridId,
    col,
    row,
    centreLatLon: cellCentreLatLon(col, row, cellSizeM, origin),
    walkable: attribute !== 'BARRIER' && attribute !== 'OBSTRUCTION',
    isExit: attribute === 'EXIT',
    isBarrier: attribute === 'BARRIER',
    isObstruction: attribute === 'OBSTRUCTION',
    zoneId,
  }
}

/** Sanity check used by tests and by seed.ts itself: every column/row pair is in range. */
export function isInGrid(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLUMNS && row >= 0 && row < GRID_ROWS
}
