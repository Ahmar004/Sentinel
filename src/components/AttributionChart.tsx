import { RISK_FEATURE_LABEL } from './attributionLabels'
import { orderByAbsContribution } from './attributionOrder'
import type { AlertAttribution } from '@/domain/types'

export interface AttributionChartProps {
  attribution: AlertAttribution[]
}

/**
 * design.md C04. Signed horizontal bars, ordered by absolute contribution
 * so the feature that drove the alert reads first, regardless of sign.
 * Plain CSS bars rather than Recharts: a handful of rows with a shared
 * zero baseline needs no chart library, and this keeps the alert surface
 * (CLAUDE.md "every alert answers why") readable at a glance under time
 * pressure rather than waiting on a chart library to lay out.
 */
export default function AttributionChart({ attribution }: AttributionChartProps) {
  if (attribution.length === 0) {
    return <p className="text-xs text-ink-muted">No attribution recorded for this alert.</p>
  }

  const ordered = orderByAbsContribution(attribution)
  const maxAbs = Math.max(...ordered.map((row) => Math.abs(row.contribution)), 0.01)

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Feature attribution, ordered by contribution">
      {ordered.map((row) => {
        const isPositive = row.contribution >= 0
        const widthPct = (Math.abs(row.contribution) / maxAbs) * 50
        return (
          <li key={row.feature} className="grid grid-cols-[1fr_2fr_3.5rem] items-center gap-2 text-xs">
            <span className="truncate text-ink-muted" title={RISK_FEATURE_LABEL[row.feature]}>
              {RISK_FEATURE_LABEL[row.feature]}
            </span>
            <span className="relative h-3.5 w-full">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border" aria-hidden="true" />
              <span
                className="absolute inset-y-0 rounded-sm"
                style={{
                  width: `${widthPct}%`,
                  left: isPositive ? '50%' : `${50 - widthPct}%`,
                  backgroundColor: isPositive ? 'var(--color-risk-elevated)' : 'var(--color-risk-normal)',
                }}
              />
            </span>
            <span className="text-right font-mono tabular-nums">
              {isPositive ? '+' : ''}
              {row.contribution.toFixed(2)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
