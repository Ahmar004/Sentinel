import type { LatLngBoundsLiteral } from 'leaflet'

/**
 * The one place the grid-to-map coordinate convention is decided.
 *
 * Column maps east, row maps north, and both are converted to real
 * latitude and longitude so the grid lands on real ground under satellite
 * imagery. `SiteMap` (C01), `CellLayer` (C02), the drone markers and the
 * zone overlay all import this rather than each deriving their own
 * mapping, so the imagery and the cells can never drift apart.
 */
export interface GroundExtentM {
  width: number
  height: number
}

/**
 * South-west corner of the monitored environment: the Jamarat Bridge
 * complex in Mina.
 *
 * Approximate to a few metres, which is the right precision for a proof of
 * concept. A real deployment sets this during venue setup by placing the
 * grid over the imagery, which is what FR9.1 and FR9.2 describe.
 */
export const SITE_ORIGIN_LAT_LON = { lat: 21.4196, lon: 39.8718 }

/** Metres per degree of latitude. Constant enough at any one site. */
const METRES_PER_DEGREE_LAT = 110_574

/** Metres per degree of longitude shrinks with latitude, so it is computed
 * at the site rather than assumed. At Mina the difference from the equator
 * is about seven percent, which over 300 metres is 20 metres of error - far
 * more than a 5 metre cell can absorb. */
function metresPerDegreeLon(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180)
}

/** Ground offset in metres from the site origin, as latitude and longitude. */
export function groundToLatLon(eastM: number, northM: number): [number, number] {
  const lat = SITE_ORIGIN_LAT_LON.lat + northM / METRES_PER_DEGREE_LAT
  const lon = SITE_ORIGIN_LAT_LON.lon + eastM / metresPerDegreeLon(SITE_ORIGIN_LAT_LON.lat)
  return [lat, lon]
}

export function siteBounds(groundExtentM: GroundExtentM): LatLngBoundsLiteral {
  return [groundToLatLon(0, 0), groundToLatLon(groundExtentM.width, groundExtentM.height)]
}

export function cellBounds(col: number, row: number, cellSizeM: number): LatLngBoundsLiteral {
  return [
    groundToLatLon(col * cellSizeM, row * cellSizeM),
    groundToLatLon((col + 1) * cellSizeM, (row + 1) * cellSizeM),
  ]
}

/** Bounds around an arbitrary rectangle of ground, in cell coordinates. */
export function cellRangeBounds(
  colMin: number,
  rowMin: number,
  colMax: number,
  rowMax: number,
  cellSizeM: number,
): LatLngBoundsLiteral {
  return [
    groundToLatLon(colMin * cellSizeM, rowMin * cellSizeM),
    groundToLatLon((colMax + 1) * cellSizeM, (rowMax + 1) * cellSizeM),
  ]
}
