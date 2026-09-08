import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StateChip } from '@/components'
import { DRONE_STATE, OBSERVATION_STATE } from '@/domain/constants'
import { DWELL_GATE_MS } from '@/domain/parameters'
import type { CellObservation, Drone } from '@/domain/types'
import { getSentinelClient, useCellsById, useConfigStore, useCurrentRole, useDrone } from '@/store'
import { CAPABILITY, hasCapability } from '@/auth/permissions'
import FootprintMap from './fleet/FootprintMap'
import { footprintStats, formatDuration } from './fleet/droneStats'
import AssignDrone from '@/dialogs/AssignDrone'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-right text-xs">{children}</dd>
    </div>
  )
}

function DwellBar({ dwellMs }: { dwellMs: number }) {
  const pct = Math.min(100, Math.round((dwellMs / DWELL_GATE_MS) * 100))
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded bg-surface-sunken">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono tabular-nums">
        {Math.round(dwellMs / 1000)} s of {DWELL_GATE_MS / 1000} s
      </span>
    </span>
  )
}

function CellRow({ cellId, observation }: { cellId: string; observation: CellObservation }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-1.5 pl-3 pr-3 font-mono text-xs">{cellId}</td>
      <td className="py-1.5 pr-3">
        <StateChip kind="observationState" value={observation.observationState} />
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-xs tabular-nums">
        {observation.observationState === OBSERVATION_STATE.GAP ? (
          <span className="text-ink-muted">-</span>
        ) : (
          observation.densityPerSqM.toFixed(2)
        )}
      </td>
      <td className="py-1.5 pr-3 text-right font-mono text-xs tabular-nums">
        {observation.flow ? (
          `${observation.flow.dirDeg} deg at ${observation.flow.speedMps.toFixed(2)}`
        ) : (
          <span className="text-ink-muted">-</span>
        )}
      </td>
      <td className="py-1.5 pr-3 text-right text-xs">
        {observation.observationState === OBSERVATION_STATE.NOT_ENOUGH_DWELL ? (
          <DwellBar dwellMs={observation.dwellMs} />
        ) : observation.risk ? (
          <span className="font-mono tabular-nums">{observation.risk.score.toFixed(2)}</span>
        ) : (
          <span className="text-ink-muted">No score</span>
        )}
      </td>
    </tr>
  )
}

/**
 * design.md S07 - one drone. Not a video player, and it says so.
 *
 * What the drone "sees" is the wind-map overlay over the cells it is
 * writing to, because the live path carries per-cell summaries and never
 * imagery (FR1.4). A transiting drone contributes density only, and the
 * banner says that in words rather than leaving a viewer to infer it from
 * missing arrows (FR2.3).
 */
export default function S07PerDroneView() {
  const { droneId = '' } = useParams()
  const role = useCurrentRole()
  const drone = useDrone(droneId)
  const cellsById = useCellsById()
  const site = useConfigStore((s) => s.site)
  const [identity, setIdentity] = useState<Drone | null>(null)
  const [assigning, setAssigning] = useState(false)

  const siteId = site?.id ?? ''

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    getSentinelClient()
      .getDrones(siteId)
      .then((list) => {
        if (!cancelled) setIdentity(list.find((d) => d.droneId === droneId) ?? null)
      })
      .catch(() => {
        if (!cancelled) setIdentity(null)
      })
    return () => {
      cancelled = true
    }
  }, [siteId, droneId])


  if (!role) return null

  if (!drone) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Drone not found</h1>
        <p className="mt-2 text-sm text-ink-muted">No drone with the identifier {droneId} is reporting.</p>
        <Link to="/fleet" className="mt-3 inline-block text-sm underline">
          Back to the fleet
        </Link>
      </div>
    )
  }

  const stats = footprintStats(drone, cellsById)
  const transiting = drone.state === DRONE_STATE.TRANSIT
  const canAssign = hasCapability(role, CAPABILITY.ASSIGN_DRONE)
  const rows = drone.footprintCells
    .map((cellId) => ({ cellId, observation: cellsById[cellId] }))
    .filter((row): row is { cellId: string; observation: CellObservation } => Boolean(row.observation))

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{drone.droneId}</h1>
            <p className="text-xs text-ink-muted">
              {identity?.label ?? 'Drone'} - <Link to="/fleet" className="underline">back to the fleet</Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StateChip kind="droneState" value={drone.state} />
            <StateChip kind="droneLink" value={drone.link} />
            {canAssign ? (
              <button
                type="button"
                onClick={() => setAssigning(true)}
                className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Assign
              </button>
            ) : null}
          </div>
        </div>

        {transiting ? (
          <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-sm">
            In transit. Density only. Flow and risk are not produced from a moving camera.
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Footprint</h2>
          <div className="h-72 overflow-hidden rounded border border-border">
            <FootprintMap footprintCells={drone.footprintCells} cellsById={cellsById} className="size-full" />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            The live path carries per-cell summaries only. No imagery is transmitted, stored or displayed anywhere in
            this system.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Telemetry</h2>
          <dl>
            <Field label="Position">
              <span className="font-mono tabular-nums">
                {drone.pose.lat.toFixed(5)}, {drone.pose.lon.toFixed(5)}
              </span>
            </Field>
            <Field label="Altitude">
              <span className="font-mono tabular-nums">{drone.pose.altM.toFixed(1)} m</span>
            </Field>
            <Field label="Heading">
              <span className="font-mono tabular-nums">{drone.pose.headingDeg} deg</span>
            </Field>
            <Field label="Battery">
              <span className="font-mono tabular-nums">{drone.batteryPct}%</span>
            </Field>
            <Field label="Assigned area">{identity?.assignedAreaId ?? 'None'}</Field>
            <Field label="Footprint">
              <span className="font-mono tabular-nums">
                {stats.footprintCellCount} cells, {stats.observedCellCount} observed
              </span>
            </Field>
            <Field label="Longest dwell">
              <span className="font-mono tabular-nums">
                {stats.longestDwellMs === null ? '-' : formatDuration(stats.longestDwellMs)}
              </span>
            </Field>
            <Field label="Estimated people">
              {stats.estimatedPeople === null ? (
                <span className="text-ink-muted">No estimate</span>
              ) : (
                <span className="font-mono tabular-nums">{stats.estimatedPeople.toLocaleString()}</span>
              )}
            </Field>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            The people figure is summed over this drone's observed cells only. Cells still filling their window are not
            counted, so the figure never spans ground that has not been measured.
          </p>

          <h2 className="mt-4 mb-2 text-sm font-semibold">Registration</h2>
          <dl>
            <Field label="Reference frame">
              {drone.registration.referenceFrameLocked ? 'Locked' : 'Searching'}
            </Field>
            <Field label="Inliers">
              <span className="font-mono tabular-nums">{drone.registration.inliers}</span>
            </Field>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">
            Each frame is matched against a saved reference frame of this ground, so movement of the aircraft is
            subtracted before flow is measured. Without it, a drifting drone would read as a moving crowd.
          </p>
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Cells in this footprint</h2>
          <div className="max-h-80 overflow-y-auto rounded border border-border">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-raised text-xs text-ink-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pl-3 font-medium">Cell</th>
                  <th scope="col" className="py-1.5 font-medium">State</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Density</th>
                  <th scope="col" className="py-1.5 text-right font-medium">Flow</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Risk or dwell</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-xs text-ink-muted">
                      This drone is not contributing any cells right now.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <CellRow key={row.cellId} cellId={row.cellId} observation={row.observation} />)
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Cells that have just come under this drone show their progress toward the {DWELL_GATE_MS / 1000} second gate
            and carry no score until it is met.
          </p>
        </section>
      </div>

      <AssignDrone droneId={assigning ? drone.droneId : null} onClose={() => setAssigning(false)} />
    </div>
  )
}
