import { describe, expect, it } from 'vitest'
import { toChartData, RISK_TIMELINE_REFERENCE_LINES } from './riskTimelineData'

describe('toChartData', () => {
  it('preserves a gap as null rather than interpolating across it', () => {
    const points = [
      { ts: '2026-08-27T10:00:00.000Z', risk: 0.3 },
      { ts: '2026-08-27T10:00:01.000Z', risk: null },
      { ts: '2026-08-27T10:00:02.000Z', risk: null },
      { ts: '2026-08-27T10:00:03.000Z', risk: 0.5 },
    ]
    const chart = toChartData(points)
    expect(chart.map((p) => p.risk)).toEqual([0.3, null, null, 0.5])
    // Never filled from a neighbour, and never coerced to zero.
    expect(chart[1].risk).not.toBe(0)
    expect(chart[1].risk).not.toBeCloseTo((0.3 + 0.5) / 2)
  })

  it('keeps one output point per input point', () => {
    const points = [
      { ts: '2026-08-27T10:00:00.000Z', risk: 0.1 },
      { ts: '2026-08-27T10:00:01.000Z', risk: null },
    ]
    expect(toChartData(points)).toHaveLength(2)
  })
})

describe('RISK_TIMELINE_REFERENCE_LINES', () => {
  it('is exactly the three band boundaries from srs.md 2.7', () => {
    expect(RISK_TIMELINE_REFERENCE_LINES).toEqual([0.4, 0.7, 0.85])
  })
})
