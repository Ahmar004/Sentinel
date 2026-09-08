import { RISK_BAND_RANGES } from '@/domain/parameters'

/** One point in a risk history. `risk` is `null` whenever the cell or zone
 * had no risk value at that timestamp - not observed, not enough dwell, or
 * the risk engine unavailable - and must never be filled in. */
export interface RiskTimelinePoint {
  ts: string
  risk: number | null
}

export interface RiskChartPoint {
  ts: string
  label: string
  risk: number | null
}

/**
 * Recharts breaks a `Line` at a `null` value when `connectNulls` is false
 * (the default `RiskTimeline` sets explicitly), rather than drawing a
 * straight segment across it. This function only formats a point for the
 * chart; it must never turn a `null` into a number, which is what would
 * turn an honest gap into an invented reading (design.md C03).
 */
export function toChartData(points: RiskTimelinePoint[]): RiskChartPoint[] {
  return points.map((point) => ({
    ts: point.ts,
    label: new Date(point.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    risk: point.risk,
  }))
}

/** Band reference lines, srs.md 2.7 - the exact three boundaries, read
 * from the same parameters module the risk bands themselves are defined
 * against, rather than restating the numbers here. */
export const RISK_TIMELINE_REFERENCE_LINES = [
  RISK_BAND_RANGES.WATCH.min,
  RISK_BAND_RANGES.ELEVATED.min,
  RISK_BAND_RANGES.CRITICAL.min,
] as const
