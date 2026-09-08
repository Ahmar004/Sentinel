import type { LatLngBoundsLiteral } from 'leaflet'

/**
 * The one place the grid-to-map coordinate convention is decided: row maps
 * to latitude (north/up), column to longitude (east/right), in the
 * `CRS.Simple` metre-like unit space `SiteMap` (C01) uses. `SiteMap` and
 * `CellLayer` (C02) both import this rather than each deriving their own
 * mapping, so the plan image and the cell grid can never drift apart.
 */
export interface GroundExtentM {
  width: number
  height: number
}

export function siteBounds(groundExtentM: GroundExtentM): LatLngBoundsLiteral {
  return [
    [0, 0],
    [groundExtentM.height, groundExtentM.width],
  ]
}

export function cellBounds(col: number, row: number, cellSizeM: number): LatLngBoundsLiteral {
  return [
    [row * cellSizeM, col * cellSizeM],
    [(row + 1) * cellSizeM, (col + 1) * cellSizeM],
  ]
}
