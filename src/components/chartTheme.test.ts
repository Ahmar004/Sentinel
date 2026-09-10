import { describe, expect, it } from 'vitest'
import { CHART_AXIS_TICK, CHART_LINE_WIDTH, CHART_TOOLTIP_STYLE } from './chartTheme'

describe('chartTheme', () => {
  it('sets a legible axis tick size and a token fill', () => {
    expect(CHART_AXIS_TICK.fontSize).toBeGreaterThanOrEqual(12)
    expect(CHART_AXIS_TICK.fill).toMatch(/^var\(--color-/)
  })

  it('uses a thicker line than the old default of 2', () => {
    expect(CHART_LINE_WIDTH).toBeGreaterThan(2)
  })

  it('themes the tooltip from tokens only', () => {
    expect(String(CHART_TOOLTIP_STYLE.background)).toMatch(/^var\(--color-/)
    expect(String(CHART_TOOLTIP_STYLE.border)).toContain('var(--color-border)')
  })
})
