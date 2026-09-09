import { parseCellId } from '@/domain/parameters'
import { groundToLatLon } from './siteGrid'

/** One edge of the zone's boundary, in cell-grid coordinates. */
interface Edge {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * The true boundary of a set of cells, as line segments.
 *
 * Not a bounding box. Zones here are L-shaped and their bounding boxes
 * overlap across ground belonging to neither, so drawing boxes shows two
 * zones covering the same place, which is exactly the thing a zone
 * boundary is supposed to settle.
 *
 * An edge is on the boundary when the cell on one side of it belongs to
 * the zone and the cell on the other side does not. That is true whatever
 * shape the set is, including one with a hole in it, so it needs no
 * assumption about zones being rectangular.
 */
function boundaryEdges(cells: Set<string>, parsed: { col: number; row: number }[]): Edge[] {
  const member = new Set(parsed.map((p) => `${p.col},${p.row}`))
  const edges: Edge[] = []

  for (const { col, row } of parsed) {
    // South edge, if nothing below belongs to the zone.
    if (!member.has(`${col},${row - 1}`)) edges.push({ x1: col, y1: row, x2: col + 1, y2: row })
    // North edge.
    if (!member.has(`${col},${row + 1}`)) edges.push({ x1: col, y1: row + 1, x2: col + 1, y2: row + 1 })
    // West edge.
    if (!member.has(`${col - 1},${row}`)) edges.push({ x1: col, y1: row, x2: col, y2: row + 1 })
    // East edge.
    if (!member.has(`${col + 1},${row}`)) edges.push({ x1: col + 1, y1: row, x2: col + 1, y2: row + 1 })
  }

  void cells
  return edges
}

/**
 * Joins edges that lie end to end on the same line into single runs.
 *
 * A zone of 800 cells has hundreds of boundary edges, and handing Leaflet
 * one path per five-metre edge is both slow to draw and visibly seamed.
 * Merged runs draw as a handful of straight lines.
 */
function mergeRuns(edges: Edge[]): Edge[] {
  const horizontal = edges.filter((e) => e.y1 === e.y2)
  const vertical = edges.filter((e) => e.x1 === e.x2)
  const out: Edge[] = []

  const group = <K extends string>(items: Edge[], key: (e: Edge) => K, start: (e: Edge) => number) => {
    const byKey = new Map<K, Edge[]>()
    for (const e of items) {
      const k = key(e)
      const list = byKey.get(k) ?? []
      list.push(e)
      byKey.set(k, list)
    }
    for (const list of byKey.values()) {
      list.sort((a, b) => start(a) - start(b))
      let run = { ...list[0] }
      for (let i = 1; i < list.length; i += 1) {
        const next = list[i]
        const contiguous = run.y1 === run.y2 ? run.x2 === next.x1 : run.y2 === next.y1
        if (contiguous) {
          run = { ...run, x2: next.x2, y2: next.y2 }
        } else {
          out.push(run)
          run = { ...next }
        }
      }
      out.push(run)
    }
  }

  group(horizontal, (e) => `${e.y1}` as string, (e) => e.x1)
  group(vertical, (e) => `${e.x1}` as string, (e) => e.y1)

  return out
}

/**
 * A zone's boundary as Leaflet multi-polyline positions: an array of
 * separate line segments in real coordinates.
 */
export function zoneOutlinePositions(cellIds: string[], cellSizeM: number): [number, number][][] {
  const parsed: { col: number; row: number }[] = []
  for (const cellId of cellIds) {
    const p = parseCellId(cellId)
    if (p) parsed.push(p)
  }
  if (parsed.length === 0) return []

  return mergeRuns(boundaryEdges(new Set(cellIds), parsed)).map((e) => [
    groundToLatLon(e.x1 * cellSizeM, e.y1 * cellSizeM),
    groundToLatLon(e.x2 * cellSizeM, e.y2 * cellSizeM),
  ])
}

/** Centre of the zone's cells, for placing its label. Uses the mean cell
 * rather than the centre of a bounding box, so an L-shaped zone labels
 * inside itself rather than in the notch it does not occupy. */
export function zoneLabelPosition(cellIds: string[], cellSizeM: number): [number, number] | null {
  let sumCol = 0
  let sumRow = 0
  let n = 0
  for (const cellId of cellIds) {
    const p = parseCellId(cellId)
    if (!p) continue
    sumCol += p.col + 0.5
    sumRow += p.row + 0.5
    n += 1
  }
  if (n === 0) return null
  return groundToLatLon((sumCol / n) * cellSizeM, (sumRow / n) * cellSizeM)
}
