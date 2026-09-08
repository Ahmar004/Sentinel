import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Dialog, StateChip } from '@/components'
import { OUTCOME_WINDOW_MS } from '@/domain/parameters'
import type { SuggestionOption } from '@/domain/types'
import { getSentinelClient } from '@/store'
import { SAFEGUARD_CHECK_LABEL, SUGGESTION_ACTION_LABEL } from '@/components/suggestionLabels'

export interface ConfirmSuggestionProps {
  suggestion: SuggestionOption | null
  onClose: () => void
  onConfirmed?: (message: string) => void
}

/**
 * design.md D02 - the mandatory human step (FR7.7).
 *
 * A modal, because this is a decision that must not be made by a mis-tap.
 * It restates the option in full, including every safeguard and its
 * result, so the person confirming is looking at the same evidence the
 * ranker used.
 *
 * The out-of-scope boundary is stated here rather than left to be assumed:
 * Sentinel suggests and never actuates. This is the one screen where a
 * user could otherwise believe pressing a button moves a barrier.
 */
export default function ConfirmSuggestion({ suggestion, onClose, onConfirmed }: ConfirmSuggestionProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!suggestion) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().confirmSuggestion(suggestion.suggestionId)
      onConfirmed?.(
        `${SUGGESTION_ACTION_LABEL[suggestion.action] ?? suggestion.action} confirmed. Outcome tracked for the next ${OUTCOME_WINDOW_MS / 60000} minutes.`,
      )
      onClose()
    } catch {
      setError('The confirmation could not be recorded. Nothing was decided.')
    } finally {
      setSaving(false)
    }
  }

  if (!suggestion) return null

  return (
    <Dialog
      open
      title={`Confirm: ${SUGGESTION_ACTION_LABEL[suggestion.action] ?? suggestion.action}`}
      description={`Ranked ${suggestion.rank} for alert ${suggestion.alertId}.`}
      confirmLabel={saving ? 'Recording...' : 'Confirm this option'}
      confirmDisabled={saving}
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Confirmation is audit-logged with your name and the time."
    >
      <p className="text-sm">{suggestion.text}</p>

      <p className="mt-2 text-xs text-ink-muted">{suggestion.rationale}</p>

      <dl className="mt-3 text-xs">
        {suggestion.targetExitId ? (
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-ink-muted">Target exit</dt>
            <dd className="font-mono">{suggestion.targetExitId}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 border-b border-border py-1.5">
          <dt className="shrink-0 text-ink-muted">Route cells</dt>
          <dd className="text-right font-mono break-all">{suggestion.routeCells.join(', ')}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-ink-muted">Phrasing source</dt>
          <dd>
            <StateChip kind="suggestionStatus" value={suggestion.status} />
          </dd>
        </div>
      </dl>

      <h3 className="mt-3 mb-1 text-sm font-medium">Safeguards</h3>
      <ul className="flex flex-col gap-1">
        {suggestion.safeguards.map((safeguard) => (
          <li key={safeguard.check} className="flex items-start gap-2 text-xs">
            {safeguard.passed ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-status-online" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 size-3.5 shrink-0 text-risk-critical" aria-hidden="true" />
            )}
            <span>
              {SAFEGUARD_CHECK_LABEL[safeguard.check]}
              {safeguard.reason ? <span className="text-ink-muted"> - {safeguard.reason}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {/* SRS 2.6, stated exactly where a user could otherwise assume
          otherwise. This sentence is a requirement, not a disclaimer. */}
      <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        Sentinel does not control barriers, signage or gates. Confirming records your decision and notifies your team.
        Acting on it is a human job.
      </p>

      <p className="mt-2 text-xs text-ink-muted">
        On confirming, the risk of the affected cells is tracked for {OUTCOME_WINDOW_MS / 60000} minutes and this option
        shows its countdown until a verdict is reached.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
