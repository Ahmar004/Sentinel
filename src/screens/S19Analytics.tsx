import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { OUTCOME_VERDICT } from '@/domain/constants'
import type { AnalyticsSummary } from '@/domain/types'
import { getSentinelClient, useConfigStore } from '@/store'
import { InfoPopover, CHART_AXIS_TICK, CHART_BAR_RADIUS, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from '@/components'
import { OUTCOME_VERDICT_LABEL, OUTCOME_VERDICT_TOKEN } from '@/components/stateChipLabels'
import { acknowledgementPercent, analyticsToCsv } from './analytics/analyticsCsv'

const RANGES = [
  { id: 'session', label: 'This session', ms: 60 * 60 * 1000 },
  { id: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
]

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; summary: AnalyticsSummary }

/** The single place this screen renders an absent measurement, so no panel
 * can quietly fall back to showing a zero instead (FR11.3). */
function NoData({ because }: { because: string }) {
  return (
    <p className="text-sm text-ink-muted">
      No data. <span className="text-xs">{because}</span>
    </p>
  )
}

/** A pie over the confirmed suggestions whose follow-up window has closed -
 * a genuine part-to-whole. A verdict with a count of zero contributes no
 * slice; the counts stay readable in the list beside it (NFR5). */
function OutcomeVerdictPie({ verdicts }: { verdicts: Record<string, number> }) {
  const slices = Object.values(OUTCOME_VERDICT)
    .map((verdict) => ({ verdict, value: verdicts[verdict] ?? 0 }))
    .filter((slice) => slice.value > 0)

  if (slices.length === 0) {
    return <p className="text-xs text-ink-muted">No window has closed yet.</p>
  }

  return (
    <PieChart width={150} height={150} aria-label="Outcome verdict distribution">
      <Pie data={slices} dataKey="value" nameKey="verdict" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false}>
        {slices.map((slice) => (
          <Cell key={slice.verdict} fill={OUTCOME_VERDICT_TOKEN[slice.verdict]} />
        ))}
      </Pie>
      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
    </PieChart>
  )
}

function Panel({ title, computedFrom, children }: { title: string; computedFrom: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border p-4">
      <div className="flex items-center gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <InfoPopover label={`How "${title}" is computed`}>Computed from {computedFrom}.</InfoPopover>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  )
}

/**
 * design.md S19, requirement FR11 - what happened over a selected range.
 *
 * The honesty invariant of Section 2.3 applies to reporting exactly as it
 * applies to the map. An acknowledgement rate of 0 percent means every
 * suggestion was ignored, which is a finding about the coordinator. No data
 * means none was issued, which is a finding about the crowd. Rendering the
 * second as the first would mislead as badly as painting a coverage gap as
 * a calm cell, so every figure here reports no data rather than zero when
 * nothing was measured.
 *
 * This screen reports. It does not forecast, recommend staffing or plan
 * capacity, all of which are out of scope (SRS 2.6).
 */
export default function S19Analytics() {
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)
  const [rangeId, setRangeId] = useState('session')
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const siteId = site?.id ?? ''
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[0]

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - range.ms)
    getSentinelClient()
      .getAnalytics(siteId, { from: from.toISOString(), to: to.toISOString() })
      .then((summary) => {
        if (!cancelled) setLoad({ state: 'ready', summary })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, range.ms])

  const zoneNames = useMemo(() => Object.fromEntries(zones.map((z) => [z.zoneId, z.name])), [zones])

  const exportCsv = () => {
    if (load.state !== 'ready') return
    const csv = analyticsToCsv(load.summary, zoneNames)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sentinel-analytics-${range.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Analytics</h1>
            <p className="mt-1 text-sm text-ink-muted">
              What happened over the selected range. This screen reports; it does not forecast, recommend staffing or
              plan capacity.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={load.state !== 'ready'}
            className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              aria-pressed={rangeId === r.id}
              className={`rounded border px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                rangeId === r.id ? 'border-accent bg-surface-sunken' : 'border-border'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-ink-muted">
          The export is generated in this browser and contacts no service.
        </p>
      </header>

      {load.state === 'loading' ? (
        <p className="p-4 text-sm text-ink-muted">Loading.</p>
      ) : load.state === 'error' ? (
        <p className="p-4 text-sm text-ink-muted">
          Analytics could not be loaded. Nothing is shown rather than figures that might be stale.
        </p>
      ) : (
        <AnalyticsBody summary={load.summary} zoneNames={zoneNames} />
      )}
    </div>
  )
}

function AnalyticsBody({
  summary,
  zoneNames,
}: {
  summary: AnalyticsSummary
  zoneNames: Readonly<Record<string, string>>
}) {
  const chartData = summary.alertsByZone.map((z) => ({
    zone: zoneNames[z.zoneId] ?? z.zoneId,
    alerts: z.count ?? 0,
    unobserved: z.count === null,
  }))
  const ackPercent = acknowledgementPercent(summary)

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Panel title="Alerts by zone" computedFrom="alerts raised in this range">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="zone" tick={CHART_AXIS_TICK} stroke={CHART_GRID_STROKE} />
              <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} stroke={CHART_GRID_STROKE} width={32} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'var(--color-surface-sunken)' }} />
              <Bar dataKey="alerts" fill="var(--color-accent)" radius={CHART_BAR_RADIUS} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* The same figures as a table, so the numbers are readable without
            interpreting the chart, and so an unobserved zone can say "no
            data" - which a bar simply cannot express (NFR5, FR11.3). */}
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr className="border-b border-border">
              <th scope="col" className="py-1 font-medium">Zone</th>
              <th scope="col" className="py-1 text-right font-medium">Alerts</th>
              <th scope="col" className="py-1 text-right font-medium">Observed share</th>
            </tr>
          </thead>
          <tbody>
            {summary.alertsByZone.map((zone) => (
              <tr key={zone.zoneId} className="border-b border-border last:border-b-0">
                <td className="py-1">{zoneNames[zone.zoneId] ?? zone.zoneId}</td>
                <td className="py-1 text-right font-mono tabular-nums">
                  {zone.count === null ? <span className="text-ink-muted">No data</span> : zone.count}
                </td>
                <td className="py-1 text-right font-mono tabular-nums">
                  {Math.round(zone.observedShareOfRange * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
          A zone nothing watched reads as no data, not zero.
          <InfoPopover label="Why an unwatched zone is not zero">
            A zero is a measured result only where the observed share is above zero. A zone nothing watched reports no
            data, because it raised no alert for want of a drone, not for want of a crowd.
          </InfoPopover>
        </p>
      </Panel>

      <Panel title="Coordinator response time" computedFrom="alerts raised and acknowledged in this range">
        {summary.responseTime === null ? (
          <NoData because="No alert was raised in this range." />
        ) : (
          <dl className="text-sm">
            <div className="flex justify-between border-b border-border py-1">
              <dt className="text-ink-muted">Raised</dt>
              <dd className="font-mono tabular-nums">{summary.responseTime.raised}</dd>
            </div>
            <div className="flex justify-between border-b border-border py-1">
              <dt className="text-ink-muted">Acknowledged</dt>
              <dd className="font-mono tabular-nums">{summary.responseTime.acknowledged}</dd>
            </div>
            <div className="flex justify-between border-b border-border py-1">
              <dt className="text-ink-muted">Median</dt>
              <dd className="font-mono tabular-nums">
                {summary.responseTime.medianMs === null ? (
                  <span className="text-ink-muted">No data</span>
                ) : (
                  `${(summary.responseTime.medianMs / 1000).toFixed(1)} s`
                )}
              </dd>
            </div>
            <div className="flex justify-between py-1">
              <dt className="text-ink-muted">95th percentile</dt>
              <dd className="font-mono tabular-nums">
                {summary.responseTime.p95Ms === null ? (
                  <span className="text-ink-muted">No data</span>
                ) : (
                  `${(summary.responseTime.p95Ms / 1000).toFixed(1)} s`
                )}
              </dd>
            </div>
          </dl>
        )}
      </Panel>

      <Panel title="Suggestion acknowledgement" computedFrom="suggestions issued in this range">
        {summary.acknowledgementRate === null ? (
          <NoData because="No suggestion was issued in this range." />
        ) : (
          <>
            <p className="text-2xl font-mono tabular-nums">
              {ackPercent === null ? <span className="text-sm text-ink-muted">No data</span> : `${ackPercent}%`}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
              <div className="flex justify-between border-b border-border py-1">
                <dt className="text-ink-muted">Issued</dt>
                <dd className="font-mono tabular-nums">{summary.acknowledgementRate.issued}</dd>
              </div>
              <div className="flex justify-between border-b border-border py-1">
                <dt className="text-ink-muted">Confirmed</dt>
                <dd className="font-mono tabular-nums">{summary.acknowledgementRate.confirmed}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-ink-muted">Dismissed</dt>
                <dd className="font-mono tabular-nums">{summary.acknowledgementRate.dismissed}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-ink-muted">Expired</dt>
                <dd className="font-mono tabular-nums">{summary.acknowledgementRate.expired}</dd>
              </div>
            </dl>
          </>
        )}
      </Panel>

      <Panel title="Outcome verdicts" computedFrom="confirmed suggestions whose follow-up window has closed">
        {summary.verdicts === null ? (
          <NoData because="No suggestion in this range was confirmed, so no outcome was tracked." />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <OutcomeVerdictPie verdicts={summary.verdicts} />
            <dl className="min-w-[10rem] flex-1 text-sm">
              {Object.values(OUTCOME_VERDICT).map((verdict) => (
                <div key={verdict} className="flex items-center justify-between border-b border-border py-1 last:border-b-0">
                  <dt className="flex items-center gap-1.5 text-ink-muted">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: OUTCOME_VERDICT_TOKEN[verdict] }}
                    />
                    {OUTCOME_VERDICT_LABEL[verdict]}
                  </dt>
                  <dd className="font-mono tabular-nums">{summary.verdicts?.[verdict] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
          Pending is counted on its own.
          <InfoPopover label="Why pending is separate">
            Pending is counted separately rather than folded into unchanged, because a window that has not closed is
            not the same as one that closed with no change.
          </InfoPopover>
        </p>
      </Panel>
    </div>
  )
}
