import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface DialogProps {
  /** Controls mounting. A closed dialog renders nothing at all. */
  open: boolean
  /** Heading text. Also labels the dialog for assistive technology. */
  title: string
  /** Optional line under the title explaining what the dialog decides. */
  description?: string
  /** Dialog body. Put form fields here, never the action buttons. */
  children?: ReactNode
  /** Label for the submitting action. Omit to render a dialog with no primary action. */
  confirmLabel?: string
  /** Label for the cancelling action. */
  cancelLabel?: string
  /** Called on submit, on Enter, and on the primary button. */
  onConfirm?: () => void
  /** Called on Esc, on the backdrop, on the close control, and on the cancel button. */
  onCancel: () => void
  /** Disables the primary action without hiding it, so the reason stays visible. */
  confirmDisabled?: boolean
  /** Marks the primary action as consequential, for deactivations and deletions. */
  destructive?: boolean
  /** Extra content on the action row, left of the buttons. */
  footnote?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The single dialog primitive every pop-up in design.md Section 6 is built
 * from, so that the keyboard contract in CLAUDE.md is implemented once
 * rather than re-derived fourteen times: Enter submits, Esc cancels, the
 * primary action is the form's only `type="submit"` and every other button
 * is `type="button"`.
 *
 * Focus moves into the dialog on open and returns to the element that
 * opened it on close, and Tab is trapped inside while it is open. On
 * desktop it is a centred modal; below the 768px breakpoint it is a bottom
 * sheet within thumb reach, which is the mobile pattern design.md Section
 * 11 asks for rather than a shrunken desktop modal.
 */
export default function Dialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  destructive = false,
  footnote,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Remember what had focus before the dialog opened, and restore it after,
  // so a keyboard user is not dropped at the top of the document on close.
  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()
    return () => returnFocusRef.current?.focus?.()
  }, [open])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onCancel],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[90vh] w-full flex-col rounded-t-lg border border-border bg-surface-raised text-ink shadow-lg outline-none md:max-w-lg md:rounded-lg"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!confirmDisabled) onConfirm?.()
          }}
          className="flex min-h-0 flex-col"
        >
          <div className="flex items-start gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-sm font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-xs text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="-m-1 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">{children}</div> : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <div className="min-w-0 flex-1 text-xs text-ink-muted">{footnote}</div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {cancelLabel}
            </button>
            {confirmLabel ? (
              <button
                type="submit"
                disabled={confirmDisabled}
                className={`rounded px-3 py-1.5 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                  destructive ? 'bg-risk-critical' : 'bg-accent'
                }`}
              >
                {confirmLabel}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
