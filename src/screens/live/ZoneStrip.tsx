import { Link } from 'react-router-dom'
import { CoverageBar, StateChip } from '@/components'
import type { ZoneSummary } from './zoneSummary'
import ZoneRiskPie from './ZoneRiskPie'

export interface ZoneStripProps {
  zones: ZoneSummary[]
  /** Zone detail (S03) is closed to the Drone Operator, so the card stops
   * being a link rather than leading the role to a 403. */
  linkToDetail: boolean
}

function PeopleFigure({ summary }: { summary: ZoneSummary }) {
  if (summary.estimatedPeople === null) {
    return (
      <span className="text-ink-muted">
        No estimate
        <span className="sr-only"> - no cell in this zone has been observed for a full window</span>
      </span>
    )
  }
  return (
    <span>
      <span className="font-medium">{summary.estimatedPeople.toLocaleString()}</span> people over{' '}
      {summary.observedCellCount} observed {summary.observedCellCount === 1 ? 'cell' : 'cells'}
    </span>
  )
}

function ZoneCard({ summary, linkToDetail }: { summary: ZoneSummary; linkToDetail: boolean }) {
  const update = summary.update
  const risk = update?.risk ?? null

  const body = (
    <div className="flex min-w-[15rem] flex-col gap-2 rounded border border-border bg-surface-raised p-3 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{summary.name}</h3>
        {risk ? (
          <span className="font-mono text-sm tabular-nums">{risk.score.toFixed(2)}</span>
        ) : (
          <span className="text-xs text-ink-muted">No score</span>
        )}
      </div>

      <div>
        {risk ? (
          <StateChip kind="riskBand" value={risk.band} />
        ) : (
          <p className="text-xs text-ink-muted">
            Every cell is still filling its 30 second window, so this zone has no score yet.
          </p>
        )}
      </div>

      {update ? (
        <CoverageBar coverage={update.coverage} risk={risk} />
      ) : (
        <p className="text-xs text-ink-muted">Waiting for the first update from this zone.</p>
      )}

      <p className="text-xs text-ink-muted">
        <PeopleFigure summary={summary} />
      </p>

      {update?.peakCellId ? (
        <p className="font-mono text-xs text-ink-muted">Peak cell {update.peakCellId}</p>
      ) : null}
    </div>
  )

  if (!linkToDetail) return body

  return (
    <Link
      to={`/live/zones/${summary.zoneId}`}
      className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      {body}
    </Link>
  )
}

/**
 * The per-zone summary strip on `S02`: a horizontally scrolling row on
 * mobile at the top of the screen, a bottom strip on desktop.
 *
 * Every card shows risk and coverage together (`CoverageBar`, C06), never
 * risk alone, because a zone that is mostly unseen must not read as a calm
 * zone (FR4.6). A zone with no computable risk shows "No score" and says
 * why, rather than 0.00, which would claim the ground is safe.
 */
export default function ZoneStrip({ zones, linkToDetail }: ZoneStripProps) {
  if (zones.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-ink-muted">
        No zones are configured for this site yet. An administrator defines them in venue setup.
      </p>
    )
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto px-3 py-2"
      role="list"
      aria-label="Zone summaries"
    >
      <div role="listitem" className="shrink-0">
        <ZoneRiskPie zones={zones} />
      </div>
      {zones.map((summary) => (
        <div role="listitem" key={summary.zoneId}>
          <ZoneCard summary={summary} linkToDetail={linkToDetail} />
        </div>
      ))}
    </div>
  )
}
