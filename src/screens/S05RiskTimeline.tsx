import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HISTORY_FULL_RATE_DURATION_MS, HISTORY_DOWNSAMPLED_STEP_MS } from '@/domain/parameters'
import type { ZoneSample } from '@/domain/types'
import { getSentinelClient, useAlerts, useConfigStore } from '@/store'
import CoverageTimeline from './live/CoverageTimeline'
import MultiZoneRiskChart, { type ZoneSeries } from './timeline/MultiZoneRiskChart'

interface Period {
  id: string
  label: string
  ms: number
}

const PERIODS: Period[] = [
  { id: '15m', label: 'Last 15 minutes', ms: 15 * 60 * 1000 },
  { id: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { id: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
]

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; samples: ZoneSample[] }

/**
 * design.md S05 - every zone charted together.
 *
 * Coverage is charted underneath, per zone, because a zone risk line is
 * meaningless without knowing how much of the zone was observed at the
 * time (FR4.6). The two charts share an x axis by construction: they are
 * built from the same `ZoneSample` series, which carries risk and coverage
 * together exactly as the live feed does.
 *
 * Selecting a period beyond the full-rate hour states the sample
 * resolution rather than quietly drawing coarser data at the same
 * apparent fidelity (FR8.5).
 */
export default function S05RiskTimeline() {
  const zones = useConfigStore((s) => s.zones)
  const site = useConfigStore((s) => s.site)
  const alerts = useAlerts()
  const navigate = useNavigate()

  const [periodId, setPeriodId] = useState('1h')
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1]
  const siteId = site?.id ?? ''
  const downsampled = period.ms > HISTORY_FULL_RATE_DURATION_MS

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - period.ms)
    const stepMs = downsampled ? HISTORY_DOWNSAMPLED_STEP_MS : undefined
    getSentinelClient()
      .getZoneHistory(siteId, { from: from.toISOString(), to: to.toISOString() }, stepMs)
      .then((samples) => {
        if (!cancelled) setLoad({ state: 'ready', samples })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, period.ms, downsampled])

  const series: ZoneSeries[] = useMemo(() => {
    if (load.state !== 'ready') return []
    return zones.map((zone) => ({
      zoneId: zone.zoneId,
      name: zone.name,
      samples: load.samples.filter((s) => s.zoneId === zone.zoneId),
    }))
  }, [zones, load])

  const alertTimestamps = useMemo(() => alerts.map((a) => a.raisedAt), [alerts])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Risk timeline</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every zone on one pair of axes, with coverage underneath so a dip in risk can be told apart from a loss of
          sight.
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodId(p.id)}
              aria-pressed={periodId === p.id}
              className={`rounded border px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                periodId === p.id ? 'border-accent bg-surface-sunken' : 'border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {downsampled ? (
          <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
            Beyond the most recent hour, history is stored at one sample every{' '}
            {HISTORY_DOWNSAMPLED_STEP_MS / 1000} seconds rather than every second. This chart is drawn at that
            resolution and is not smoothed to look finer than the data behind it (FR8.5).
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6 p-4">
        {load.state === 'loading' ? (
          <p className="text-sm text-ink-muted">Loading history.</p>
        ) : load.state === 'error' ? (
          <p className="text-sm text-ink-muted">
            History could not be loaded. Nothing is charted rather than a stale series.
          </p>
        ) : (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold">Risk by zone</h2>
              <MultiZoneRiskChart
                series={series}
                alertTimestamps={alertTimestamps}
                onSelectPoint={(ts) => navigate(`/replay?from=${encodeURIComponent(ts)}`)}
              />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
                {series.map((zone) => (
                  <span key={zone.zoneId}>{zone.name}</span>
                ))}
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Select a point on the chart to replay from that moment. A break in a line is a period with no score, not
                a period at zero.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold">Coverage by zone</h2>
              <div className="flex flex-col gap-4">
                {series.map((zone) => (
                  <div key={zone.zoneId}>
                    <h3 className="mb-1 text-xs font-medium">{zone.name}</h3>
                    <CoverageTimeline samples={zone.samples} height={120} />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
