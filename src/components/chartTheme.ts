import type { CSSProperties } from 'react'

/**
 * Shared Recharts styling - Step-9 visual pass. Every chart in the app
 * reads from here so axis text, stroke weight and the tooltip look the
 * same and stay legible at the enlarged scale. Values are token
 * references, never literal colours (CLAUDE.md).
 */
export const CHART_AXIS_TICK = { fontSize: 12, fill: 'var(--color-ink-muted)' } as const
export const CHART_GRID_STROKE = 'var(--color-border)'
export const CHART_LINE_WIDTH = 2.5
export const CHART_BAR_RADIUS: [number, number, number, number] = [3, 3, 0, 0]
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  fontSize: 13,
  color: 'var(--color-ink)',
}
