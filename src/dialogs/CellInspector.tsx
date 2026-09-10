import { useEffect, useState } from 'react'
import { Dialog, RiskTimeline, StateChip } from '@/components'
import { FreshnessDiagram } from '@/components/diagrams'
import { OBSERVATION_STATE } from '@/domain/constants'
import { CELL_AREA_SQM, DWELL_GATE_MS, STALE_MAX_AGE_MS } from '@/domain/parameters'
import type { CellObservation, CellSample } from '@/domain/types'
import { getSentinelClient, useCell } from '@/store'
import type { RiskTimelinePoint } from '@/components/riskTimelineData'

/** A sample with no risk stays null all the way to the chart, so the line
 * breaks there instead of stepping across the gap (design.md C03). */
function toTimelinePoints(samples: CellSample[]): RiskTimelinePoint[] {
  return samples.map((sample) => ({ ts: sample.ts, risk: sample.risk?.score ?? null }))
}

export interface CellInspectorProps {
  cellId: string | null
  onClose: () => void
}

type Tab = 'current' | 'features' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'current', label: 'Current' },
  { id: 'features', label: 'Features' },
  { id: 'history', label: 'History' },
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

/**
 * Why a cell carries no risk, stated in the cell's own words. CLAUDE.md
 * requires the interface to name the reason rather than leave a blank:
 * a coordinator who sees an empty score must be told whether the drone is
 * in transit, whether the window is still filling, or whether nobody has
 * looked at this ground for ten seconds.
 */
function whyNoRisk(cell: CellObservation): string | null {
  switch (cell.observationState) {
    case OBSERVATION_STATE.OBSERVED:
      return null
    case OBSERVATION_STATE.NOT_ENOUGH_DWELL:
      return `Not enough dwell. This cell has been observed for ${Math.round(cell.dwellMs / 1000)} of the ${DWELL_GATE_MS / 1000} seconds a score needs. Density is measured; risk is not claimed.`
    case OBSERVATION_STATE.STALE:
      return `Stale. The last observation is ${(cell.ageMs / 1000).toFixed(1)} seconds old, past the ${STALE_MAX_AGE_MS / 1000} second horizon for a trustworthy value. The figure shown is the last measurement, not a current one.`
    case OBSERVATION_STATE.GAP:
      return 'Coverage gap. No drone has observed this cell recently, so it carries no density, no flow and no risk. Nothing here is estimated.'
  }
}

function CurrentTab({ cell }: { cell: CellObservation }) {
  const reason = whyNoRisk(cell)
  const density = cell.observationState === OBSERVATION_STATE.GAP ? null : cell.densityPerSqM

  return (
    <dl className="text-xs">
      <Row label="Observation state">
        <StateChip kind="observationState" value={cell.observationState} />
      </Row>
      <Row label="Risk">
        {cell.risk ? (
          <span className="flex items-center justify-end gap-2">
            <span className="font-mono tabular-nums">{cell.risk.score.toFixed(2)}</span>
            <StateChip kind="riskBand" value={cell.risk.band} />
          </span>
        ) : (
          <span className="text-ink-muted">No score</span>
        )}
      </Row>
      <Row label="Density">
        {density === null ? (
          <span className="text-ink-muted">Not measured</span>
        ) : (
          <span className="font-mono tabular-nums">
            {density.toFixed(2)} per square metre, about {Math.round(density * CELL_AREA_SQM)} people
          </span>
        )}
      </Row>
      <Row label="Flow">
        {cell.flow ? (
          <span className="font-mono tabular-nums">
            {cell.flow.dirDeg} degrees at {cell.flow.speedMps.toFixed(2)} metres per second
          </span>
        ) : (
          <span className="text-ink-muted">Not measured</span>
        )}
      </Row>
      {reason ? (
        <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-ink-muted">{reason}</p>
      ) : null}
      {cell.observationState === OBSERVATION_STATE.STALE || cell.observationState === OBSERVATION_STATE.GAP ? (
        <FreshnessDiagram className="mt-3 max-w-[260px]" />
      ) : null}
    </dl>
  )
}

/**
 * design.md D01. The cell inspector: what this square of ground currently
 * reads, which window features drove it, and how it has moved.
 *
 * Every tab obeys the honesty invariant. A gap cell shows no density, no
 * flow and no risk, and says why, rather than showing the last value it
 * ever had.
 */
export default function CellInspector({ cellId, onClose }: CellInspectorProps) {
  const [tab, setTab] = useState<Tab>('current')
  const cell = useCell(cellId ?? '')

  /**
   * The loaded key travels with the data rather than being cleared by a
   * second state write, so switching cells shows "loading" immediately by
   * comparison instead of through a reset that would render one frame of
   * the previous cell's history as though it belonged to this one.
   */
  const [loaded, setLoaded] = useState<{ key: string; samples: CellSample[] | null; error: boolean }>({
    key: '',
    samples: null,
    error: false,
  })
  const historyKey = cellId ?? ''

  useEffect(() => {
    if (!cellId || tab !== 'history') return
    let cancelled = false
    const to = new Date()
    const from = new Date(to.getTime() - 10 * 60 * 1000)
    getSentinelClient()
      .getCellHistory(cellId, { from: from.toISOString(), to: to.toISOString() })
      .then((samples) => {
        if (!cancelled) setLoaded({ key: cellId, samples, error: false })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: cellId, samples: null, error: true })
      })
    return () => {
      cancelled = true
    }
  }, [cellId, tab])

  const historyReady = loaded.key === historyKey
  const history = historyReady ? loaded.samples : null
  const historyError = historyReady && loaded.error

  if (!cellId) return null

  return (
    <Dialog open title={`Cell ${cellId}`} description="One square of ground, five metres by five metres." onCancel={onClose} cancelLabel="Close">
      <div role="tablist" aria-label="Cell inspector" className="mb-3 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              tab === t.id ? 'border-accent font-medium' : 'border-transparent text-ink-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'current' ? <CurrentTab cell={cell} /> : null}

      {tab === 'features' ? (
        cell.observationState === OBSERVATION_STATE.OBSERVED ? (
          <p className="text-xs text-ink-muted">
            Window features are recorded against the alert that used them, and are shown in full on the alert surface.
            This cell is currently scored at {cell.risk.score.toFixed(2)}.
          </p>
        ) : (
          <p className="text-xs text-ink-muted">
            No window features. {whyNoRisk(cell)}
          </p>
        )
      ) : null}

      {tab === 'history' ? (
        historyError ? (
          <p className="text-xs text-ink-muted">History could not be loaded. Nothing is shown rather than a guess.</p>
        ) : history === null ? (
          <p className="text-xs text-ink-muted">Loading the last ten minutes.</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-ink-muted">No samples recorded for this cell in the last ten minutes.</p>
        ) : (
          <RiskTimeline points={toTimelinePoints(history)} />
        )
      ) : null}
    </Dialog>
  )
}
