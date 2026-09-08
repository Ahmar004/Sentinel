import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { RISK_TIMELINE_REFERENCE_LINES } from '@/components/riskTimelineData'
import type { ZoneSample } from '@/domain/types'

export interface ZoneSeries {
  zoneId: string
  name: string
  samples: ZoneSample[]
}

export interface MultiZoneRiskChartProps {
  series: ZoneSeries[]
  /** Timestamps at which an alert was raised, drawn on the time axis. */
  alertTimestamps?: string[]
  height?: number
  onSelectPoint?: (ts: string) => void
}

/**
 * Each zone gets both a distinct colour and a distinct dash pattern, so
 * the lines stay separable without relying on hue (NFR5). Four patterns
 * is enough: a site holds at most four zones.
 */
const ZONE_STYLE = [
  { stroke: 'var(--color-accent)', dash: undefined },
  { stroke: 'var(--color-risk-elevated)', dash: '6 3' },
  { stroke: 'var(--color-risk-watch)', dash: '2 3' },
  { stroke: 'var(--color-status-online)', dash: '10 3 2 3' },
]

const BAND_TOKENS = ['var(--color-risk-watch)', 'var(--color-risk-elevated)', 'var(--color-risk-critical)']

/**
 * design.md S05. Every zone's risk on one pair of axes, with the band
 * boundaries drawn so a reader can see which band a zone was in at any
 * moment without reading the numbers off the axis.
 *
 * A null risk stays null all the way through, so the line breaks where a
 * zone had no score rather than stepping across it. `connectNulls` is left
 * at its default of false deliberately: setting it true here would draw a
 * straight line through a period nobody observed.
 */
export default function MultiZoneRiskChart({
  series,
  alertTimestamps = [],
  height = 260,
  onSelectPoint,
}: MultiZoneRiskChartProps) {
  if (series.length === 0 || series.every((s) => s.samples.length === 0)) {
    return <p className="text-xs text-ink-muted">No risk history for this period.</p>
  }

  // One row per timestamp, one column per zone: Recharts needs a single
  // merged dataset to share an x axis across the lines.
  const byTs = new Map<string, Record<string, string | number | null>>()
  for (const zone of series) {
    for (const sample of zone.samples) {
      const row = byTs.get(sample.ts) ?? {
        ts: sample.ts,
        label: new Date(sample.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      row[zone.zoneId] = sample.risk?.score ?? null
      byTs.set(sample.ts, row)
    }
  }
  const data = [...byTs.values()].sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
  const labelForTs = new Map(data.map((row) => [String(row.ts), String(row.label)]))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onClick={(state) => {
            const index = state?.activeTooltipIndex
            if (typeof index !== 'number' || index < 0) return
            const row = data[index]
            if (row && onSelectPoint) onSelectPoint(String(row.ts))
          }}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 2" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} stroke="var(--color-border)" minTickGap={28} />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.4, 0.7, 0.85, 1]}
            tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }}
            stroke="var(--color-border)"
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          {RISK_TIMELINE_REFERENCE_LINES.map((value, index) => (
            <ReferenceLine key={value} y={value} stroke={BAND_TOKENS[index]} strokeDasharray="4 4" />
          ))}
          {alertTimestamps
            .filter((ts) => labelForTs.has(ts))
            .map((ts) => (
              <ReferenceLine
                key={ts}
                x={labelForTs.get(ts)}
                stroke="var(--color-risk-critical)"
                strokeWidth={1.5}
                label={{ value: 'alert', position: 'top', fontSize: 10, fill: 'var(--color-ink-muted)' }}
              />
            ))}
          {series.map((zone, index) => {
            const style = ZONE_STYLE[index % ZONE_STYLE.length]
            return (
              <Line
                key={zone.zoneId}
                type="monotone"
                dataKey={zone.zoneId}
                name={zone.name}
                stroke={style.stroke}
                strokeDasharray={style.dash}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
