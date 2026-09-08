import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { CellCanvasLayer } from './CellCanvasLayer'
import { buildCellFrames, type CellGridEntry } from './cellFrame'

export type { CellGridEntry } from './cellFrame'

export interface CellLayerProps {
  /** One entry per cell currently known to the caller - never padded or
   * forward-filled for cells the caller has not received an update for. */
  cells: CellGridEntry[]
  cellSizeM: number
  onCellClick?: (cellId: string) => void
}

/**
 * design.md C02 - the only place cell appearance is decided (via
 * `getCellTreatment`, through `buildCellFrame`). Must be rendered as a
 * child of `SiteMap` (C01) so `useMap` resolves to the same Leaflet
 * instance the plan image is drawn on.
 */
export default function CellLayer({ cells, cellSizeM, onCellClick }: CellLayerProps) {
  const map = useMap()
  const layerRef = useRef<CellCanvasLayer | null>(null)

  useEffect(() => {
    const layer = new CellCanvasLayer(cellSizeM, onCellClick)
    layerRef.current = layer
    layer.addTo(map)
    return () => {
      layer.remove()
      layerRef.current = null
    }
    // The layer is recreated only if the map instance changes; cell size,
    // click handler and frame data are pushed into the existing instance
    // by the effects below, so a 1 Hz tick never tears down the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  useEffect(() => {
    layerRef.current?.setCellSizeM(cellSizeM)
  }, [cellSizeM])

  useEffect(() => {
    layerRef.current?.setOnCellClick(onCellClick)
  }, [onCellClick])

  useEffect(() => {
    layerRef.current?.setFrames(buildCellFrames(cells))
  }, [cells])

  return null
}
