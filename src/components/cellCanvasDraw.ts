import { OBSERVATION_STATE } from '@/domain/constants'
import type { CellFrame } from './cellFrame'

export interface PixelRect {
  x: number
  y: number
  w: number
  h: number
}

/** Canvas 2D contexts do not understand `var(--token)` - resolve it against
 * the live computed style so a theme switch is picked up on the next draw. */
export function resolveColorToken(token: string, element: Element): string {
  const match = /^var\((--[\w-]+)\)$/.exec(token.trim())
  if (!match) return token
  const value = getComputedStyle(element).getPropertyValue(match[1]).trim()
  return value || token
}

const HATCH_STEP: Record<CellFrame['treatment']['pattern'], number> = {
  solid: 0,
  'diagonal-hatch': 7,
  'cross-hatch': 5,
  'dense-cross-hatch': 3,
}

function drawDiagonals(ctx: CanvasRenderingContext2D, rect: PixelRect, step: number, reverse: boolean) {
  const { x, y, w, h } = rect
  for (let offset = -h; offset < w + h; offset += step) {
    ctx.beginPath()
    if (!reverse) {
      ctx.moveTo(x + offset, y)
      ctx.lineTo(x + offset - h, y + h)
    } else {
      ctx.moveTo(x + offset, y)
      ctx.lineTo(x + offset + h, y + h)
    }
    ctx.stroke()
  }
}

function drawHatch(ctx: CanvasRenderingContext2D, rect: PixelRect, pattern: CellFrame['treatment']['pattern'], strokeColor: string) {
  const step = HATCH_STEP[pattern]
  if (step === 0) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(rect.x, rect.y, rect.w, rect.h)
  ctx.clip()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 1
  drawDiagonals(ctx, rect, step, false)
  if (pattern === 'cross-hatch' || pattern === 'dense-cross-hatch') {
    drawDiagonals(ctx, rect, step, true)
  }
  ctx.restore()
}

function drawOutline(ctx: CanvasRenderingContext2D, rect: PixelRect, outline: NonNullable<CellFrame['treatment']['outline']>, element: Element) {
  const { widthPx, colorToken, style, innerRing } = outline
  const color = resolveColorToken(colorToken, element)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = widthPx
  ctx.setLineDash(style === 'dashed' ? [widthPx * 2, widthPx * 2] : [])
  const inset = widthPx / 2
  ctx.strokeRect(rect.x + inset, rect.y + inset, rect.w - widthPx, rect.h - widthPx)
  if (style === 'double') {
    const inset2 = widthPx * 1.8
    ctx.strokeRect(rect.x + inset2, rect.y + inset2, rect.w - inset2 * 2, rect.h - inset2 * 2)
  }
  if (innerRing) {
    ctx.setLineDash([])
    ctx.lineWidth = Math.max(1, widthPx / 2)
    ctx.strokeRect(rect.x + rect.w * 0.28, rect.y + rect.h * 0.28, rect.w * 0.44, rect.h * 0.44)
  }
  ctx.restore()
}

/** Never draws a zero-length or default-direction arrow (FR3.5): the
 * caller only supplies `frame.arrow` when the underlying flow measurement
 * is non-null, and this still skips drawing when the measured speed
 * rounds to nothing on screen, rather than inventing a visible minimum. */
function drawArrow(ctx: CanvasRenderingContext2D, rect: PixelRect, arrow: NonNullable<CellFrame['arrow']>, element: Element) {
  if (arrow.speedMps <= 0) return
  const { x, y, w, h } = rect
  const maxLen = Math.min(w, h) * 0.42
  const length = Math.min(maxLen, maxLen * Math.min(1, arrow.speedMps / 2))
  if (length < 2) return
  const cx = x + w / 2
  const cy = y + h / 2
  const rad = ((arrow.dirDeg - 90) * Math.PI) / 180
  const dx = Math.cos(rad) * length
  const dy = Math.sin(rad) * length
  const tipX = cx + dx / 2
  const tipY = cy + dy / 2
  const tailX = cx - dx / 2
  const tailY = cy - dy / 2

  ctx.save()
  ctx.strokeStyle = resolveColorToken('var(--color-ink)', element)
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()

  const headLen = Math.min(4, length / 2)
  const headAngle = Math.atan2(dy, dx)
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - headLen * Math.cos(headAngle - Math.PI / 6), tipY - headLen * Math.sin(headAngle - Math.PI / 6))
  ctx.lineTo(tipX - headLen * Math.cos(headAngle + Math.PI / 6), tipY - headLen * Math.sin(headAngle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * How solid a cell's fill is drawn.
 *
 * A gap is the one state carrying no measurement at all, and roughly a
 * third of the site is gap at any moment. Painting that solid hides the
 * satellite imagery across most of the map, which leaves a viewer unable
 * to see the ground the system is reasoning about.
 *
 * So a gap's fill is drawn faint while its dense crosshatch stays at full
 * strength. The cell is still unmistakably marked as unobserved - the
 * pattern carries that, and the pattern is what survives greyscale
 * anyway - but the ground reads through it. Every other state keeps its
 * solid fill, because those cells carry a real measurement and the
 * measurement is the thing worth seeing.
 */
const GAP_FILL_ALPHA = 0.28

export function drawCellFrame(ctx: CanvasRenderingContext2D, frame: CellFrame, rect: PixelRect, element: Element) {
  const isGap = frame.observationState === OBSERVATION_STATE.GAP

  ctx.save()
  if (isGap) ctx.globalAlpha = GAP_FILL_ALPHA
  ctx.fillStyle = resolveColorToken(frame.treatment.fillToken, element)
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  ctx.restore()

  drawHatch(ctx, rect, frame.treatment.pattern, resolveColorToken('var(--color-ink-muted)', element))

  if (frame.treatment.outline) {
    drawOutline(ctx, rect, frame.treatment.outline, element)
  }
  if (frame.arrow && rect.w > 5 && rect.h > 5) {
    drawArrow(ctx, rect, frame.arrow, element)
  }
}
