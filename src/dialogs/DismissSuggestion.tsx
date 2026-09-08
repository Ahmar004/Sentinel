import { useState } from 'react'
import { Dialog } from '@/components'
import type { SuggestionOption } from '@/domain/types'
import { getSentinelClient } from '@/store'
import { SUGGESTION_ACTION_LABEL } from '@/components/suggestionLabels'

export interface DismissSuggestionProps {
  suggestion: SuggestionOption | null
  onClose: () => void
  onDismissed?: (message: string) => void
}

/**
 * design.md D03 - dismiss an option, with an optional reason (FR7.8).
 *
 * The reason is optional on purpose: a coordinator under time pressure who
 * is forced to type before dismissing will either type nothing useful or
 * leave the option sitting there. Both are worse than an unexplained
 * dismissal that is at least recorded with its actor and time.
 */
export default function DismissSuggestion({ suggestion, onClose, onDismissed }: DismissSuggestionProps) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!suggestion) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().dismissSuggestion(suggestion.suggestionId)
      onDismissed?.(
        `${SUGGESTION_ACTION_LABEL[suggestion.action] ?? suggestion.action} dismissed${reason.trim() ? `: ${reason.trim()}` : ''}.`,
      )
      onClose()
    } catch {
      setError('The dismissal could not be recorded. The option is unchanged.')
    } finally {
      setSaving(false)
    }
  }

  if (!suggestion) return null

  return (
    <Dialog
      open
      title={`Dismiss: ${SUGGESTION_ACTION_LABEL[suggestion.action] ?? suggestion.action}`}
      description={`Ranked ${suggestion.rank} for alert ${suggestion.alertId}.`}
      confirmLabel={saving ? 'Recording...' : 'Dismiss this option'}
      confirmDisabled={saving}
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Dismissal is audit-logged with your name and the time."
    >
      <p className="text-sm">{suggestion.text}</p>

      <div className="mt-3">
        <label htmlFor="dismiss-reason" className="mb-1 block text-sm font-medium">
          Reason, optional
        </label>
        <textarea
          id="dismiss-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ground team already redirecting"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <p className="mt-1 text-xs text-ink-muted">
          A reason helps whoever reviews this later, but the dismissal is recorded either way, with who dismissed it and
          when.
        </p>
      </div>

      <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        Dismissing this option leaves the alert open. The other ranked options stay available, and the alert clears only
        when its risk actually falls.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
