import { Cell, Pie, PieChart } from 'recharts'
import InfoPopover from '@/components/InfoPopover'
import { RISK_BAND_LABEL } from '@/components/stateChipLabels'
import type { ZoneSummary } from './zoneSummary'
import { toZoneRiskPieData } from './zoneRiskPieData'

export interface ZoneRiskPieProps {
  zones: ZoneSummary[]
}

/**
 * design doc Section 5. A pie of the configured zones, each slice angled
 * by that zone's aggregate risk score and filled with its risk-band
 * colour. The whole circle is the sum of the zone scores, named in the
 * caption so a slice reads as "share of current site risk", not as a
 * probability. Absolute severity is carried by colour, not slice size.
 *
 * An unobserved zone has no score, so it renders as a distinct grey slice
 * labelled "no reading" and is never dropped (honesty invariant, FR4.6).
 * The observed percentage rides on every legend row, because this is a
 * risk surface and risk is never shown without its coverage.
 */
export default function ZoneRiskPie({ zones }: ZoneRiskPieProps) {
  const { slices, allUnobserved, peakZoneName } = toZoneRiskPieData(zones)

  return (
    <section
      aria-label="Per-zone Stampede risk"
      className="flex w-56 shrink-0 flex-col gap-1.5 rounded border border-border bg-surface-raised p-3"
    >
      <div className="flex items-center gap-1">
        <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Zone risk</h3>
        <InfoPopover label="How this pie is read">
          Each slice is one zone, angled by that zone&apos;s current risk score. The whole circle is the sum of the
          zone scores, so a slice shows a zone&apos;s share of the site&apos;s current risk, not a probability. The
          slice colour, not its size, tells you the band. A zone with no observed cell has no score, so it is drawn
          grey and labelled no reading.
        </InfoPopover>
      </div>

      <div className="mx-auto" style={{ width: 132, height: 132 }}>
        <PieChart width={132} height={132}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={62}
            isAnimationActive={false}
            stroke="var(--color-surface-raised)"
            strokeWidth={2}
          >
            {slices.map((slice) => (
              <Cell key={slice.zoneId} fill={slice.fillToken} />
            ))}
          </Pie>
        </PieChart>
      </div>

      {allUnobserved ? (
        <p className="text-xs text-ink-muted">No zone is currently observed, so no risk share can be shown.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {slices.map((slice) => (
            <li key={slice.zoneId} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.fillToken }}
                />
                <span className="truncate">{slice.name}</span>
              </span>
              {slice.observed ? (
                <span className="shrink-0 tabular-nums">
                  <span className="font-mono font-medium">{slice.score!.toFixed(2)}</span>
                  <span className="text-ink-muted"> {RISK_BAND_LABEL[slice.band!]}</span>
                  <span className="text-ink-muted"> - {slice.observedPercent}% observed</span>
                </span>
              ) : (
                <span className="shrink-0 text-ink-muted">no reading</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-muted">
        Share of current site risk by zone{peakZoneName ? `. Peak: ${peakZoneName}.` : '.'}
      </p>
    </section>
  )
}
