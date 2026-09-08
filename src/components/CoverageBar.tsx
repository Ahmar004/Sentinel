import { OBSERVATION_STATE } from '@/domain/constants'
import type { Risk, ZoneCoverage } from '@/domain/types'
import StateChip from './StateChip'
import { OBSERVATION_STATE_TOKEN } from './stateChipLabels'

export interface CoverageBarProps {
  coverage: ZoneCoverage
  /** Null whenever the zone has no computable risk value - every cell
   * `NOT_ENOUGH_DWELL` or unobserved. Required, not optional: this
   * component never renders without a risk value beside it (design.md
   * C06), so a caller cannot forget to show the number the bar explains. */
  risk: Risk | null
}

const SEGMENTS: { key: keyof ZoneCoverage; label: string; token: string }[] = [
  { key: 'observed', label: 'Observed', token: OBSERVATION_STATE_TOKEN[OBSERVATION_STATE.OBSERVED] },
  { key: 'notEnoughDwell', label: 'Not enough dwell', token: OBSERVATION_STATE_TOKEN[OBSERVATION_STATE.NOT_ENOUGH_DWELL] },
  { key: 'stale', label: 'Stale', token: OBSERVATION_STATE_TOKEN[OBSERVATION_STATE.STALE] },
  { key: 'gap', label: 'Gap', token: OBSERVATION_STATE_TOKEN[OBSERVATION_STATE.GAP] },
]

/**
 * design.md C06. One stacked bar for observed, not-enough-dwell, stale and
 * gap coverage, always paired with the risk value it explains - a zone
 * that reads "60% observed" without its risk number invites the viewer to
 * assume the rest is fine, which is exactly the honesty invariant this
 * component exists to prevent.
 */
export default function CoverageBar({ coverage, risk }: CoverageBarProps) {
  const { total } = coverage

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">Coverage</span>
        {risk ? (
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            {risk.score.toFixed(2)}
            <StateChip kind="riskBand" value={risk.band} />
          </span>
        ) : (
          <span className="text-ink-muted" title="Every cell in this zone is not enough dwell or unobserved">
            No score
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-xs text-ink-muted">No cells assigned to this zone.</p>
      ) : (
        <div
          role="img"
          aria-label={SEGMENTS.map((s) => `${s.label} ${coverage[s.key]} of ${total}`).join(', ')}
          className="flex h-2.5 w-full overflow-hidden rounded-full border border-border"
        >
          {SEGMENTS.map((segment) => {
            const count = coverage[segment.key]
            if (count <= 0) return null
            return (
              <span
                key={segment.key}
                style={{ width: `${(count / total) * 100}%`, backgroundColor: segment.token }}
                title={`${segment.label}: ${count} of ${total}`}
              />
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
        {SEGMENTS.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: segment.token }} />
            {segment.label} {coverage[segment.key]}
          </span>
        ))}
      </div>
    </div>
  )
}

