import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CoverageBar, RiskTimeline, StateChip } from '@/components'
import type { RiskTimelinePoint } from '@/components/riskTimelineData'
import { OBSERVATION_STATE, type ObservationState } from '@/domain/constants'
import { DWELL_GATE_MS } from '@/domain/parameters'
import type { CellObservation, ZoneSample } from '@/domain/types'
import {
  getSentinelClient,
  useAlerts,
  useCellEntries,
  useConfigStore,
  useCurrentRole,
  useZone,
} from '@/store'
import { CAPABILITY, hasCapability } from '@/auth/permissions'
import CoverageTimeline from './live/CoverageTimeline'
import { summariseZone } from './live/zoneSummary'
import EditThresholds from '@/dialogs/EditThresholds'

type StateFilter = ObservationState | 'ALL'

const FILTERS: { id: StateFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: OBSERVATION_STATE.OBSERVED, label: 'Observed' },
  { id: OBSERVATION_STATE.NOT_ENOUGH_DWELL, label: 'Not enough dwell' },
  { id: OBSERVATION_STATE.STALE, label: 'Stale' },
  { id: OBSERVATION_STATE.GAP, label: 'Gap' },
]

/** Sorts by risk, highest first, with unscored cells last rather than
 * treated as zero - a cell with no score is not a calm cell. */
function byRiskDescending(a: { observation: CellObservation }, b: { observation: CellObservation }): number {
  const ra = a.observation.risk?.score
  const rb = b.observation.risk?.score
  if (ra === undefined && rb === undefined) return 0
  if (ra === undefined) return 1
  if (rb === undefined) return -1
  return rb - ra
}

function CellRow({ cellId, observation }: { cellId: string; observation: CellObservation }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-1.5 pr-3 font-mono text-xs">{cellId}</td>
      <td className="py-1.5 pr-3">
        <StateChip kind="observationState" value={observation.observationState} />
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-xs tabular-nums">
        {observation.risk ? observation.risk.score.toFixed(2) : <span className="text-ink-muted">-</span>}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-xs tabular-nums">
        {observation.observationState === OBSERVATION_STATE.GAP ? (
          <span className="text-ink-muted">-</span>
        ) : (
          observation.densityPerSqM.toFixed(2)
        )}
      </td>
      <td className="py-1.5 text-right text-xs text-ink-muted">
        {observation.observationState === OBSERVATION_STATE.NOT_ENOUGH_DWELL
          ? `${Math.round(observation.dwellMs / 1000)} s of ${DWELL_GATE_MS / 1000} s`
          : observation.observationState === OBSERVATION_STATE.STALE
            ? `${(observation.ageMs / 1000).toFixed(1)} s old`
            : ''}
      </td>
    </tr>
  )
}

/**
 * design.md S03 - one zone in depth.
 *
 * Risk and coverage are shown together everywhere on this screen, at an
 * instant in the header and over time in the two stacked charts, because a
 * risk dip caused by losing coverage and a risk dip caused by the crowd
 * thinning look identical if you only plot risk (FR4.6).
 */
export default function S03ZoneDetail() {
  const { zoneId = '' } = useParams()
  const role = useCurrentRole()
  const update = useZone(zoneId)
  const cellEntries = useCellEntries()
  const alerts = useAlerts()
  const zones = useConfigStore((s) => s.zones)
  const thresholds = useConfigStore((s) => s.thresholds)
  const site = useConfigStore((s) => s.site)

  const [filter, setFilter] = useState<StateFilter>('ALL')
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<{ key: string; samples: ZoneSample[] }>({ key: '', samples: [] })

  const siteId = site?.id ?? ''

  useEffect(() => {
    if (!siteId || !zoneId) return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)
    getSentinelClient()
      .getZoneHistory(siteId, { from: from.toISOString(), to: to.toISOString() })
      .then((samples) => {
        if (!cancelled) setLoaded({ key: `${siteId}:${zoneId}`, samples: samples.filter((s) => s.zoneId === zoneId) })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: `${siteId}:${zoneId}`, samples: [] })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, zoneId])

  const zone = zones.find((z) => z.zoneId === zoneId)

  const memberCells = useMemo(() => {
    if (!zone) return []
    const byId = Object.fromEntries(cellEntries)
    return zone.cellIds
      .map((cellId) => ({
        cellId,
        observation:
          byId[cellId] ??
          ({ observationState: OBSERVATION_STATE.GAP, densityPerSqM: null, flow: null, risk: null } as CellObservation),
      }))
      .filter((row) => filter === 'ALL' || row.observation.observationState === filter)
      .sort(byRiskDescending)
  }, [zone, cellEntries, filter])

  const summary = useMemo(() => {
    if (!zone) return null
    return summariseZone(zone, update, Object.fromEntries(cellEntries))
  }, [zone, update, cellEntries])

  if (!role) return null

  if (!zone) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Zone not found</h1>
        <p className="mt-2 text-sm text-ink-muted">No zone with the identifier {zoneId} is configured for this site.</p>
        <Link to="/live" className="mt-3 inline-block text-sm underline">
          Back to the live map
        </Link>
      </div>
    )
  }

  const risk = update?.risk ?? null
  const threshold = thresholds.find((t) => t.zoneId === zoneId)
  const canEditThresholds = hasCapability(role, CAPABILITY.EDIT_THRESHOLDS)
  const zoneAlerts = alerts.filter((a) => a.zoneId === zoneId)
  const historyReady = loaded.key === `${siteId}:${zoneId}`
  const riskPoints: RiskTimelinePoint[] = historyReady
    ? loaded.samples.map((s) => ({ ts: s.ts, risk: s.risk?.score ?? null }))
    : []

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{zone.name}</h1>
            <p className="text-xs text-ink-muted">
              {zone.cellIds.length} cells - <Link to="/live" className="underline">back to the live map</Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {risk ? (
              <>
                <span className="font-mono text-2xl tabular-nums">{risk.score.toFixed(2)}</span>
                <StateChip kind="riskBand" value={risk.band} />
              </>
            ) : (
              <span className="text-sm text-ink-muted">No score</span>
            )}
          </div>
        </div>

        {!risk ? (
          <p className="mt-2 text-xs text-ink-muted">
            This zone has no score. Every cell in it is still filling its 30 second window, so there is nothing to
            report yet. This is not the same as a calm zone.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-ink-muted">Estimated people</p>
            {summary?.estimatedPeople === null ? (
              <p className="text-sm text-ink-muted">No estimate, no cell observed for a full window</p>
            ) : (
              <p className="text-sm">
                <span className="font-mono tabular-nums">{summary?.estimatedPeople?.toLocaleString()}</span> over{' '}
                {summary?.observedCellCount} observed cells
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-muted">Peak cell</p>
            <p className="font-mono text-sm">{update?.peakCellId ?? '-'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-muted">Coverage</p>
            {update ? <CoverageBar coverage={update.coverage} risk={risk} /> : <p className="text-sm text-ink-muted">-</p>}
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Risk, last hour</h2>
          {riskPoints.length > 0 ? (
            <RiskTimeline points={riskPoints} />
          ) : (
            <p className="text-xs text-ink-muted">No risk history for this period.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Coverage, last hour</h2>
          <CoverageTimeline samples={historyReady ? loaded.samples : []} />
          <p className="mt-2 text-xs text-ink-muted">
            Read beside the risk chart: a dip in risk whose observed band collapses at the same moment is a loss of
            coverage, not a calmer crowd.
          </p>
        </section>

        <section className="lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Cells</h2>
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`rounded border px-2 py-0.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    filter === f.id ? 'border-accent bg-surface-sunken' : 'border-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto rounded border border-border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-raised text-xs text-ink-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pl-3 font-medium">Cell</th>
                  <th scope="col" className="py-1.5 font-medium">State</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Risk</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Density</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="[&_td:first-child]:pl-3 [&_td:last-child]:pr-3">
                {memberCells.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-xs text-ink-muted">
                      No cells in this zone match that filter.
                    </td>
                  </tr>
                ) : (
                  memberCells.map((row) => <CellRow key={row.cellId} cellId={row.cellId} observation={row.observation} />)
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Sorted by risk, highest first. Cells with no score sort last rather than as zero.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Alerts in this zone</h2>
          {zoneAlerts.length === 0 ? (
            <p className="text-xs text-ink-muted">No active alerts in this zone.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {zoneAlerts.map((alert) => (
                <li key={alert.alertId} className="rounded border border-border p-2">
                  <Link to={`/live/alerts/${alert.alertId}`} className="text-sm underline">
                    {alert.alertId}
                  </Link>
                  <span className="ml-2 font-mono text-xs tabular-nums">{alert.score.toFixed(2)}</span>
                  <span className="ml-2 font-mono text-xs text-ink-muted">{alert.cellId}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Thresholds</h2>
          <dl className="text-sm">
            <div className="flex justify-between border-b border-border py-1.5">
              <dt className="text-ink-muted">Risk</dt>
              <dd className="font-mono tabular-nums">
                {(threshold?.riskThreshold ?? zone.riskThreshold).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-ink-muted">Density, per square metre</dt>
              <dd className="font-mono tabular-nums">
                {(threshold?.densityThreshold ?? zone.densityThreshold).toFixed(1)}
              </dd>
            </div>
          </dl>
          {canEditThresholds ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Edit thresholds
            </button>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">Read-only. An administrator changes these in configuration.</p>
          )}
        </section>
      </div>

      {toast ? (
        <p role="status" className="sticky bottom-0 border-t border-border bg-surface-raised px-4 py-2 text-xs">
          {toast}
        </p>
      ) : null}

      <EditThresholds
        open={editing}
        zoneId={zoneId}
        zoneName={zone.name}
        current={threshold}
        onClose={() => setEditing(false)}
        onSaved={setToast}
      />
    </div>
  )
}
