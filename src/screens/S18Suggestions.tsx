import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar, StateChip, type FilterChip } from '@/components'
import { SUGGESTION_ACTION, SUGGESTION_STATUS, TEXT_SOURCE, type SuggestionAction, type SuggestionStatus, type TextSource } from '@/domain/constants'
import type { SuggestionListItem, SuggestionQuery } from '@/domain/types'
import { getSentinelClient, useConfigStore } from '@/store'
import { SAFEGUARD_CHECK_LABEL, SUGGESTION_ACTION_LABEL } from '@/components/suggestionLabels'

interface Filters {
  zoneId?: string
  status?: SuggestionStatus
  action?: SuggestionAction
  textSource?: TextSource
}

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; items: SuggestionListItem[] }

function Select<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (next: T | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange((event.target.value || undefined) as T | undefined)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function OutcomeCell({ item }: { item: SuggestionListItem }) {
  if (item.status !== SUGGESTION_STATUS.CONFIRMED) {
    return <span className="text-xs text-ink-muted">-</span>
  }
  if (item.outcomeVerdict === null) {
    return <span className="text-xs text-ink-muted">Window still open</span>
  }
  return <StateChip kind="outcomeVerdict" value={item.outcomeVerdict} />
}

function OptionRow({ item }: { item: SuggestionListItem }) {
  const failed = item.safeguards.find((s) => !s.passed)
  const rejected = item.status === SUGGESTION_STATUS.REJECTED

  return (
    <li className="border-t border-border p-3 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm">
            <span className="mr-2 font-mono text-xs text-ink-muted">Rank {item.rank}</span>
            {SUGGESTION_ACTION_LABEL[item.action] ?? item.action}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{item.text}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StateChip kind="suggestionStatus" value={item.status} />
          <OutcomeCell item={item} />
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Phrasing source: {item.textSource === TEXT_SOURCE.MODEL ? 'model' : 'template'}
        {item.confirmedBy ? ` - confirmed by ${item.confirmedBy}` : ''}
        {item.confirmedAt ? ` at ${new Date(item.confirmedAt).toLocaleTimeString()}` : ''}
        {item.dismissedBy ? ` - dismissed by ${item.dismissedBy}` : ''}
        {item.dismissedAt ? ` at ${new Date(item.dismissedAt).toLocaleTimeString()}` : ''}
      </p>

      {rejected ? (
        <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-xs">
          Rejected by a safeguard: {failed ? SAFEGUARD_CHECK_LABEL[failed.check] : 'a safeguard did not pass'}
          {failed?.reason ? ` - ${failed.reason}` : ''}. There is nothing to confirm on a rejected option.
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">
          All {item.safeguards.length} safeguards passed.
        </p>
      )}

      <p className="mt-2 flex gap-3 text-xs">
        <Link to={`/live/alerts/${item.alertId}`} className="underline">
          Open the alert
        </Link>
        <Link to={`/history/${item.suggestionId}`} className="underline">
          Open the event
        </Link>
      </p>
    </li>
  )
}

/**
 * design.md S18 - the whole life of every suggestion in one place
 * (decision D22).
 *
 * Options group by their originating alert, because three ranked options
 * for one alert are one decision, not three unrelated rows. Rejected
 * options stay visible with the failing safeguard named (FR7.4), and an
 * alert whose every candidate was rejected says so in words (FR7.5) -
 * hiding either would make the safeguards invisible, which is the opposite
 * of what they are for.
 *
 * This is the review surface. The action surface is the `S02` alert rail,
 * because a coordinator acting under time pressure must not have to
 * navigate away from the map.
 */
export default function S18Suggestions() {
  const zones = useConfigStore((s) => s.zones)
  const site = useConfigStore((s) => s.site)
  const [filters, setFilters] = useState<Filters>({})
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const siteId = site?.id
  const { zoneId, status, action, textSource } = filters

  useEffect(() => {
    let cancelled = false
    const query: SuggestionQuery = { siteId, zoneId, status, action, textSource, pageSize: 200 }
    getSentinelClient()
      .querySuggestions(query)
      .then((page) => {
        if (!cancelled) setLoad({ state: 'ready', items: page.items })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, zoneId, status, action, textSource])

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = []
    if (zoneId) {
      const name = zones.find((z) => z.zoneId === zoneId)?.name ?? zoneId
      out.push({ id: 'zoneId', label: `Zone: ${name}` })
    }
    if (status) out.push({ id: 'status', label: `Status: ${status.toLowerCase()}` })
    if (action) out.push({ id: 'action', label: `Action: ${SUGGESTION_ACTION_LABEL[action] ?? action}` })
    if (textSource) out.push({ id: 'textSource', label: `Source: ${textSource.toLowerCase()}` })
    return out
  }, [zoneId, status, action, textSource, zones])

  const grouped = useMemo(() => {
    if (load.state !== 'ready') return []
    const byAlert = new Map<string, SuggestionListItem[]>()
    for (const item of load.items) {
      const list = byAlert.get(item.alertId) ?? []
      list.push(item)
      byAlert.set(item.alertId, list)
    }
    return [...byAlert.entries()]
      .map(([alertId, items]) => ({ alertId, items: [...items].sort((a, b) => a.rank - b.rank) }))
      .sort((a, b) => b.alertId.localeCompare(a.alertId))
  }, [load])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Suggestions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every option the decision-support layer has issued, with what happened to it. Acting on a live alert happens
          on the live map; this screen is for review.
        </p>

        <div className="mt-3 flex flex-wrap gap-3">
          <Select
            id="filter-zone"
            label="Zone"
            value={zoneId}
            options={zones.map((z) => ({ value: z.zoneId, label: z.name }))}
            onChange={(next) => setFilters((f) => ({ ...f, zoneId: next }))}
          />
          <Select
            id="filter-status"
            label="Status"
            value={status}
            options={Object.values(SUGGESTION_STATUS).map((s) => ({ value: s, label: s.toLowerCase() }))}
            onChange={(next) => setFilters((f) => ({ ...f, status: next }))}
          />
          <Select
            id="filter-action"
            label="Action"
            value={action}
            options={Object.values(SUGGESTION_ACTION).map((a) => ({ value: a, label: SUGGESTION_ACTION_LABEL[a] ?? a }))}
            onChange={(next) => setFilters((f) => ({ ...f, action: next }))}
          />
          <Select
            id="filter-source"
            label="Phrasing source"
            value={textSource}
            options={Object.values(TEXT_SOURCE).map((t) => ({ value: t, label: t.toLowerCase() }))}
            onChange={(next) => setFilters((f) => ({ ...f, textSource: next }))}
          />
        </div>

        <div className="mt-3">
          <FilterBar
            filters={chips}
            onRemove={(id) => setFilters((f) => ({ ...f, [id]: undefined }))}
            onClearAll={() => setFilters({})}
          />
        </div>
      </header>

      <div className="p-4">
        {load.state === 'loading' ? (
          <p className="text-sm text-ink-muted">Loading suggestions.</p>
        ) : load.state === 'error' ? (
          <p className="text-sm text-ink-muted">
            Suggestions could not be loaded. Nothing is shown rather than a stale list.
          </p>
        ) : grouped.length === 0 ? (
          <div>
            <p className="text-sm text-ink-muted">No suggestions match these filters.</p>
            {chips.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="mt-2 rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {grouped.map((group) => {
              const allRejected = group.items.every((i) => i.status === SUGGESTION_STATUS.REJECTED)
              return (
                <li key={group.alertId} className="rounded border border-border">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-surface-sunken px-3 py-2">
                    <h2 className="text-sm font-semibold">
                      <Link to={`/live/alerts/${group.alertId}`} className="underline">
                        {group.alertId}
                      </Link>
                    </h2>
                    <span className="text-xs text-ink-muted">
                      {group.items.length} ranked {group.items.length === 1 ? 'option' : 'options'}
                    </span>
                  </div>

                  {allRejected ? (
                    <p className="border-b border-border p-3 text-xs">
                      No safe option was found for this alert. Every candidate was rejected by a safeguard, and the
                      system emitted none rather than propose a route it could not vouch for.
                    </p>
                  ) : null}

                  <ul>
                    {group.items.map((item) => (
                      <OptionRow key={item.suggestionId} item={item} />
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
