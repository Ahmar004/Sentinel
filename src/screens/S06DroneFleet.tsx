import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StateChip } from '@/components'
import { DRONE_STATE } from '@/domain/constants'
import type { CellObservation, Drone, DroneUpdate } from '@/domain/types'
import { getSentinelClient, useCellEntries, useConfigStore, useCurrentRole, useDrones } from '@/store'
import { CAPABILITY, hasCapability } from '@/auth/permissions'
import FootprintMap from './fleet/FootprintMap'
import { footprintStats, formatDuration, overlappingCells } from './fleet/droneStats'
import AssignDrone from '@/dialogs/AssignDrone'

type Tab = 'fleet' | 'feeds'

const TABS: { id: Tab; label: string }[] = [
  { id: 'fleet', label: 'Fleet list' },
  { id: 'feeds', label: 'Combined feeds' },
]

type Cells = Readonly<Record<string, CellObservation>>

function DroneCard({
  drone,
  label,
  areaId,
  cellsById,
  canAssign,
  onAssign,
}: {
  drone: DroneUpdate
  label: string
  areaId: string | null
  cellsById: Cells
  canAssign: boolean
  onAssign: (droneId: string) => void
}) {
  const stats = footprintStats(drone, cellsById)
  const transiting = drone.state === DRONE_STATE.TRANSIT

  return (
    <li className="flex flex-col gap-2 rounded border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">
            <Link to={`/fleet/${drone.droneId}`} className="underline">
              {drone.droneId}
            </Link>
          </h3>
          <p className="text-xs text-ink-muted">{label}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StateChip kind="droneState" value={drone.state} />
          <StateChip kind="droneLink" value={drone.link} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Battery</dt>
          <dd className="font-mono tabular-nums">{drone.batteryPct}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Footprint</dt>
          <dd className="font-mono tabular-nums">{stats.footprintCellCount} cells</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Observed</dt>
          <dd className="font-mono tabular-nums">{stats.observedCellCount} cells</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Dwell</dt>
          <dd className="font-mono tabular-nums">
            {stats.longestDwellMs === null ? '-' : formatDuration(stats.longestDwellMs)}
          </dd>
        </div>
        <div className="col-span-2 flex justify-between">
          <dt className="text-ink-muted">Assigned area</dt>
          <dd className="font-mono">{areaId ?? 'None'}</dd>
        </div>
      </dl>

      {transiting ? (
        <p className="rounded border border-border bg-surface-sunken p-2 text-xs">
          In transit. Density only. Flow and risk are not produced from a moving camera.
        </p>
      ) : null}

      {canAssign ? (
        <button
          type="button"
          onClick={() => onAssign(drone.droneId)}
          className="self-start rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Assign
        </button>
      ) : null}
    </li>
  )
}

/**
 * design.md S06 - the fleet, and the proposal's named combined-feeds view.
 *
 * Combined feeds is not a video wall. The live path carries small per-cell
 * summaries and never imagery, so each panel draws the wind-map overlay
 * over that drone's footprint cells. The tab says so in words, because the
 * fastest way to lose the defence is a screen that implies a capability the
 * project ruled out (SRS 2.6).
 *
 * Identity fields that do not change tick to tick - label, assigned area -
 * come from `getDrones`; state, pose and footprint come from the 1 Hz feed
 * through the store. Neither is derived from the other.
 */
export default function S06DroneFleet() {
  const role = useCurrentRole()
  const drones = useDrones()
  const cellEntries = useCellEntries()
  const zones = useConfigStore((s) => s.zones)
  const site = useConfigStore((s) => s.site)
  const [tab, setTab] = useState<Tab>('fleet')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [fleet, setFleet] = useState<Drone[]>([])

  const siteId = site?.id ?? ''

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    getSentinelClient()
      .getDrones(siteId)
      .then((list) => {
        if (!cancelled) setFleet(list)
      })
      .catch(() => {
        if (!cancelled) setFleet([])
      })
    return () => {
      cancelled = true
    }
  }, [siteId])

  const cellsById: Cells = useMemo(() => Object.fromEntries(cellEntries), [cellEntries])
  const overlap = useMemo(() => overlappingCells(drones), [drones])
  const identityById = useMemo(() => new Map(fleet.map((d) => [d.droneId, d])), [fleet])

  if (!role) return null
  const canAssign = hasCapability(role, CAPABILITY.ASSIGN_DRONE)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Drone fleet</h1>
        <p className="mt-1 text-sm">
          <span className="font-mono tabular-nums">{drones.length}</span> drones over{' '}
          <span className="font-mono tabular-nums">{zones.length}</span> zones.
        </p>
        {/* FR9.8 stated rather than left to be inferred from the mismatched
            counts sitting next to each other. */}
        <p className="mt-1 text-xs text-ink-muted">
          Drones are not assigned to zones. Every measurement belongs to a cell, which is what lets a drone move without
          any measurement moving with it. The counts differ on purpose.
        </p>

        <div role="tablist" aria-label="Fleet views" className="mt-3 flex gap-1 border-b border-border">
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
      </header>

      {drones.length === 0 ? (
        <p className="p-4 text-sm text-ink-muted">No drones are reporting. The fleet appears here once the feed connects.</p>
      ) : tab === 'fleet' ? (
        <ul className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {drones.map((drone) => {
            const identity = identityById.get(drone.droneId)
            return (
              <DroneCard
                key={drone.droneId}
                drone={drone}
                label={identity?.label ?? 'Drone'}
                areaId={identity?.assignedAreaId ?? null}
                cellsById={cellsById}
                canAssign={canAssign}
                onAssign={setAssigning}
              />
            )
          })}
        </ul>
      ) : (
        <div className="p-4">
          <p className="mb-3 rounded border border-border bg-surface-sunken p-2 text-xs">
            Views are placed by coordinates on the shared grid. Images are never stitched.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drones.map((drone) => {
              const stats = footprintStats(drone, cellsById)
              const shared = drone.footprintCells.filter((c) => overlap.has(c))
              return (
                <figure key={drone.droneId} className="rounded border border-border">
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
                    <Link to={`/fleet/${drone.droneId}`} className="text-sm font-medium underline">
                      {drone.droneId}
                    </Link>
                    <span className="flex gap-1">
                      <StateChip kind="droneState" value={drone.state} />
                      <StateChip kind="droneLink" value={drone.link} />
                    </span>
                  </figcaption>
                  <FootprintMap footprintCells={drone.footprintCells} cellsById={cellsById} className="h-48 w-full" />
                  <p className="px-2 py-1.5 text-xs text-ink-muted">
                    {stats.footprintCellCount} cells, {stats.observedCellCount} observed
                    {stats.longestDwellMs !== null ? `, dwell ${formatDuration(stats.longestDwellMs)}` : ''}
                  </p>
                  {shared.length > 0 ? (
                    <p className="border-t border-border px-2 py-1.5 text-xs">
                      {shared.length} {shared.length === 1 ? 'cell is' : 'cells are'} also observed by another drone.
                      Both write to the same cell record, which is what fusion by coordinates means.
                    </p>
                  ) : null}
                </figure>
              )
            })}
          </div>
        </div>
      )}

      <AssignDrone droneId={assigning} onClose={() => setAssigning(null)} />
    </div>
  )
}
