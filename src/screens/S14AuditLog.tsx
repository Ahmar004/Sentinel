import { useEffect, useMemo, useState } from 'react'
import { FilterBar, type FilterChip } from '@/components'
import type { AuditEntry, AuditQuery } from '@/domain/types'
import { getSentinelClient } from '@/store'

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; entries: AuditEntry[]; total: number }

const RANGES = [
  { id: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
]

/** Renders a recorded value without asserting a shape it may not have.
 * Audit values are deliberately `unknown` in the model: a threshold change
 * carries a number, a role change a string, a zone edit an object. */
function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-ink-muted">-</span>
  if (typeof value === 'object') return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  return <span className="font-mono text-xs">{String(value)}</span>
}

/**
 * design.md S14 - the privileged action log, shared by Administrator
 * and IT.
 *
 * Every entry carries who acted, when, and the previous and new value, so
 * a threshold lowered before an incident can be found afterwards. Audit
 * records are retained for thirty days and are never downsampled, unlike
 * the cell series behind them (NFR4).
 */
export default function S14AuditLog() {
  const [rangeId, setRangeId] = useState('7d')
  const [actorId, setActorId] = useState('')
  const [actorQuery, setActorQuery] = useState('')
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[1]

  useEffect(() => {
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - range.ms)
    const query: AuditQuery = {
      actorId: actorQuery || undefined,
      from: from.toISOString(),
      to: to.toISOString(),
      pageSize: 300,
    }
    getSentinelClient()
      .queryAuditLog(query)
      .then((page) => {
        if (!cancelled) setLoad({ state: 'ready', entries: page.items, total: page.total })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [range.ms, actorQuery])

  const chips: FilterChip[] = useMemo(() => {
    const out: FilterChip[] = []
    if (actorQuery) out.push({ id: 'actor', label: `Actor: ${actorQuery}` })
    if (rangeId !== '7d') out.push({ id: 'range', label: range.label })
    return out
  }, [actorQuery, rangeId, range.label])

  const clearChip = (id: string) => {
    if (id === 'actor') {
      setActorQuery('')
      setActorId('')
    }
    if (id === 'range') setRangeId('7d')
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every privileged action, with its actor, its timestamp and what it changed.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            setActorQuery(actorId.trim())
          }}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-range" className="text-xs text-ink-muted">
              Time range
            </label>
            <select
              id="audit-range"
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
            <label htmlFor="audit-actor" className="text-xs text-ink-muted">
              Actor
            </label>
            <input
              id="audit-actor"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              placeholder="a.rahman"
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
          <FilterBar
            filters={chips}
            onRemove={clearChip}
            onClearAll={() => {
              setActorQuery('')
              setActorId('')
              setRangeId('7d')
            }}
          />
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          Audit records are retained for thirty days and are never downsampled, unlike the cell and zone series behind
          them.
        </p>
      </header>

      <div className="p-4">
        {load.state === 'loading' ? (
          <p className="text-sm text-ink-muted">Searching.</p>
        ) : load.state === 'error' ? (
          <p className="text-sm text-ink-muted">The audit log could not be read. Nothing is listed rather than a partial set.</p>
        ) : load.entries.length === 0 ? (
          <p className="text-sm text-ink-muted">No audit entries match these filters.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-muted">
              {load.entries.length} of {load.total} entries
            </p>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[52rem] text-left">
                <thead className="bg-surface-raised text-xs text-ink-muted">
                  <tr className="border-b border-border">
                    <th scope="col" className="py-1.5 pl-3 font-medium">Time</th>
                    <th scope="col" className="py-1.5 font-medium">Actor</th>
                    <th scope="col" className="py-1.5 font-medium">Action</th>
                    <th scope="col" className="py-1.5 font-medium">Target</th>
                    <th scope="col" className="py-1.5 font-medium">Previous</th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">New</th>
                  </tr>
                </thead>
                <tbody>
                  {load.entries.map((entry) => (
                    <tr key={entry.entryId} className="border-b border-border last:border-b-0">
                      <td className="py-1.5 pl-3 font-mono text-xs whitespace-nowrap">
                        {new Date(entry.ts).toLocaleString()}
                      </td>
                      <td className="py-1.5 font-mono text-xs">{entry.actorId}</td>
                      <td className="py-1.5 text-xs">{entry.action}</td>
                      <td className="py-1.5 font-mono text-xs">
                        {entry.targetType}
                        {entry.targetId ? ` ${entry.targetId}` : ''}
                      </td>
                      <td className="py-1.5">
                        <Value value={entry.previousValue} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <Value value={entry.newValue} />
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
