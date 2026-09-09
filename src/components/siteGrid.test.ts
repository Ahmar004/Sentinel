import { describe, expect, it } from 'vitest'
import { CELL_SIZE_M, GRID_COLUMNS, GRID_ROWS, SITE_EXTENT_M } from '@/domain/parameters'
import { SITE_ORIGIN_LAT_LON, cellBounds, groundToLatLon, siteBounds } from './siteGrid'

/**
 * With a drawn plan, a coordinate error was invisible: the picture moved
 * with the grid. Over real satellite imagery it is not, because the cells
 * land on actual buildings. These pin the mapping.
 */
describe('grid to real coordinates', () => {
  it('places the origin at the south-west corner', () => {
    const [lat, lon] = groundToLatLon(0, 0)
    expect(lat).toBeCloseTo(SITE_ORIGIN_LAT_LON.lat, 6)
    expect(lon).toBeCloseTo(SITE_ORIGIN_LAT_LON.lon, 6)
  })

  it('moves north as the ground offset increases, and east with longitude', () => {
    const [latN] = groundToLatLon(0, 100)
    const [, lonE] = groundToLatLon(100, 0)
    expect(latN).toBeGreaterThan(SITE_ORIGIN_LAT_LON.lat)
    expect(lonE).toBeGreaterThan(SITE_ORIGIN_LAT_LON.lon)
  })

  it('spans the stated ground extent to within a metre', () => {
    const [latS, lonW] = groundToLatLon(0, 0)
    const [latN, lonE] = groundToLatLon(SITE_EXTENT_M.width, SITE_EXTENT_M.height)

    const heightM = (latN - latS) * 110_574
    const widthM = (lonE - lonW) * 111_320 * Math.cos((SITE_ORIGIN_LAT_LON.lat * Math.PI) / 180)

    expect(heightM).toBeCloseTo(SITE_EXTENT_M.height, 0)
    expect(widthM).toBeCloseTo(SITE_EXTENT_M.width, 0)
  })

  it('accounts for longitude shrinking with latitude', () => {
    // At Mina a degree of longitude is about seven percent shorter than at
    // the equator. Ignoring that would stretch the grid roughly 20 metres
    // across the site, which a 5 metre cell cannot absorb.
    const [, lonE] = groundToLatLon(1000, 0)
    const degreesFor1000m = lonE - SITE_ORIGIN_LAT_LON.lon
    const naiveDegrees = 1000 / 111_320
    expect(degreesFor1000m).toBeGreaterThan(naiveDegrees)
  })

  it('gives each cell the ground size the parameters state', () => {
    const [[latS, lonW], [latN, lonE]] = cellBounds(10, 10, CELL_SIZE_M) as [
      [number, number],
      [number, number],
    ]
    const heightM = (latN - latS) * 110_574
    const widthM = (lonE - lonW) * 111_320 * Math.cos((SITE_ORIGIN_LAT_LON.lat * Math.PI) / 180)
    expect(heightM).toBeCloseTo(CELL_SIZE_M, 1)
    expect(widthM).toBeCloseTo(CELL_SIZE_M, 1)
  })

  it('tiles the whole site exactly, with no cell outside the site bounds', () => {
    const [[siteS, siteW], [siteN, siteE]] = siteBounds(SITE_EXTENT_M) as [
      [number, number],
      [number, number],
    ]
    const corners: [number, number][] = [
      [0, 0],
      [GRID_COLUMNS - 1, GRID_ROWS - 1],
    ]
    for (const [col, row] of corners) {
      const [[s, w], [n, e]] = cellBounds(col, row, CELL_SIZE_M) as [[number, number], [number, number]]
      expect(s).toBeGreaterThanOrEqual(siteS - 1e-9)
      expect(w).toBeGreaterThanOrEqual(siteW - 1e-9)
      expect(n).toBeLessThanOrEqual(siteN + 1e-9)
      expect(e).toBeLessThanOrEqual(siteE + 1e-9)
    }
  })

  it('puts the site over Mina, not somewhere else in Mecca', () => {
    // The origin was previously 39.8262 E, which is Masjid al-Haram, about
    // five kilometres west. Over a drawn plan that error was invisible.
    const [lat, lon] = groundToLatLon(SITE_EXTENT_M.width / 2, SITE_EXTENT_M.height / 2)
    expect(lat).toBeGreaterThan(21.41)
    expect(lat).toBeLessThan(21.43)
    expect(lon).toBeGreaterThan(39.865)
    expect(lon).toBeLessThan(39.882)
  })
})
