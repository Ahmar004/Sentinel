import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilterBar, type FilterChip } from '@/components'
import { HISTORY_DOWNSAMPLED_STEP_MS, HISTORY_FULL_RATE_DURATION_MS } from '@/domain/parameters'
import type { HistoryEvent, HistoryEventType, HistoryQuery } from '@/domain/types'
import { getSentinelClient, useConfigStore } from '@/store'

type Tab = 'ALL' | HistoryEventType

const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ALERT', label: 'Alerts' },
  { id: 'SUGGESTION', label: 'Suggestions' },
  { id: 'CONFIG_CHANGE', label: 'Configuration changes' },
]

const RANGES = [
  { id: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { id: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
]

const TYPE_LABEL: Record<HistoryEventType, string> = {
  ALERT: 'Alert',
  SUGGESTION: 'Suggestion',
  OUTCOME: 'Outcome',
  CONFIG_CHANGE: 'Configuration change',
}

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; events: HistoryEvent[]; total: number }

/**
 * design.md S08 - the searchable event stream.
 *
 * FR8 has no model behind it, so this is one of the surfaces that can be
 * made to feel genuinely complete, and it is built to that depth: filters
 * combine and each is individually removable, and a range reaching past
 * the full-rate hour states its sample resolution rather than presenting
 * coarser data as though it were per-second (FR8.2).
 */
export default function S08History() {
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('ALL')
  const [rangeId, setRangeId] = useState('24h')
  const [zoneId, setZoneId] = useState<string | undefined>()
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const siteId = site?.id ?? ''
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1]
  const beyondFullRate = range.ms > HISTORY_FULL_RATE_DURATION_MS

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - range.ms)
    const historyQuery: HistoryQuery = {
      siteId,
      zoneId,
      type: tab === 'ALL' ? undefined : tab,
      from: from.toISOString(),
      to: to.toISOString(),
      q: query || undefined,
      pageSize: 200,
    }
    getSentinelClient()
      .queryHistory(historyQuery)
      .then((page) => {
        if (!cancelled) setLoad({ state: 'ready', events: page.items, total: page.total })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, zoneId, tab, range.ms, query])

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = []
    if (zoneId) {
      const name = zones.find((z) => z.zoneId === zoneId)?.name ?? zoneId
      out.push({ id: 'zone', label: `Zone: ${name}` })
    }
    if (query) out.push({ id: 'text', label: `Text: ${query}` })
    if (rangeId !== '24h') out.push({ id: 'range', label: range.label })
    return out
  }, [zoneId, zones, query, rangeId, range.label])

  const clearChip = (id: string) => {
    if (id === 'zone') setZoneId(undefined)
    if (id === 'text') {
      setQuery('')
      setText('')
    }
    if (id === 'range') setRangeId('24h')
  }

  const clearAll = () => {
    setZoneId(undefined)
    setQuery('')
    setText('')
    setRangeId('24h')
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">History</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Alerts, suggestions, outcomes and configuration changes, in one stream.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(text.trim())
          }}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="history-range" className="text-xs text-ink-muted">
              Time range
            </label>
            <select
              id="history-range"
              value={rangeId}
              onChange={(event) => setRangeId(event.target.value)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
            >
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="history-zone" className="text-xs text-ink-muted">
              Zone
            </label>
            <select
              id="history-zone"
              value={zoneId ?? ''}
              onChange={(event) => setZoneId(event.target.value || undefined)}
              className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
            >
              <option value="">Any</option>
              {zones.map((z) => (
                <option key={z.zoneId} value={z.zoneId}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="history-text" className="text-xs text-ink-muted">
              Free text
            </label>
            <input
              id="history-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Cell, actor, wording"
              className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            Search
          </button>
        </form>

        <div className="mt-3">
          <FilterBar filters={chips} onRemove={clearChip} onClearAll={clearAll} />
        </div>

        <div role="tablist" aria-label="History scope" className="mt-3 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t.id ? 'border-accent font-medium' : 'border-transparent text-ink-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {beyondFullRate ? (
          <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
            This range reaches past the most recent hour. Beyond that hour, samples are stored one every{' '}
            {HISTORY_DOWNSAMPLED_STEP_MS / 1000} seconds rather than every second. Events themselves are never
            downsampled; only the cell and zone series behind them are (FR8.2).
          </p>
        ) : null}
      </header>

      <div className="p-4">
        {load.state === 'loading' ? (
          <p className="text-sm text-ink-muted">Searching.</p>
        ) : load.state === 'error' ? (
          <p className="text-sm text-ink-muted">History could not be loaded. Nothing is listed rather than a stale set.</p>
        ) : load.events.length === 0 ? (
          <div>
            <p className="text-sm text-ink-muted">No results for these filters.</p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-muted">
              {load.events.length} of {load.total} events
            </p>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[44rem] text-left">
                <thead className="bg-surface-raised text-xs text-ink-muted">
                  <tr className="border-b border-border">
                    <th scope="col" className="py-1.5 pl-3 font-medium">Time</th>
                    <th scope="col" className="py-1.5 font-medium">Type</th>
                    <th scope="col" className="py-1.5 font-medium">Zone</th>
                    <th scope="col" className="py-1.5 font-medium">Summary</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {load.events.map((event) => (
                    <tr key={event.eventId} className="border-b border-border last:border-b-0">
                      <td className="py-1.5 pl-3 font-mono text-xs whitespace-nowrap">
                        {new Date(event.ts).toLocaleString()}
                      </td>
                      <td className="py-1.5 text-xs">{TYPE_LABEL[event.type]}</td>
                      <td className="py-1.5 text-xs">
                        {event.zoneId ? zones.find((z) => z.zoneId === event.zoneId)?.name ?? event.zoneId : '-'}
                      </td>
                      <td className="py-1.5 text-xs">{event.summary}</td>
                      <td className="py-1.5 pr-3 text-xs whitespace-nowrap">
                        <Link to={`/history/${event.eventId}`} className="underline">
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => navigate(`/replay?from=${encodeURIComponent(event.ts)}`)}
                          className="ml-3 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
