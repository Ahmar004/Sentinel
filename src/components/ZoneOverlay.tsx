import { Polyline, Tooltip } from 'react-leaflet'
import { parseCellId } from '@/domain/parameters'
import type { Zone, ZoneUpdate } from '@/domain/types'
import { groundToLatLon } from './siteGrid'

export interface ZoneOverlayProps {
  zones: Zone[]
  /** Live updates keyed by zone, so a boundary can carry the band its zone
   * is currently in. Absent while the first tick is still in flight. */
  updatesById?: Readonly<Record<string, ZoneUpdate>>
  cellSizeM: number
}

/** Distinct outline colours, one per zone. A site holds at most four zones,
 * so four is enough and each stays separable from the others. */
const ZONE_COLOURS = [
  'var(--color-accent)',
  'var(--color-status-online)',
  'var(--color-risk-watch)',
  'var(--color-risk-elevated)',
]

/**
 * The rectangular hull of a zone's cells, as a closed ring.
 *
 * Zones are groups of cells rather than drawn polygons, so a zone has no
 * boundary of its own to render. A hull is an honest summary of where it
 * lies: it is drawn as an outline only, never filled, so it cannot be
 * mistaken for a claim that every cell inside it belongs to the zone.
 */
function zoneRing(zone: Zone, cellSizeM: number): [number, number][] | null {
  let minCol = Infinity
  let maxCol = -Infinity
  let minRow = Infinity
  let maxRow = -Infinity

  for (const cellId of zone.cellIds) {
    const parsed = parseCellId(cellId)
    if (!parsed) continue
    minCol = Math.min(minCol, parsed.col)
    maxCol = Math.max(maxCol, parsed.col)
    minRow = Math.min(minRow, parsed.row)
    maxRow = Math.max(maxRow, parsed.row)
  }
  if (minCol === Infinity) return null

  const west = minCol * cellSizeM
  const east = (maxCol + 1) * cellSizeM
  const south = minRow * cellSizeM
  const north = (maxRow + 1) * cellSizeM

  return [
    groundToLatLon(west, south),
    groundToLatLon(east, south),
    groundToLatLon(east, north),
    groundToLatLon(west, north),
    groundToLatLon(west, south),
  ]
}

/**
 * The zones the monitored environment is divided into, drawn over the
 * imagery as labelled outlines.
 *
 * Outline only, with no fill, for two reasons. The density ramp and the
 * eight cell treatments underneath are the thing a viewer is actually
 * judging, and a translucent zone tint would shift every colour beneath
 * it. And a filled rectangle would assert that all the ground inside
 * belongs to the zone, when a zone is a named set of cells that need not
 * fill its own bounding box.
 */
export default function ZoneOverlay({ zones, updatesById, cellSizeM }: ZoneOverlayProps) {
  return (
    <>
      {zones.map((zone, index) => {
        const ring = zoneRing(zone, cellSizeM)
        if (!ring) return null

        const update = updatesById?.[zone.zoneId]
        const colour = ZONE_COLOURS[index % ZONE_COLOURS.length]
        const band = update?.risk?.band

        return (
          <Polyline
            key={zone.zoneId}
            positions={ring}
            pathOptions={{ color: colour, weight: 2.5, opacity: 0.95, dashArray: '8 4' }}
            interactive
          >
            <Tooltip direction="center" permanent className="sentinel-zone-label">
              <span className="text-xs font-medium">
                {zone.name}
                {band ? ` - ${band.toLowerCase()}` : ' - no score'}
              </span>
            </Tooltip>
          </Polyline>
        )
      })}
    </>
  )
}
