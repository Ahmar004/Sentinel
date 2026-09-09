import { describe, expect, it } from 'vitest'
import { formatCellId } from '@/domain/parameters'
import { zoneLabelPosition, zoneOutlinePositions } from './zoneOutline'
import { groundToLatLon } from './siteGrid'

const CELL = 5

function rect(colMin: number, colMax: number, rowMin: number, rowMax: number): string[] {
  const ids: string[] = []
  for (let row = rowMin; row <= rowMax; row += 1) {
    for (let col = colMin; col <= colMax; col += 1) ids.push(formatCellId(col, row))
  }
  return ids
}

/** Total ground length of every segment, in metres. */
function perimeterM(positions: [number, number][][]): number {
  let total = 0
  for (const [[lat1, lon1], [lat2, lon2]] of positions) {
    const dNorth = (lat2 - lat1) * 110_574
    const dEast = (lon2 - lon1) * 111_320 * Math.cos((lat1 * Math.PI) / 180)
    total += Math.hypot(dNorth, dEast)
  }
  return total
}

describe('zone outlines follow the cells, not a bounding box', () => {
  it('traces a plain rectangle as its own perimeter', () => {
    // 4 by 3 cells at 5 m: perimeter is 2 * (20 + 15) = 70 m.
    const positions = zoneOutlinePositions(rect(0, 3, 0, 2), CELL)
    expect(perimeterM(positions)).toBeCloseTo(70, 0)
  })

  it('merges collinear edges into runs rather than one path per cell', () => {
    // A 4 by 3 rectangle has 14 boundary edges but only 4 straight runs.
    const positions = zoneOutlinePositions(rect(0, 3, 0, 2), CELL)
    expect(positions.length).toBe(4)
  })

  it('follows the notch of an L-shaped zone instead of squaring it off', () => {
    // An L: the full bottom row plus a column rising from the left.
    const cells = [...rect(0, 5, 0, 0), ...rect(0, 1, 1, 3)]
    const positions = zoneOutlinePositions(cells, CELL)

    // Perimeter cannot tell these apart: an L-shaped rectilinear polygon
    // has exactly its bounding box's perimeter, because the notch's two
    // extra sides replace the two it removes. Side count does tell them
    // apart - a box has four, an L has six.
    expect(perimeterM(positions)).toBeCloseTo(100, 0)
    expect(positions.length).toBe(6)
  })

  it('gives two zones with disjoint cells no shared boundary ground', () => {
    // These are the shapes that overlapped when drawn as bounding boxes:
    // both are L-shaped and their boxes cover common ground.
    const zoneB = [...rect(30, 59, 0, 19), ...rect(30, 39, 20, 39)]
    const zoneA = [...rect(0, 29, 20, 39), ...rect(40, 49, 20, 39)]

    expect(new Set(zoneA).size + new Set(zoneB).size).toBe(new Set([...zoneA, ...zoneB]).size)

    const boxOfB = { colMin: 30, colMax: 59, rowMin: 0, rowMax: 39 }
    const boxOfA = { colMin: 0, colMax: 49, rowMin: 20, rowMax: 39 }
    const boxesOverlap =
      boxOfA.colMax >= boxOfB.colMin &&
      boxOfB.colMax >= boxOfA.colMin &&
      boxOfA.rowMax >= boxOfB.rowMin &&
      boxOfB.rowMax >= boxOfA.rowMin
    expect(boxesOverlap, 'the bounding boxes really do overlap, which is why boxes are not used').toBe(true)

    // Neither outline is a rectangle. Zone B is one L, so six sides. Zone
    // A is two rectangles with a gap between them, so eight. A bounding
    // box would give four in both cases, and those two boxes would cover
    // the same ground.
    expect(zoneOutlinePositions(zoneB, CELL).length).toBe(6)
    expect(zoneOutlinePositions(zoneA, CELL).length).toBe(8)
  })

  it('returns nothing for a zone with no cells', () => {
    expect(zoneOutlinePositions([], CELL)).toEqual([])
    expect(zoneLabelPosition([], CELL)).toBeNull()
  })

  it('labels an L-shaped zone inside itself, not in the notch', () => {
    const cells = [...rect(0, 5, 0, 0), ...rect(0, 1, 1, 3)]
    const at = zoneLabelPosition(cells, CELL)
    expect(at).not.toBeNull()

    // The notch is the top right of the bounding box; the mean cell must
    // sit well to the left and low, inside the occupied ground.
    const notch = groundToLatLon(5 * CELL, 3 * CELL)
    expect(at![1]).toBeLessThan(notch[1])
  })
})
