import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { OBSERVATION_STATE } from '@/domain/constants'
import { OBSERVATION_STATE_TOKEN } from '@/components/stateChipLabels'
import type { ZoneSample } from '@/domain/types'

export interface CoverageTimelineProps {
  samples: ZoneSample[]
  height?: number
}

const SERIES = [
  { key: 'observed', state: OBSERVATION_STATE.OBSERVED, label: 'Observed' },
  { key: 'notEnoughDwell', state: OBSERVATION_STATE.NOT_ENOUGH_DWELL, label: 'Not enough dwell' },
  { key: 'stale', state: OBSERVATION_STATE.STALE, label: 'Stale' },
  { key: 'gap', state: OBSERVATION_STATE.GAP, label: 'Gap' },
] as const

/**
 * Coverage over time, stacked, beside the zone's risk timeline.
 *
 * This is FR4.6 expressed over time rather than at an instant. Without it,
 * a risk line that dips because a drone left reads exactly like a risk line
 * that dips because the crowd thinned, and those are opposite facts. Read
 * together, a dip whose observed band collapses at the same moment is
 * clearly a loss of coverage, not a calmer zone.
 */
export default function CoverageTimeline({ samples, height = 160 }: CoverageTimelineProps) {
  if (samples.length === 0) {
    return <p className="text-xs text-ink-muted">No coverage history for this period.</p>
  }

  const data = samples.map((sample) => ({
    ts: sample.ts,
    label: new Date(sample.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    observed: sample.coverage.observed,
    notEnoughDwell: sample.coverage.notEnoughDwell,
    stale: sample.coverage.stale,
    gap: sample.coverage.gap,
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 2" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} stroke="var(--color-border)" minTickGap={24} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--color-ink-muted)' }} stroke="var(--color-border)" width={36} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          {SERIES.map((series) => (
            <Area
              key={series.key}
              type="stepAfter"
              dataKey={series.key}
              name={series.label}
              stackId="coverage"
              stroke={OBSERVATION_STATE_TOKEN[series.state]}
              fill={OBSERVATION_STATE_TOKEN[series.state]}
              fillOpacity={0.7}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
