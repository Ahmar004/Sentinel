import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { StateChip } from '@/components'
import { RISK_BAND } from '@/domain/constants'
import type { Alert } from '@/domain/types'
import { RISK_FEATURE_LABEL } from '@/components/attributionLabels'

export interface AlertToastProps {
  alerts: Alert[]
  onView: (alertId: string) => void
  onAcknowledge: (alertId: string) => void
}

/** Elevated toasts clear themselves; critical ones never do. A critical
 * alert that vanishes while nobody was looking is the one case where an
 * auto-dismiss actively hides the thing the system exists to surface. */
const AUTO_DISMISS_MS = 12_000

function topFeature(alert: Alert): string | null {
  const first = alert.attribution[0]
  return first ? (RISK_FEATURE_LABEL[first.feature] ?? first.feature) : null
}

function Toast({
  alert,
  onView,
  onAcknowledge,
  onDismiss,
}: {
  alert: Alert
  onView: (alertId: string) => void
  onAcknowledge: (alertId: string) => void
  onDismiss: (alertId: string) => void
}) {
  const critical = alert.band === RISK_BAND.CRITICAL

  useEffect(() => {
    if (critical) return
    const id = window.setTimeout(() => onDismiss(alert.alertId), AUTO_DISMISS_MS)
    return () => window.clearTimeout(id)
  }, [critical, alert.alertId, onDismiss])

  const feature = topFeature(alert)

  return (
    <div
      role="alert"
      className={`w-80 rounded border bg-surface-raised p-3 shadow-lg ${
        critical ? 'border-risk-critical' : 'border-risk-elevated'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <StateChip kind="riskBand" value={alert.band} />
        <button
          type="button"
          onClick={() => onDismiss(alert.alertId)}
          aria-label="Dismiss this notice"
          className="-m-1 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 text-sm">
        Risk <span className="font-mono font-medium tabular-nums">{alert.score.toFixed(2)}</span> at{' '}
        <span className="font-mono">{alert.cellId}</span>
      </p>
      {feature ? <p className="mt-1 text-xs text-ink-muted">Driven mostly by {feature.toLowerCase()}.</p> : null}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onView(alert.alertId)}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => onAcknowledge(alert.alertId)}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Acknowledge
        </button>
      </div>

      {critical ? (
        <p className="mt-2 text-xs text-ink-muted">
          Critical alerts stay until dismissed. This notice will not disappear on its own.
        </p>
      ) : null}
    </div>
  )
}

/**
 * design.md D05 - transient alert notices, top right, one per alert.
 *
 * Each carries the band, the cell, the score and the single highest
 * contributing feature, so the notice answers "why" on its own rather than
 * only announcing that something happened (FR5.3).
 */
export default function AlertToast({ alerts, onView, onAcknowledge }: AlertToastProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = alerts.filter(
    (alert) =>
      !dismissed.has(alert.alertId) &&
      (alert.band === RISK_BAND.ELEVATED || alert.band === RISK_BAND.CRITICAL),
  )

  if (visible.length === 0) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
      {visible.map((alert) => (
        <div key={alert.alertId} className="pointer-events-auto">
          <Toast
            alert={alert}
            onView={onView}
            onAcknowledge={onAcknowledge}
            onDismiss={(id) => setDismissed((prev) => new Set(prev).add(id))}
          />
        </div>
      ))}
    </div>
  )
}
