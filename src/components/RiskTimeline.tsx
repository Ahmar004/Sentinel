import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RISK_BAND } from '@/domain/constants'
import { RISK_BAND_TOKEN } from './stateChipLabels'
import { toChartData, RISK_TIMELINE_REFERENCE_LINES, type RiskTimelinePoint } from './riskTimelineData'

export type { RiskTimelinePoint } from './riskTimelineData'

export interface RiskTimelineProps {
  points: RiskTimelinePoint[]
  height?: number
}

const REFERENCE_LINE_TOKEN: Record<number, string> = {
  [RISK_TIMELINE_REFERENCE_LINES[0]]: RISK_BAND_TOKEN[RISK_BAND.WATCH],
  [RISK_TIMELINE_REFERENCE_LINES[1]]: RISK_BAND_TOKEN[RISK_BAND.ELEVATED],
  [RISK_TIMELINE_REFERENCE_LINES[2]]: RISK_BAND_TOKEN[RISK_BAND.CRITICAL],
}

/**
 * design.md C03. Band boundaries draw as reference lines at 0.40, 0.70 and
 * 0.85 (srs.md 2.7). `connectNulls={false}` is set explicitly, even though
 * it is Recharts' default, so a gap in the series - no observation, not
 * enough dwell, or the risk engine unavailable - always renders as a break
 * in the line rather than a straight segment drawn across missing data.
 */
export default function RiskTimeline({ points, height = 220 }: RiskTimelineProps) {
  const data = toChartData(points)
  const hasAnyValue = data.some((point) => point.risk !== null)

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-ink-muted" style={{ height }}>
        No risk history for this range.
      </div>
    )
  }

  return (
    <div style={{ height }} data-testid="risk-timeline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-border)" />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="var(--color-border)" width={32} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              fontSize: 12,
            }}
            formatter={(value) => (value === null || value === undefined ? 'No risk value' : value)}
          />
          {RISK_TIMELINE_REFERENCE_LINES.map((boundary) => (
            <ReferenceLine
              key={boundary}
              y={boundary}
              stroke={REFERENCE_LINE_TOKEN[boundary]}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          ))}
          <Line
            type="monotone"
            dataKey="risk"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {!hasAnyValue && (
        <p className="mt-1 text-center text-xs text-ink-muted">No risk value anywhere in this range.</p>
      )}
    </div>
  )
}
