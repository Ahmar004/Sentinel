import { CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import type { Zone, ZoneUpdate } from '@/domain/types'
import { zoneLabelPosition, zoneOutlinePositions } from './zoneOutline'

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
 * The zones the monitored environment is divided into, drawn over the
 * imagery as labelled outlines.
 *
 * Each boundary is traced from the zone's actual cells rather than from a
 * bounding box. Zones here are L-shaped, and their bounding boxes overlap
 * across ground belonging to neither, so boxes would show two zones
 * covering the same place - the exact confusion a zone boundary exists to
 * settle.
 *
 * Outline only, never filled, for two reasons. The density ramp and the
 * eight cell treatments underneath are what a viewer is judging, and a
 * translucent zone tint would shift every colour beneath it. And a filled
 * shape would assert that all the ground inside belongs to the zone, when
 * a zone is a named set of cells that need not be contiguous at all.
 */
export default function ZoneOverlay({ zones, updatesById, cellSizeM }: ZoneOverlayProps) {
  return (
    <>
      {zones.map((zone, index) => {
        const positions = zoneOutlinePositions(zone.cellIds, cellSizeM)
        if (positions.length === 0) return null

        const labelAt = zoneLabelPosition(zone.cellIds, cellSizeM)
        const colour = ZONE_COLOURS[index % ZONE_COLOURS.length]
        const band = updatesById?.[zone.zoneId]?.risk?.band

        return (
          <div key={zone.zoneId}>
            <Polyline
              positions={positions}
              pathOptions={{ color: colour, weight: 2.5, opacity: 0.95, dashArray: '8 4' }}
              interactive={false}
            />
            {labelAt ? (
              <CircleMarker center={labelAt} radius={0} pathOptions={{ opacity: 0, fillOpacity: 0 }}>
                <Tooltip direction="center" permanent className="sentinel-zone-label">
                  <span className="text-xs font-medium" style={{ color: colour }}>
                    {zone.name}
                  </span>
                  <span className="text-xs text-ink-muted">{band ? ` ${band.toLowerCase()}` : ' no score'}</span>
                </Tooltip>
              </CircleMarker>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
