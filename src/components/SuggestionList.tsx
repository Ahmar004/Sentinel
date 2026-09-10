import { Check, X } from 'lucide-react'
import { SUGGESTION_STATUS } from '@/domain/constants'
import type { SuggestionOption } from '@/domain/types'
import StateChip from './StateChip'
import { SUGGESTION_ACTION_LABEL, SAFEGUARD_CHECK_LABEL, TEXT_SOURCE_LABEL } from './suggestionLabels'

export interface SuggestionListProps {
  suggestions: SuggestionOption[]
  onConfirm: (suggestionId: string) => void
  onDismiss: (suggestionId: string) => void
  /** True while the connection is lost or the viewer lacks the capability
   * to act - confirm and dismiss are disabled with no ambiguity about why
   * nothing happens when pressed (design.md Section 10). */
  disabled?: boolean
}

function bySafeguardFailureNamed(suggestion: SuggestionOption): string | null {
  const failed = suggestion.safeguards.find((s) => !s.passed)
  if (!failed) return null
  return `${SAFEGUARD_CHECK_LABEL[failed.check]}${failed.reason ? ` - ${failed.reason}` : ''}`
}

function SuggestionCard({
  suggestion,
  onConfirm,
  onDismiss,
  disabled,
}: {
  suggestion: SuggestionOption
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
  disabled: boolean
}) {
  const canAct = suggestion.status === SUGGESTION_STATUS.PROPOSED
  const rejectionReason = suggestion.status === SUGGESTION_STATUS.REJECTED ? bySafeguardFailureNamed(suggestion) : null

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">
            {suggestion.rank}
          </span>
          <span className="text-sm font-semibold">{SUGGESTION_ACTION_LABEL[suggestion.action]}</span>
        </div>
        <StateChip kind="suggestionStatus" value={suggestion.status} />
      </div>

      <p className="text-sm">{suggestion.text}</p>
      <span className="text-xs text-ink-muted">{TEXT_SOURCE_LABEL[suggestion.textSource]}</span>

      <p className="text-xs text-ink-muted">{suggestion.rationale}</p>

      {rejectionReason && (
        <p className="rounded border border-[var(--color-risk-critical)] bg-surface px-2 py-1 text-xs text-[var(--color-risk-critical)]">
          Rejected: {rejectionReason}
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {suggestion.safeguards.map((safeguard) => (
          <li key={safeguard.check} className="flex items-start gap-1.5 text-xs">
            {safeguard.passed ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--color-status-online)]" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 size-3.5 shrink-0 text-[var(--color-risk-critical)]" aria-hidden="true" />
            )}
            <span>
              {SAFEGUARD_CHECK_LABEL[safeguard.check]}
              {!safeguard.passed && safeguard.reason ? ` - ${safeguard.reason}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {canAct && (
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onDismiss(suggestion.suggestionId)}
            disabled={disabled}
            className="rounded border border-border px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => onConfirm(suggestion.suggestionId)}
            disabled={disabled}
            className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-surface disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * design.md C05. Ranked cards with rationale, safeguards, phrasing source,
 * confirm and dismiss. A rejected option is still rendered, with its
 * failing safeguard named (never just hidden), and if every option was
 * rejected the list says so in words rather than leaving an empty rail
 * that reads as "nothing to report" (CLAUDE.md: every suggestion is
 * ranked, explained, safeguarded, and confirmed by a human). Confirming
 * here only calls back to the caller - it actuates nothing itself, and
 * the explicit human confirmation step (D02) is the caller's dialog.
 */
export default function SuggestionList({ suggestions, onConfirm, onDismiss, disabled = false }: SuggestionListProps) {
  if (suggestions.length === 0) {
    return <p className="text-xs text-ink-muted">No suggestions issued for this alert.</p>
  }

  const ranked = [...suggestions].sort((a, b) => a.rank - b.rank)
  const noSafeOption = ranked.every((s) => s.status === SUGGESTION_STATUS.REJECTED)

  return (
    <div className="flex flex-col gap-2">
      {noSafeOption && (
        <p className="rounded border border-[var(--color-risk-critical)] bg-surface-raised px-2 py-1.5 text-xs text-[var(--color-risk-critical)]">
          No safe option was found. Every candidate failed a safeguard, listed below.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {ranked.map((suggestion) => (
          <SuggestionCard
            key={suggestion.suggestionId}
            suggestion={suggestion}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  )
}
