import { useMemo, useState } from 'react'
import { Dialog } from '@/components'
import { DWELL_GATE_MS, GRID_COLUMNS, GRID_ROWS, formatCellId, STALE_MAX_AGE_MS } from '@/domain/parameters'
import { getSentinelClient, useConfigStore, useDrone } from '@/store'

export interface AssignDroneProps {
  droneId: string | null
  onClose: () => void
  onAssigned?: (message: string) => void
}

/** A target area is a block of cells, sized like a drone's usual footprint
 * so the review list is a realistic count rather than a token one. */
const AREA_SPAN_CELLS = 3

function areaCells(col: number, row: number): string[] {
  const cells: string[] = []
  for (let r = row; r < row + AREA_SPAN_CELLS && r < GRID_ROWS; r += 1) {
    for (let c = col; c < col + AREA_SPAN_CELLS && c < GRID_COLUMNS; c += 1) {
      cells.push(formatCellId(c, r))
    }
  }
  return cells
}

/**
 * design.md D07 - send a drone to a new area (FR9.8).
 *
 * The target is an AREA, never a zone: a drone is never bound to a zone,
 * because every measurement belongs to a cell. That is what lets the fleet
 * move without any measurement moving with it.
 *
 * The dialog states both consequences of moving before it is confirmed:
 * the cells being vacated age into gaps (FR6.3), and the cells being
 * arrived at show not enough dwell for thirty seconds before any score
 * appears (FR4.2). Neither is a fault, and neither should surprise a
 * coordinator watching the map a moment later.
 */
export default function AssignDrone({ droneId, onClose, onAssigned }: AssignDroneProps) {
  const drone = useDrone(droneId ?? '')
  const zones = useConfigStore((s) => s.zones)

  const [label, setLabel] = useState('')
  const [col, setCol] = useState('30')
  const [row, setRow] = useState('20')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const colValue = Number(col)
  const rowValue = Number(row)
  const valid =
    label.trim().length > 0 &&
    Number.isInteger(colValue) &&
    Number.isInteger(rowValue) &&
    colValue >= 0 &&
    colValue < GRID_COLUMNS &&
    rowValue >= 0 &&
    rowValue < GRID_ROWS

  const target = useMemo(() => (valid ? areaCells(colValue, rowValue) : []), [valid, colValue, rowValue])

  const vacating = drone?.footprintCells ?? []
  const zoneNamesTouched = useMemo(() => {
    const names = new Set<string>()
    for (const zone of zones) {
      if (zone.cellIds.some((id) => target.includes(id))) names.add(zone.name)
    }
    return [...names]
  }, [zones, target])

  const submit = async () => {
    if (!droneId || !valid) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().assignDrone(droneId, { label: label.trim(), cellIds: target })
      onAssigned?.(`${droneId} sent to ${label.trim()}, ${target.length} cells.`)
      onClose()
    } catch {
      setError('The assignment could not be sent. The drone has not moved.')
    } finally {
      setSaving(false)
    }
  }

  if (!droneId) return null

  return (
    <Dialog
      open
      title={`Assign ${droneId}`}
      description="Send this drone to a new area. Areas are groups of cells, not zones."
      confirmLabel={saving ? 'Sending...' : 'Send drone'}
      confirmDisabled={!valid || saving}
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Assignment is audit-logged."
    >
      <div className="mb-4">
        <label htmlFor="area-label" className="mb-1 block text-sm font-medium">
          Area name
        </label>
        <input
          id="area-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="North gate approach"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="area-col" className="mb-1 block text-sm font-medium">
            Column
          </label>
          <input
            id="area-col"
            type="number"
            min={0}
            max={GRID_COLUMNS - 1}
            value={col}
            onChange={(event) => setCol(event.target.value)}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="area-row" className="mb-1 block text-sm font-medium">
            Row
          </label>
          <input
            id="area-row"
            type="number"
            min={0}
            max={GRID_ROWS - 1}
            value={row}
            onChange={(event) => setRow(event.target.value)}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <section className="mb-4">
        <h3 className="mb-1 text-sm font-medium">Cells this covers</h3>
        {target.length === 0 ? (
          <p className="text-xs text-ink-muted">Enter a valid column and row to see the target cells.</p>
        ) : (
          <>
            <p className="font-mono text-xs text-ink-muted">
              {target.length} cells, {target[0]} to {target[target.length - 1]}
            </p>
            {zoneNamesTouched.length > 0 ? (
              <p className="mt-1 text-xs text-ink-muted">
                Overlaps {zoneNamesTouched.join(', ')}. An area may span zones freely; it never becomes one.
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-muted">This area lies outside every configured zone.</p>
            )}
          </>
        )}
      </section>

      <div className="rounded border border-border bg-surface-sunken p-2 text-xs">
        <p>
          On arrival these cells report not enough dwell for {DWELL_GATE_MS / 1000} seconds before any score appears.
          Density is measured immediately; risk waits for a full window.
        </p>
        {vacating.length > 0 ? (
          <p className="mt-2">
            The {vacating.length} cells being vacated stop being observed and become gaps once nothing has seen them for{' '}
            {STALE_MAX_AGE_MS / 1000} seconds. They are not left showing their last value.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
