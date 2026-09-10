import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ROLE } from '@/domain/constants'
import { LATENCY_BUDGET_MS } from '@/domain/parameters'
import type { SystemHealth } from '@/domain/types'
import { getSentinelClient, useCurrentRole } from '@/store'
import { InfoPopover, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_LINE_WIDTH, CHART_TOOLTIP_STYLE } from '@/components'
import { PipelineDiagram } from '@/components/diagrams'
import { HEALTH_POLL_MS, useTicker } from '@/hooks/useTicker'

type Tab = 'workers' | 'latency' | 'services'

const TABS: { id: Tab; label: string }[] = [
  { id: 'workers', label: 'Workers' },
  { id: 'latency', label: 'Latency' },
  { id: 'services', label: 'Services' },
]

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; health: SystemHealth }

function StatusDot({ status }: { status: string }) {
  const token =
    status === 'ONLINE' || status === 'OK'
      ? 'var(--color-status-online)'
      : status === 'DEGRADED'
        ? 'var(--color-status-degraded)'
        : 'var(--color-status-offline)'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: token }} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

/**
 * design.md S15 - the operational picture, and the IT role's landing
 * screen.
 *
 * The Services tab surfaces the FR7.6 fallback rather than hiding it: when
 * the phrasing model is unavailable, suggestions keep coming with template
 * wording, and the tab says so. A degraded capability the interface hides
 * is a capability nobody can trust when it returns.
 */
export default function S15SystemHealth() {
  const role = useCurrentRole()
  const [tab, setTab] = useState<Tab>('workers')
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [history, setHistory] = useState<{ ts: string; label: string; measuredMs: number }[]>([])
  const healthTick = useTicker(HEALTH_POLL_MS)

  useEffect(() => {
    let cancelled = false
    getSentinelClient()
      .getHealth()
      .then((health) => {
        if (cancelled) return
        setLoad({ state: 'ready', health })
        setHistory((prev) =>
          [
            ...prev,
            {
              ts: new Date().toISOString(),
              label: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
              measuredMs: health.latency.measuredMs,
            },
          ].slice(-60),
        )
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
    // Matches the rate srs.md Section 3.2 pushes health.update at, so the
    // chart gains a point exactly when a new measurement could exist.
  }, [healthTick])

  if (!role) return null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-5">
        <h1 className="text-xl font-semibold">System health</h1>
        <PipelineDiagram className="mt-3 max-w-2xl" />

        {role === ROLE.IT ? (
          <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-sm">
            This is the IT landing screen. IT has no operational navigation on purpose: the role exists for deployment,
            maintenance and the confidentiality, integrity and availability of the system, and the live crowd picture is
            not needed for any of that.
          </p>
        ) : null}

        <div role="tablist" aria-label="Health views" className="mt-3 flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t.id ? 'border-accent font-medium' : 'border-transparent text-ink-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {load.state === 'loading' ? (
        <p className="p-4 text-sm text-ink-muted">Loading health.</p>
      ) : load.state === 'error' ? (
        <p className="p-4 text-sm text-ink-muted">Health could not be read. Nothing is shown rather than a stale state.</p>
      ) : (
        <div className="p-4">
          {tab === 'workers' ? (
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[30rem] text-left">
                <thead className="bg-surface-raised text-xs text-ink-muted">
                  <tr className="border-b border-border">
                    <th scope="col" className="py-1.5 pl-3 font-medium">Worker</th>
                    <th scope="col" className="py-1.5 font-medium">Status</th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-medium">Queue depth</th>
                  </tr>
                </thead>
                <tbody>
                  {load.health.workers.map((worker) => (
                    <tr key={worker.name} className="border-b border-border last:border-b-0">
                      <td className="py-1.5 pl-3 font-mono text-xs">{worker.name}</td>
                      <td className="py-1.5">
                        <StatusDot status={worker.status} />
                      </td>
                      <td className="py-1.5 pr-3 text-right font-mono text-xs tabular-nums">{worker.queueDepth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === 'latency' ? (
            <section>
              <dl className="mb-3 grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-ink-muted">Measured</dt>
                  <dd className="font-mono text-lg tabular-nums">{load.health.latency.measuredMs} ms</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">95th percentile</dt>
                  <dd className="font-mono text-lg tabular-nums">{load.health.latency.p95Ms} ms</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">Budget</dt>
                  <dd className="font-mono text-lg tabular-nums">{load.health.latency.budgetMs} ms</dd>
                </div>
              </dl>

              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="label" tick={CHART_AXIS_TICK} stroke={CHART_GRID_STROKE} minTickGap={30} />
                    <YAxis
                      domain={[0, Math.max(LATENCY_BUDGET_MS * 1.2, load.health.latency.p95Ms * 1.2)]}
                      tick={CHART_AXIS_TICK}
                      stroke={CHART_GRID_STROKE}
                      width={46}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <ReferenceLine
                      y={load.health.latency.budgetMs}
                      stroke="var(--color-risk-elevated)"
                      strokeDasharray="4 4"
                      label={{ value: 'budget', position: 'right', fontSize: 12, fill: 'var(--color-ink-muted)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="measuredMs"
                      stroke="var(--color-accent)"
                      strokeWidth={CHART_LINE_WIDTH}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-ink-muted">
                The budget is {LATENCY_BUDGET_MS} ms, and it is also the freshness boundary.
                <InfoPopover label="What the latency budget means">
                  The budget is {LATENCY_BUDGET_MS} ms from capture to display, and it is also the freshness boundary: a
                  cell whose age passes it is downgraded to stale rather than shown as current (NFR1).
                </InfoPopover>
              </p>
            </section>
          ) : null}

          {tab === 'services' ? (
            <div className="flex flex-col gap-2">
              {load.health.services.map((service) => (
                <div key={service.name} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3">
                  <span className="text-sm">{service.name}</span>
                  <StatusDot status={service.status} />
                  {service.detail ? <span className="w-full text-xs text-ink-muted">{service.detail}</span> : null}
                </div>
              ))}
              <p className="mt-1 rounded border border-border bg-surface-sunken p-2 text-xs">
                When the phrasing model is unavailable, suggestions continue with template wording and every option
                states that its phrasing came from a template. The ranking, the safeguards and the confirmation step are
                unaffected, because the model phrases options and decides nothing (FR7.6).
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
