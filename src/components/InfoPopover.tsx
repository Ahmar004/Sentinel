import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

export interface InfoPopoverProps {
  /** Names the topic for assistive technology, e.g. "Why gaps are never guessed". */
  label: string
  /** The explanation. Rendered into the DOM only while the popover is open. */
  children: ReactNode
  /** Extra classes on the trigger wrapper, for positioning only. */
  className?: string
}

/**
 * Step-9 visual pass. The interface still has to state its own honesty
 * rules (CLAUDE.md), but the proposal-session feedback was that always-on
 * paragraphs make every screen read as a wall of text. This keeps the
 * explanation one interaction away: a small Info trigger, and a panel that
 * dismisses on Escape, on a click outside, and when focus leaves it.
 *
 * The load-bearing honesty statements - everything asserted in
 * `screens/honesty.test.tsx` - stay visible and never move in here.
 */
export default function InfoPopover({ label, children, className }: InfoPopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const close = () => setOpen(false)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        triggerRef.current?.focus()
      }
    }
    const onFocusIn = () => {
      window.setTimeout(() => {
        if (rootRef.current && !rootRef.current.contains(document.activeElement)) close()
      }, 0)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  return (
    <span ref={rootRef} className={`relative inline-flex ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-6 items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={panelId}
          role="note"
          className="absolute top-full left-0 z-50 mt-1 block w-[min(24rem,80vw)] rounded border border-border bg-surface-raised p-3 text-sm text-ink shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
