import L from 'leaflet'
import type { CellFrame } from './cellFrame'
import { cellBounds } from './siteGrid'
import { drawCellFrame } from './cellCanvasDraw'

/**
 * design.md C02: cells render as a single canvas layer drawn imperatively,
 * not as 2400 React elements, because the feed ticks at 1 Hz and React
 * reconciliation over that many nodes at that rate is not free. This class
 * owns the canvas element and its position; `CellLayer.tsx` owns wiring it
 * into a React tree via `useMap`.
 */
export class CellCanvasLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null
  private frames: CellFrame[] = []
  private cellSizeM: number
  private onCellClick?: (cellId: string) => void

  constructor(cellSizeM: number, onCellClick?: (cellId: string) => void) {
    super()
    this.cellSizeM = cellSizeM
    this.onCellClick = onCellClick
  }

  onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'sentinel-cell-layer') as HTMLCanvasElement
    this.canvas.style.position = 'absolute'
    this.canvas.style.pointerEvents = 'auto'
    map.getPane('overlayPane')?.appendChild(this.canvas)
    this.canvas.addEventListener('click', this.handleClick)
    map.on('move zoom resize viewreset', this.reset, this)
    this.reset()
    return this
  }

  onRemove(map: L.Map): this {
    map.off('move zoom resize viewreset', this.reset, this)
    this.canvas?.removeEventListener('click', this.handleClick)
    this.canvas?.remove()
    this.canvas = null
    return this
  }

  setCellSizeM(cellSizeM: number): void {
    this.cellSizeM = cellSizeM
    this.draw()
  }

  setOnCellClick(onCellClick?: (cellId: string) => void): void {
    this.onCellClick = onCellClick
  }

  setFrames(frames: CellFrame[]): void {
    this.frames = frames
    this.draw()
  }

  private handleClick = (event: MouseEvent) => {
    const map = this._map
    if (!map || !this.onCellClick || !this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const point = L.point(event.clientX - rect.left, event.clientY - rect.top)
    const latlng = map.containerPointToLatLng(point)
    const col = Math.floor(latlng.lng / this.cellSizeM)
    const row = Math.floor(latlng.lat / this.cellSizeM)
    const frame = this.frames.find((f) => f.col === col && f.row === row)
    if (frame) this.onCellClick(frame.cellId)
  }

  private reset = () => {
    const map = this._map
    if (!map || !this.canvas) return
    const size = map.getSize()
    const topLeft = map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, topLeft)
    this.canvas.width = size.x
    this.canvas.height = size.y
    this.canvas.style.width = `${size.x}px`
    this.canvas.style.height = `${size.y}px`
    this.draw()
  }

  private draw(): void {
    const map = this._map
    const canvas = this.canvas
    if (!map || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const frame of this.frames) {
      const bounds = L.latLngBounds(cellBounds(frame.col, frame.row, this.cellSizeM))
      const nw = map.latLngToContainerPoint(bounds.getNorthWest())
      const se = map.latLngToContainerPoint(bounds.getSouthEast())
      const rect = { x: nw.x, y: nw.y, w: se.x - nw.x, h: se.y - nw.y }
      if (rect.x + rect.w < 0 || rect.y + rect.h < 0 || rect.x > canvas.width || rect.y > canvas.height) {
        continue
      }
      drawCellFrame(ctx, frame, rect, canvas)
    }
  }
}
