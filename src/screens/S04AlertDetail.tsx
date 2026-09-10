import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AttributionChart, CellLayer, InfoPopover, RiskTimeline, SiteMap, StateChip, SuggestionList, type CellGridEntry } from '@/components'
import { PrecursorDiagram } from '@/components/diagrams'
import type { RiskTimelinePoint } from '@/components/riskTimelineData'
import { CONNECTION_STATE } from '@/domain/constants'
import { ALERT_CLEAR_HOLD_MS, ALERT_CLEAR_HYSTERESIS, CELL_SIZE_M, SITE_EXTENT_M, parseCellId } from '@/domain/parameters'
import type { CellSample } from '@/domain/types'
import {
  getSentinelClient,
  useAlert,
  useCellsById,
  useConfigStore,
  useConnectionState,
  useCurrentRole,
  useSuggestions,
} from '@/store'
import { CAPABILITY, hasCapability } from '@/auth/permissions'
import ConfirmSuggestion from '@/dialogs/ConfirmSuggestion'
import DismissSuggestion from '@/dialogs/DismissSuggestion'

/** Cells within this many cells of the alerting cell, the neighbourhood
 * the map crops to. Wide enough to show where a crowd is coming from,
 * narrow enough that the alerting cell is unmistakable. */
const NEIGHBOURHOOD_RADIUS_CELLS = 8

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/**
 * design.md S04 - one alert, and the answer to "why did this fire".
 *
 * The attribution here is the full set with raw values, and it is the one
 * recorded at the moment the alert fired. It is never recomputed on read
 * (FR8.7), which is what lets a reviewer trust a historical alert.
 */
export default function S04AlertDetail() {
  const { alertId = '' } = useParams()
  const role = useCurrentRole()
  const alert = useAlert(alertId)
  const suggestions = useSuggestions()
  const cellsById = useCellsById()
  const connectionState = useConnectionState()
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)

  const [loaded, setLoaded] = useState<{ key: string; samples: CellSample[] | null }>({ key: '', samples: null })
  // FR7.7: acting on an option opens D02, never the client directly.
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const cellId = alert?.cellId ?? ''

  useEffect(() => {
    if (!cellId) return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - 10 * 60 * 1000)
    getSentinelClient()
      .getCellHistory(cellId, { from: from.toISOString(), to: to.toISOString() })
      .then((samples) => {
        if (!cancelled) setLoaded({ key: cellId, samples })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: cellId, samples: null })
      })
    return () => {
      cancelled = true
    }
  }, [cellId])

  const centre = useMemo(() => parseCellId(cellId), [cellId])

  const neighbourhood: CellGridEntry[] = useMemo(() => {
    if (!centre) return []
    const entries: CellGridEntry[] = []
    for (const [id, observation] of Object.entries(cellsById)) {
      const parsed = parseCellId(id)
      if (!parsed) continue
      if (
        Math.abs(parsed.col - centre.col) > NEIGHBOURHOOD_RADIUS_CELLS ||
        Math.abs(parsed.row - centre.row) > NEIGHBOURHOOD_RADIUS_CELLS
      ) {
        continue
      }
      entries.push({ cellId: id, col: parsed.col, row: parsed.row, observation })
    }
    return entries
  }, [cellsById, centre])

  if (!role) return null

  if (!alert) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Alert not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No alert with the identifier {alertId} is currently active. It may have cleared, in which case it is in the
          history.
        </p>
        <Link to="/history" className="mt-3 inline-block text-sm underline">
          Search history
        </Link>
      </div>
    )
  }

  const zoneName = zones.find((z) => z.zoneId === alert.zoneId)?.name ?? alert.zoneId
  const clearBelow = alert.threshold - ALERT_CLEAR_HYSTERESIS
  const offline = connectionState === CONNECTION_STATE.DISCONNECTED
  const canSeeSuggestions = hasCapability(role, CAPABILITY.VIEW_SUGGESTIONS)
  const canAct = hasCapability(role, CAPABILITY.CONFIRM_OR_DISMISS_SUGGESTION)
  const mine = suggestions.filter((s) => s.alertId === alert.alertId)

  const points: RiskTimelinePoint[] =
    loaded.key === cellId && loaded.samples
      ? loaded.samples.map((s) => ({ ts: s.ts, risk: s.risk?.score ?? null }))
      : []

  const focusBounds: [[number, number], [number, number]] | undefined = centre
    ? [
        [
          Math.max(0, (centre.row - NEIGHBOURHOOD_RADIUS_CELLS) * CELL_SIZE_M),
          Math.max(0, (centre.col - NEIGHBOURHOOD_RADIUS_CELLS) * CELL_SIZE_M),
        ],
        [
          (centre.row + NEIGHBOURHOOD_RADIUS_CELLS + 1) * CELL_SIZE_M,
          (centre.col + NEIGHBOURHOOD_RADIUS_CELLS + 1) * CELL_SIZE_M,
        ],
      ]
    : undefined

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{zoneName}</h1>
            <p className="font-mono text-xs text-ink-muted">
              {alert.cellId} - {alert.alertId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StateChip kind="riskBand" value={alert.band} />
            <StateChip kind="alertStatus" value={alert.status} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Risk at raise">
            <span className="font-mono tabular-nums">{alert.score.toFixed(2)}</span>
          </Field>
          <Field label="Threshold">
            <span className="font-mono tabular-nums">{alert.threshold.toFixed(2)}</span>
          </Field>
          <Field label="Raised">{new Date(alert.raisedAt).toLocaleTimeString()}</Field>
          <Field label="Acknowledged">
            {alert.acknowledgedBy ? (
              <>
                {alert.acknowledgedBy}
                {alert.acknowledgedAt ? ` at ${new Date(alert.acknowledgedAt).toLocaleTimeString()}` : ''}
              </>
            ) : (
              <span className="text-ink-muted">Not yet</span>
            )}
          </Field>
        </dl>

        {/* FR5.4, stated in words rather than left to be inferred from a
            hysteresis constant nobody can see. */}
        <p className="mt-3 text-xs text-ink-muted">
          Clears when risk stays below {clearBelow.toFixed(2)} for {ALERT_CLEAR_HOLD_MS / 1000} seconds. The margin below
          the threshold stops a score hovering at the boundary from raising a burst of alerts.
        </p>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center gap-1">
            <h2 className="text-lg font-semibold">Why this fired</h2>
            <InfoPopover label="How this attribution was recorded">
              These contributions were recorded at the moment the alert fired and are never recomputed, so this reads
              the same today as it will in the audit trail (FR8.7).
            </InfoPopover>
          </div>
          <AttributionChart attribution={alert.attribution} />
          <p className="mt-3 text-xs text-ink-muted">The three precursors the risk model weighs most heavily:</p>
          <PrecursorDiagram className="mt-1 max-w-md" />
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Risk at {alert.cellId}</h2>
          {points.length > 0 ? (
            <RiskTimeline points={points} />
          ) : (
            <p className="text-xs text-ink-muted">No history loaded for this cell.</p>
          )}
        </section>

        <section className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-1">
            <h2 className="text-lg font-semibold">Where</h2>
            <InfoPopover label="What this map shows">
              The alerting cell and the {NEIGHBOURHOOD_RADIUS_CELLS} cells around it, with the same treatments as the
              live map. Pan out to see the rest of the site.
            </InfoPopover>
          </div>
          <div className="h-80 overflow-hidden rounded border border-border">
            <SiteMap
              groundExtentM={site?.groundExtentM ?? SITE_EXTENT_M}
              focusBounds={focusBounds}
            >
              <CellLayer cells={neighbourhood} cellSizeM={CELL_SIZE_M} />
            </SiteMap>
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Suggestions</h2>
          {canSeeSuggestions ? (
            mine.length > 0 ? (
              <SuggestionList
                suggestions={mine}
                onConfirm={setConfirming}
                onDismiss={setDismissing}
                disabled={offline || !canAct}
              />
            ) : (
              <p className="text-xs text-ink-muted">No options were issued for this alert.</p>
            )
          ) : (
            <p className="text-xs text-ink-muted">
              Suggestions are not shown for this role. Choosing a dispersion action is the coordinator's decision, not
              the pilot's.
            </p>
          )}
        </section>
      </div>

      {toast ? (
        <p role="status" className="sticky bottom-0 border-t border-border bg-surface-raised px-4 py-2 text-xs">
          {toast}
        </p>
      ) : null}

      <ConfirmSuggestion
        suggestion={mine.find((s) => s.suggestionId === confirming) ?? null}
        onClose={() => setConfirming(null)}
        onConfirmed={setToast}
      />
      <DismissSuggestion
        suggestion={mine.find((s) => s.suggestionId === dismissing) ?? null}
        onClose={() => setDismissing(null)}
        onDismissed={setToast}
      />
    </div>
  )
}
