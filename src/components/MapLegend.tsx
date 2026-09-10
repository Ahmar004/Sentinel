import { useState } from 'react'
import { List, X } from 'lucide-react'
import Legend from './Legend'

/**
 * The map legend as a collapsible control at the map's bottom-left.
 *
 * Closed by default, so it is only a small button and never covers the
 * map. Opening it gives a card that is capped in both width and height and
 * scrolls its own overflow, so even on the narrowest screen the map stays
 * visible behind it. The card minimises back to the button.
 */
export default function MapLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[400]">
      {open ? (
        <div className="pointer-events-auto flex max-h-[min(70vh,calc(100%-1rem))] w-[min(17rem,calc(100vw-1rem))] flex-col rounded border border-border bg-surface-raised/95 shadow-lg">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-2 py-1.5">
            <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Legend</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimise the legend"
              className="-m-1 rounded p-1 text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <Legend />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="pointer-events-auto flex items-center gap-2 rounded border border-border bg-surface-raised/95 px-2 py-1.5 text-xs shadow-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <List className="size-4" aria-hidden="true" />
          Legend
        </button>
      )}
    </div>
  )
}
