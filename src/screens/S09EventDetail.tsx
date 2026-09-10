import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AttributionChart, RiskTimeline, StateChip } from '@/components'
import { OUTCOME_VERDICT_DELTA, OUTCOME_WINDOW_MS } from '@/domain/parameters'
import { OUTCOME_VERDICT, SUGGESTION_STATUS, TEXT_SOURCE } from '@/domain/constants'
import type { Alert, HistoryEvent, Outcome, SuggestionOption } from '@/domain/types'
import { getSentinelClient, useConfigStore } from '@/store'
import { useClock } from '@/hooks/useClock'
import { SAFEGUARD_CHECK_LABEL, SUGGESTION_ACTION_LABEL } from '@/components/suggestionLabels'

interface Resolved {
  event: HistoryEvent
  alert: Alert | null
  suggestions: SuggestionOption[]
  outcome: Outcome | null
}

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'error' } | { state: 'ready'; data: Resolved }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-right text-xs">{children}</dd>
    </div>
  )
}

function Countdown({ windowEndsAt }: { windowEndsAt: string }) {
  // Reads the ticking clock rather than Date.now() in the render body, so
  // the countdown actually counts down and the render stays pure.
  const now = useClock()
  const remainingMs = new Date(windowEndsAt).getTime() - now.getTime()
  if (remainingMs <= 0) return <span className="text-ink-muted">Window closed, verdict pending</span>
  const minutes = Math.floor(remainingMs / 60000)
  const seconds = Math.floor((remainingMs % 60000) / 1000)
  return (
    <span>
      Pending, {minutes}m {String(seconds).padStart(2, '0')}s of the {OUTCOME_WINDOW_MS / 60000} minute window remaining
    </span>
  )
}

function OutcomePanel({ outcome }: { outcome: Outcome }) {
  const change = outcome.peakRiskInWindow - outcome.riskAtConfirm

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Outcome</h2>
      <dl>
        <Field label="Risk at confirm">
          <span className="font-mono tabular-nums">{outcome.riskAtConfirm.toFixed(2)}</span>
        </Field>
        <Field label="Peak risk in window">
          <span className="font-mono tabular-nums">{outcome.peakRiskInWindow.toFixed(2)}</span>
        </Field>
        <Field label="Change">
          <span className="font-mono tabular-nums">
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}
          </span>
        </Field>
        <Field label="Affected cells">
          <span className="font-mono">{outcome.affectedCells.join(', ')}</span>
        </Field>
        <Field label="Verdict">
          {outcome.verdict === OUTCOME_VERDICT.PENDING ? (
            <Countdown windowEndsAt={outcome.windowEndsAt} />
          ) : (
            <StateChip kind="outcomeVerdict" value={outcome.verdict} />
          )}
        </Field>
      </dl>

      {/* FR8.6: the rule stated in plain words on the surface that applies
          it, so a reader never has to take the verdict on trust. */}
      <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-xs">
        Improved when peak risk in the window falls more than {OUTCOME_VERDICT_DELTA.toFixed(2)} below the risk at
        confirm time; worsened when it rises by at least as much; otherwise unchanged. The window is{' '}
        {OUTCOME_WINDOW_MS / 60000} minutes, long enough for a redirection to show in the trajectory and short enough
        that the change is still plausibly attributable to it.
      </p>

      {outcome.trajectory.length > 0 ? (
        <div className="mt-3">
          <h3 className="mb-1 text-xs font-medium">Risk trajectory of the affected cells</h3>
          <RiskTimeline points={outcome.trajectory.map((p) => ({ ts: p.ts, risk: p.risk }))} />
        </div>
      ) : null}
    </section>
  )
}

function SuggestionPanel({ suggestions }: { suggestions: SuggestionOption[] }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">The option set as issued</h2>
      <ul className="flex flex-col gap-2">
        {[...suggestions]
          .sort((a, b) => a.rank - b.rank)
          .map((option) => {
            const failed = option.safeguards.find((s) => !s.passed)
            return (
              <li key={option.suggestionId} className="rounded border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm">
                    <span className="mr-2 font-mono text-xs text-ink-muted">Rank {option.rank}</span>
                    {SUGGESTION_ACTION_LABEL[option.action] ?? option.action}
                  </p>
                  <StateChip kind="suggestionStatus" value={option.status} />
                </div>
                <p className="mt-1 text-xs text-ink-muted">{option.text}</p>
                <p className="mt-1 text-xs text-ink-muted">{option.rationale}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Phrasing source: {option.textSource === TEXT_SOURCE.MODEL ? 'model' : 'template'}
                  {option.confirmedBy ? ` - confirmed by ${option.confirmedBy}` : ''}
                  {option.confirmedAt ? ` at ${new Date(option.confirmedAt).toLocaleString()}` : ''}
                  {option.dismissedBy ? ` - dismissed by ${option.dismissedBy}` : ''}
                  {option.dismissedAt ? ` at ${new Date(option.dismissedAt).toLocaleString()}` : ''}
                </p>
                {option.status === SUGGESTION_STATUS.REJECTED ? (
                  <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-xs">
                    Rejected: {failed ? SAFEGUARD_CHECK_LABEL[failed.check] : 'a safeguard did not pass'}
                    {failed?.reason ? ` - ${failed.reason}` : ''}
                  </p>
                ) : null}
              </li>
            )
          })}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">
        Rejected options are kept and shown with their reason. An option set that hid its rejections would make the
        safeguards invisible (FR7.4).
      </p>
    </section>
  )
}

/**
 * design.md S09 - one historical event, rendering by type.
 *
 * This is where outcome tracking closes the loop, and it is the strongest
 * evidence in the product that Sentinel is auditable: an alert shows the
 * attribution recorded when it fired, never a recomputed one (FR8.7), and
 * a confirmed suggestion shows what actually happened to the risk of the
 * cells it affected.
 */
export default function S09EventDetail() {
  const { eventId = '' } = useParams()
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const siteId = site?.id ?? ''

  useEffect(() => {
    if (!siteId || !eventId) return
    let cancelled = false
    const client = getSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    const run = async () => {
      const page = await client.queryHistory({ siteId, from: from.toISOString(), to: to.toISOString(), pageSize: 500 })
      const event = page.items.find((e) => e.eventId === eventId || e.refId === eventId)
      if (!event) {
        if (!cancelled) setLoad({ state: 'missing' })
        return
      }

      let alert: Alert | null = null
      let suggestions: SuggestionOption[] = []
      let outcome: Outcome | null = null

      if (event.type === 'ALERT') {
        const alerts = await client.queryAlerts({ siteId, pageSize: 200 })
        alert = alerts.items.find((a) => a.alertId === event.refId) ?? null
        if (alert) suggestions = await client.getSuggestions(alert.alertId).catch(() => [])
      } else if (event.type === 'SUGGESTION' || event.type === 'OUTCOME') {
        const listed = await client.querySuggestions({ siteId, pageSize: 500 })
        const target = listed.items.find((s) => s.suggestionId === event.refId)
        if (target) {
          suggestions = listed.items.filter((s) => s.alertId === target.alertId)
          const alerts = await client.queryAlerts({ siteId, pageSize: 200 })
          alert = alerts.items.find((a) => a.alertId === target.alertId) ?? null
          outcome = await client.getOutcome(target.suggestionId).catch(() => null)
        }
      }

      if (!cancelled) setLoad({ state: 'ready', data: { event, alert, suggestions, outcome } })
    }

    run().catch(() => {
      if (!cancelled) setLoad({ state: 'error' })
    })

    return () => {
      cancelled = true
    }
  }, [siteId, eventId])

  if (load.state === 'loading') return <p className="p-6 text-sm text-ink-muted">Loading event.</p>
  if (load.state === 'error') {
    return <p className="p-6 text-sm text-ink-muted">This event could not be loaded. Nothing is shown rather than a guess.</p>
  }
  if (load.state === 'missing') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Event not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No event with the identifier {eventId} exists in the retained history.
        </p>
        <Link to="/history" className="mt-3 inline-block text-sm underline">
          Back to history
        </Link>
      </div>
    )
  }

  const { event, alert, suggestions, outcome } = load.data
  const zoneName = event.zoneId ? zones.find((z) => z.zoneId === event.zoneId)?.name ?? event.zoneId : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-5">
        <h1 className="text-xl font-semibold">{event.summary}</h1>
        <p className="mt-1 text-xs text-ink-muted">
          {new Date(event.ts).toLocaleString()}
          {zoneName ? ` - ${zoneName}` : ''} - <Link to="/history" className="underline">back to history</Link>
        </p>
      </header>

      <div className="grid gap-6 p-4 lg:grid-cols-2">
        {alert ? (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Alert as recorded</h2>
            <dl>
              <Field label="Cell">
                <span className="font-mono">{alert.cellId}</span>
              </Field>
              <Field label="Score against threshold">
                <span className="font-mono tabular-nums">
                  {alert.score.toFixed(2)} against {alert.threshold.toFixed(2)}
                </span>
              </Field>
              <Field label="Band">
                <StateChip kind="riskBand" value={alert.band} />
              </Field>
              <Field label="Status">
                <StateChip kind="alertStatus" value={alert.status} />
              </Field>
              <Field label="Acknowledged">
                {alert.acknowledgedBy
                  ? `${alert.acknowledgedBy}${alert.acknowledgedAt ? ` at ${new Date(alert.acknowledgedAt).toLocaleString()}` : ''}`
                  : 'Not acknowledged'}
              </Field>
            </dl>

            <h3 className="mt-3 mb-2 text-xs font-medium">Attribution as recorded</h3>
            <AttributionChart attribution={alert.attribution} />
            <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-xs">
              These are the contributions recorded at the moment this alert fired. They are never recomputed on read, so
              what a reviewer sees here is what the model actually used at the time (FR8.7).
            </p>
          </section>
        ) : null}

        {suggestions.length > 0 ? <SuggestionPanel suggestions={suggestions} /> : null}

        {outcome ? (
          <div className="lg:col-span-2">
            <OutcomePanel outcome={outcome} />
          </div>
        ) : null}

        {event.type === 'CONFIG_CHANGE' ? (
          <section className="lg:col-span-2">
            <h2 className="mb-2 text-lg font-semibold">Configuration change</h2>
            <p className="text-sm">{event.summary}</p>
            <p className="mt-2 text-xs text-ink-muted">
              Recorded {new Date(event.ts).toLocaleString()}. Configuration changes are versioned with their previous
              and new value and are never downsampled (FR9.9). The full record is in the audit log.
            </p>
            <Link to="/audit" className="mt-2 inline-block text-xs underline">
              Open the audit log
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  )
}
