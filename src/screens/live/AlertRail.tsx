import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AttributionChart, StateChip, SuggestionList } from '@/components'
import { ALERT_STATUS, type Role } from '@/domain/constants'
import type { Alert, SuggestionOption } from '@/domain/types'
import { CAPABILITY, hasCapability } from '@/auth/permissions'
import { byPriority } from './alertOrder'

export interface AlertRailProps {
  alerts: Alert[]
  suggestions: SuggestionOption[]
  zoneNamesById: Readonly<Record<string, string>>
  role: Role
  /** True while the live feed is down: acting on an alert needs the server,
   * so the controls disable rather than silently failing. */
  offline: boolean
  onAcknowledge: (alertId: string) => void
  onConfirmSuggestion: (suggestionId: string) => void
  onDismissSuggestion: (suggestionId: string) => void
}

function AlertCard({
  alert,
  suggestions,
  zoneName,
  role,
  offline,
  onAcknowledge,
  onConfirmSuggestion,
  onDismissSuggestion,
}: {
  alert: Alert
  suggestions: SuggestionOption[]
  zoneName: string
  role: Role
  offline: boolean
  onAcknowledge: (alertId: string) => void
  onConfirmSuggestion: (suggestionId: string) => void
  onDismissSuggestion: (suggestionId: string) => void
}) {
  const [showAttribution, setShowAttribution] = useState(true)
  const canAcknowledge = hasCapability(role, CAPABILITY.ACKNOWLEDGE_ALERT)
  const canSeeSuggestions = hasCapability(role, CAPABILITY.VIEW_SUGGESTIONS)
  const canAct = hasCapability(role, CAPABILITY.CONFIRM_OR_DISMISS_SUGGESTION)
  const acknowledged = alert.status !== ALERT_STATUS.OPEN

  return (
    <article className="flex flex-col gap-2 border-b border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            <Link
              to={`/live/alerts/${alert.alertId}`}
              className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {zoneName}
            </Link>
          </h3>
          <p className="font-mono text-xs text-ink-muted">
            {alert.cellId} - {alert.alertId}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StateChip kind="riskBand" value={alert.band} />
          <StateChip kind="alertStatus" value={alert.status} />
        </div>
      </div>

      <p className="text-xs">
        Risk <span className="font-mono font-medium tabular-nums">{alert.score.toFixed(2)}</span> against a threshold of{' '}
        <span className="font-mono tabular-nums">{alert.threshold.toFixed(2)}</span>, raised{' '}
        {new Date(alert.raisedAt).toLocaleTimeString()}
      </p>

      {alert.acknowledgedBy ? (
        <p className="text-xs text-ink-muted">
          Acknowledged by {alert.acknowledgedBy}
          {alert.acknowledgedAt ? ` at ${new Date(alert.acknowledgedAt).toLocaleTimeString()}` : ''}
        </p>
      ) : null}

      {/* FR5.3: attribution lives on the rail card itself, not behind a
          navigation step, so the card answers "why" without the
          coordinator leaving the map. */}
      <div>
        <button
          type="button"
          onClick={() => setShowAttribution((v) => !v)}
          aria-expanded={showAttribution}
          className="text-xs text-ink-muted underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {showAttribution ? 'Hide why this fired' : 'Show why this fired'}
        </button>
        {showAttribution ? (
          <div className="mt-2">
            <AttributionChart attribution={alert.attribution} />
          </div>
        ) : null}
      </div>

      {canAcknowledge && !acknowledged ? (
        <button
          type="button"
          disabled={offline}
          onClick={() => onAcknowledge(alert.alertId)}
          className="self-start rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Acknowledge
        </button>
      ) : null}

      {canSeeSuggestions ? (
        suggestions.length > 0 ? (
          <SuggestionList
            suggestions={suggestions}
            onConfirm={onConfirmSuggestion}
            onDismiss={onDismissSuggestion}
            disabled={offline || !canAct}
          />
        ) : null
      ) : (
        <p className="text-xs text-ink-muted">
          Suggestions are not shown for this role. Choosing a dispersion action is the coordinator's decision.
        </p>
      )}
    </article>
  )
}

/**
 * The alert feed on `S02`: a persistent 360px rail on desktop, a bottom
 * sheet with a count badge on mobile (the sheet chrome lives in `S02`).
 *
 * The Drone Operator sees this rail in full and may acknowledge, because
 * an operator who knows where an alert fired can reposition a drone toward
 * it. Suggestions stay closed to that role, and the card says so rather
 * than silently omitting them (srs.md decision D19).
 */
export default function AlertRail({
  alerts,
  suggestions,
  zoneNamesById,
  role,
  offline,
  onAcknowledge,
  onConfirmSuggestion,
  onDismissSuggestion,
}: AlertRailProps) {
  const ordered = [...alerts].sort(byPriority)

  if (ordered.length === 0) {
    return (
      <p className="p-3 text-xs text-ink-muted">
        No active alerts. Cells in the watch band are visible on the map and raise no alert by design.
      </p>
    )
  }

  return (
    <div role="list" aria-label="Active alerts">
      {ordered.map((alert) => (
        <div role="listitem" key={alert.alertId}>
          <AlertCard
            alert={alert}
            suggestions={suggestions.filter((s) => s.alertId === alert.alertId)}
            zoneName={zoneNamesById[alert.zoneId] ?? alert.zoneId}
            role={role}
            offline={offline}
            onAcknowledge={onAcknowledge}
            onConfirmSuggestion={onConfirmSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />
        </div>
      ))}
    </div>
  )
}
