import { X } from 'lucide-react'

export interface FilterChip {
  id: string
  label: string
}

export interface FilterBarProps {
  filters: FilterChip[]
  onRemove: (id: string) => void
  onClearAll?: () => void
}

/**
 * design.md C09 - `S08`, `S14`, `S18`. Each active filter is its own chip,
 * individually removable, so a coordinator narrowing a search can back out
 * one condition at a time instead of clearing the whole query.
 */
export default function FilterBar({ filters, onRemove, onClearAll }: FilterBarProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Active filters">
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised py-0.5 pr-1 pl-2.5 text-xs"
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            aria-label={`Remove filter ${filter.label}`}
            className="rounded-full p-0.5 text-ink-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button type="button" onClick={onClearAll} className="text-xs text-accent hover:underline">
          Clear all
        </button>
      )}
    </div>
  )
}
