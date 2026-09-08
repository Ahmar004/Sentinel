import { CellLayer, SiteMap, type CellGridEntry } from '@/components'
import { CELL_SIZE_M, SITE_EXTENT_M, parseCellId } from '@/domain/parameters'
import type { CellObservation } from '@/domain/types'
import { useConfigStore } from '@/store'
import { footprintBounds } from './droneStats'

export interface FootprintMapProps {
  footprintCells: string[]
  cellsById: Readonly<Record<string, CellObservation>>
  /** Padding in cells around the footprint, so the drone's ground is seen
   * in a little context rather than filling the frame edge to edge. */
  padCells?: number
  className?: string
  onCellClick?: (cellId: string) => void
}

/**
 * The wind-map overlay over one drone's footprint cells only, cropped to
 * that ground.
 *
 * This is what stands in for a camera feed on `S06` and `S07`. The live
 * path carries per-cell summaries and never imagery, so what a drone
 * "sees" is drawn from the cells it is writing to, using the same eight
 * treatments as the site map. Cells outside the footprint are not passed
 * in at all, rather than dimmed, because this view is about what this one
 * drone is contributing.
 */
export default function FootprintMap({
  footprintCells,
  cellsById,
  padCells = 2,
  className,
  onCellClick,
}: FootprintMapProps) {
  const site = useConfigStore((s) => s.site)

  const cells: CellGridEntry[] = []
  for (const cellId of footprintCells) {
    const parsed = parseCellId(cellId)
    const observation = cellsById[cellId]
    if (!parsed || !observation) continue
    cells.push({ cellId, col: parsed.col, row: parsed.row, observation })
  }

  if (cells.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded border border-border bg-surface-sunken p-4 text-center text-xs text-ink-muted ${className ?? ''}`}>
        No footprint. This drone is not contributing cells right now, so there is nothing to draw.
      </div>
    )
  }

  return (
    <SiteMap
      planImageUrl={site?.planImageUrl ?? '/riverside-arena-plan.svg'}
      groundExtentM={site?.groundExtentM ?? SITE_EXTENT_M}
      focusBounds={footprintBounds(footprintCells, padCells)}
      className={className}
    >
      <CellLayer cells={cells} cellSizeM={CELL_SIZE_M} onCellClick={onCellClick} />
    </SiteMap>
  )
}
