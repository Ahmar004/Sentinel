import { useEffect, useState } from 'react'
import { CellLayer, SiteMap, type CellGridEntry } from '@/components'
import { OBSERVATION_STATE } from '@/domain/constants'
import {
  CELL_SIZE_M,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_DENSITY_THRESHOLD_PER_SQM,
  MAX_ZONES,
  MIN_ZONES,
  SITE_EXTENT_M,
  formatCellId,
  parseCellId,
} from '@/domain/parameters'
import type { CellObservation, Drone, Exit, SetupProposal, Zone } from '@/domain/types'
import { getSentinelClient, useCellsById, useConfigStore, useDrones } from '@/store'

/** Every step reports whether it has unsaved edits, so the wizard and the
 * configuration tabs can both raise D10 without each tracking it. */
export interface StepProps {
  onDirtyChange?: (dirty: boolean) => void
  onSaved?: (message: string) => void
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 rounded border border-border bg-surface-sunken p-2 text-xs">{children}</p>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 1 - Site plan (FR9.1)                                        */
/* --------------------------------------------------------------- */

export function PlanStep() {
  const site = useConfigStore((s) => s.site)
  const extent = site?.groundExtentM ?? SITE_EXTENT_M

  return (
    <div>
      <h3 className="text-sm font-semibold">Site plan</h3>
      <p className="mt-1 text-sm text-ink-muted">
        The plan image is the ground everything else is measured against. Its extent sets the scale, drawn once by
        marking a known distance across the site.
      </p>

      <dl className="mt-3">
        <Row label="Plan image">
          <span className="font-mono text-xs">{site?.planImageUrl ?? '/jamarat-satellite.svg'}</span>
        </Row>
        <Row label="Ground extent">
          <span className="font-mono text-xs tabular-nums">
            {extent.width} m by {extent.height} m
          </span>
        </Row>
        <Row label="Scale reference">
          <span className="text-xs">50 m across the south stand</span>
        </Row>
      </dl>

      <div className="mt-3 h-64 overflow-hidden rounded border border-border">
        <SiteMap planImageUrl={site?.planImageUrl ?? '/jamarat-satellite.svg'} groundExtentM={extent} />
      </div>

      <Note>
        The plan is a static image the administrator uploads. No map tile provider is used anywhere in this system, so
        nothing here needs an API key or a paid account.
      </Note>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 2 - Grid (FR9.2)                                             */
/* --------------------------------------------------------------- */

export function GridStep({ onRequestRegenerate }: StepProps & { onRequestRegenerate?: (cellSizeM: number) => void }) {
  const grid = useConfigStore((s) => s.grid)
  const site = useConfigStore((s) => s.site)
  const extent = site?.groundExtentM ?? SITE_EXTENT_M
  const [cellSize, setCellSize] = useState(String(grid?.cellSizeM ?? CELL_SIZE_M))

  const size = Number(cellSize)
  const valid = Number.isFinite(size) && size > 0
  const cols = valid ? Math.floor(extent.width / size) : 0
  const rows = valid ? Math.floor(extent.height / size) : 0
  const changed = valid && size !== (grid?.cellSizeM ?? CELL_SIZE_M)

  return (
    <div>
      <h3 className="text-sm font-semibold">Grid</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Cell size decides the resolution of every measurement in the system. Every density, flow and risk value belongs
        to one of these cells.
      </p>

      <div className="mt-3">
        <label htmlFor="grid-cell-size" className="mb-1 block text-sm font-medium">
          Cell size, metres
        </label>
        <input
          id="grid-cell-size"
          type="number"
          min={1}
          max={25}
          step={1}
          value={cellSize}
          onChange={(event) => setCellSize(event.target.value)}
          className="w-40 rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <dl className="mt-3">
        <Row label="Grid">
          <span className="font-mono text-xs tabular-nums">
            {cols} columns by {rows} rows
          </span>
        </Row>
        <Row label="Cells">
          <span className="font-mono text-xs tabular-nums">{(cols * rows).toLocaleString()}</span>
        </Row>
        <Row label="Cell area">
          <span className="font-mono text-xs tabular-nums">{valid ? (size * size).toFixed(0) : '-'} square metres</span>
        </Row>
        <Row label="First and last cell">
          <span className="font-mono text-xs">
            {cols > 0 && rows > 0 ? `${formatCellId(0, 0)} to ${formatCellId(cols - 1, rows - 1)}` : '-'}
          </span>
        </Row>
      </dl>

      <Note>
        A {CELL_SIZE_M} metre cell holds roughly 100 to 150 people at stampede-level density: fine enough to resolve a
        bottleneck, coarse enough that a density estimate over it means something.
      </Note>

      {changed ? (
        <button
          type="button"
          onClick={() => onRequestRegenerate?.(size)}
          className="mt-3 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Regenerate the grid
        </button>
      ) : null}
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 3 - Proposals (FR9.3)                                        */
/* --------------------------------------------------------------- */

export function ProposalsStep({ onSaved }: StepProps) {
  const site = useConfigStore((s) => s.site)
  const [proposals, setProposals] = useState<SetupProposal[] | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const siteId = site?.id ?? ''

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    getSentinelClient()
      .getSetupProposals(siteId)
      .then((list) => {
        if (!cancelled) setProposals(list)
      })
      .catch(() => {
        if (!cancelled) setProposals([])
      })
    return () => {
      cancelled = true
    }
  }, [siteId, reloadKey])

  const resolve = async (proposal: SetupProposal, decision: 'ACCEPT' | 'REJECT') => {
    await getSentinelClient().resolveSetupProposal(proposal.proposalId, { decision })
    onSaved?.(`Proposal ${proposal.proposalId} ${decision === 'ACCEPT' ? 'accepted' : 'rejected'}.`)
    setReloadKey((k) => k + 1)
  }

  const unreviewed = (proposals ?? []).filter((p) => p.status === 'PENDING')

  return (
    <div>
      <h3 className="text-sm font-semibold">Setup pass proposals</h3>
      <p className="mt-1 text-sm text-ink-muted">
        A one-off pass over the plan suggests where exits, barriers and obstructions are. Each suggestion is reviewed
        individually.
      </p>

      <Note>
        This step can be skipped entirely and the next step still completes the configuration. Manual annotation is the
        guaranteed path; the setup pass only pre-fills it. A venue with no proposals at all still reaches a fully
        configured site.
      </Note>

      {proposals === null ? (
        <p className="mt-3 text-sm text-ink-muted">Loading proposals.</p>
      ) : proposals.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No proposals. Move to the next step and mark attributes by hand.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-ink-muted">
            {unreviewed.length} of {proposals.length} still to review.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {proposals.map((proposal) => (
              <li key={proposal.proposalId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
                <span className="text-xs">
                  <span className="font-mono">{proposal.proposalId}</span> - {proposal.proposedAttribute.toLowerCase()},{' '}
                  {proposal.cellIds.length} cells, confidence {(proposal.confidence * 100).toFixed(0)}%
                </span>
                {proposal.status === 'PENDING' ? (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void resolve(proposal, 'ACCEPT')}
                      className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolve(proposal, 'REJECT')}
                      className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      Reject
                    </button>
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">{proposal.status.toLowerCase()}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 4 - Attributes (FR9.4)                                       */
/* --------------------------------------------------------------- */

const ATTRIBUTES = [
  { id: 'walkable', label: 'Walkable' },
  { id: 'isExit', label: 'Exit' },
  { id: 'isBarrier', label: 'Barrier' },
  { id: 'isObstruction', label: 'Obstruction' },
] as const

export function AttributesStep({ onSaved }: StepProps) {
  const site = useConfigStore((s) => s.site)
  const patchCellAttributes = useConfigStore((s) => s.patchCellAttributes)
  const [attribute, setAttribute] = useState<(typeof ATTRIBUTES)[number]['id']>('walkable')
  const [cellId, setCellId] = useState('')

  const valid = parseCellId(cellId.trim()) !== null

  const apply = async () => {
    if (!site || !valid) return
    await patchCellAttributes(site.id, cellId.trim(), { [attribute]: true })
    onSaved?.(`${cellId.trim()} marked ${attribute}.`)
    setCellId('')
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Cell attributes</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Static facts about the ground that never change tick to tick: whether a cell can be walked on, whether it is an
        exit, a barrier or an obstruction.
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {ATTRIBUTES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAttribute(a.id)}
            aria-pressed={attribute === a.id}
            className={`rounded border px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              attribute === a.id ? 'border-accent bg-surface-sunken' : 'border-border'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void apply()
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div>
          <label htmlFor="attr-cell" className="mb-1 block text-sm font-medium">
            Cell
          </label>
          <input
            id="attr-cell"
            value={cellId}
            onChange={(event) => setCellId(event.target.value)}
            placeholder={formatCellId(31, 22)}
            className="w-40 rounded border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          Mark {ATTRIBUTES.find((a) => a.id === attribute)?.label.toLowerCase()}
        </button>
      </form>

      <Note>
        Marking attributes by hand is the guaranteed path to a configured venue. The setup pass in the previous step
        only saves time; skipping it entirely changes nothing about what can be configured here.
      </Note>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 5 - Exits (FR9.5)                                            */
/* --------------------------------------------------------------- */

export function ExitsStep({ onSaved }: StepProps) {
  const exits = useConfigStore((s) => s.exits)
  const site = useConfigStore((s) => s.site)
  const putExits = useConfigStore((s) => s.putExits)
  const [draft, setDraft] = useState<Exit[]>([])
  const [saving, setSaving] = useState(false)

  const current = draft.length > 0 ? draft : exits

  const setCapacity = (exitId: string, capacityPerMin: number) => {
    setDraft(current.map((e) => (e.exitId === exitId ? { ...e, capacityPerMin } : e)))
  }

  const save = async () => {
    if (!site) return
    setSaving(true)
    await putExits(
      site.id,
      current.map(({ exitId, cellIds, capacityPerMin, label }) => ({ exitId, cellIds, capacityPerMin, label })),
    )
    onSaved?.('Exit capacities saved.')
    setDraft([])
    setSaving(false)
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Exits</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Exit cells grouped into named exits, each with a capacity in people per minute. The ranker measures throughput
        against these figures, so a route is never suggested through an exit already at capacity.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {current.map((exit) => (
          <li key={exit.exitId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
            <span className="text-sm">
              {exit.label} <span className="text-xs text-ink-muted">({exit.cellIds.length} cells)</span>
            </span>
            <label className="flex items-center gap-2 text-xs">
              Capacity per minute
              <input
                type="number"
                min={1}
                step={10}
                value={exit.capacityPerMin}
                onChange={(event) => setCapacity(exit.exitId, Number(event.target.value))}
                className="w-28 rounded border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-accent"
              />
            </label>
          </li>
        ))}
      </ul>

      {current.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No exits are defined yet. Mark exit cells in the attributes step first.</p>
      ) : (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || draft.length === 0}
          className="mt-3 rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {saving ? 'Saving...' : 'Save capacities'}
        </button>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 6 - Zones (FR9.6, FR6.5)                                     */
/* --------------------------------------------------------------- */

export function ZonesStep({ onSaved }: StepProps) {
  const zones = useConfigStore((s) => s.zones)
  const site = useConfigStore((s) => s.site)
  const saveZone = useConfigStore((s) => s.saveZone)
  const deleteZone = useConfigStore((s) => s.deleteZone)
  const [name, setName] = useState('')

  const atLimit = zones.length >= MAX_ZONES
  const belowMinimum = zones.length < MIN_ZONES

  const add = async () => {
    if (!site || atLimit || name.trim().length === 0) return
    await saveZone(site.id, {
      zoneId: `zone-${Date.now()}`,
      name: name.trim(),
      cellIds: [],
      riskThreshold: DEFAULT_ALERT_THRESHOLD,
      densityThreshold: DEFAULT_DENSITY_THRESHOLD_PER_SQM,
    })
    onSaved?.(`Zone ${name.trim()} created.`)
    setName('')
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Zones</h3>
      <p className="mt-1 text-sm text-ink-muted">
        A zone is a named group of cells, used for display, alerting and reporting. It is a presentation layer over the
        grid, never a place a measurement is stored.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {zones.map((zone: Zone) => (
          <li key={zone.zoneId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
            <span className="text-sm">
              {zone.name} <span className="text-xs text-ink-muted">({zone.cellIds.length} cells)</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (!site) return
                void deleteZone(site.id, zone.zoneId).then(() => onSaved?.(`Zone ${zone.name} deleted.`))
              }}
              disabled={zones.length <= MIN_ZONES}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div>
          <label htmlFor="zone-name" className="mb-1 block text-sm font-medium">
            New zone name
          </label>
          <input
            id="zone-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={atLimit}
            className="w-56 rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={atLimit || name.trim().length === 0}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          Add zone
        </button>
      </form>

      {/* FR6.5. The limit is stated inline rather than only enforced, so an
          administrator who wonders why the control is disabled reads the
          answer instead of assuming a bug. */}
      <Note>
        A site holds between {MIN_ZONES} and {MAX_ZONES} zones. That is the validated scope of this system, so there is
        no control to add a fifth.
        {atLimit ? ' The limit has been reached, which is why adding is disabled.' : ''}
        {belowMinimum ? ` At least ${MIN_ZONES} zones are needed before the site is complete.` : ''}
      </Note>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 7 - Thresholds (FR9.7)                                       */
/* --------------------------------------------------------------- */

export function ThresholdsStep({ onEdit }: StepProps & { onEdit?: (zoneId: string) => void }) {
  const zones = useConfigStore((s) => s.zones)
  const thresholds = useConfigStore((s) => s.thresholds)

  return (
    <div>
      <h3 className="text-sm font-semibold">Thresholds</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Per-zone risk and density thresholds, editable here with no code change and no restart.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {zones.map((zone) => {
          const threshold = thresholds.find((t) => t.zoneId === zone.zoneId)
          return (
            <li key={zone.zoneId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
              <span className="text-sm">{zone.name}</span>
              <span className="flex items-center gap-4 text-xs">
                <span className="font-mono tabular-nums">
                  risk {(threshold?.riskThreshold ?? zone.riskThreshold).toFixed(2)}
                </span>
                <span className="font-mono tabular-nums">
                  density {(threshold?.densityThreshold ?? zone.densityThreshold).toFixed(1)} per sq m
                </span>
                <button
                  type="button"
                  onClick={() => onEdit?.(zone.zoneId)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Edit
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <Note>
        Defaults are a risk threshold of {DEFAULT_ALERT_THRESHOLD.toFixed(2)}, the boundary of the elevated band, and a
        density threshold of {DEFAULT_DENSITY_THRESHOLD_PER_SQM.toFixed(1)} people per square metre, since
        stampede-level density on a {CELL_SIZE_M} metre cell is roughly 4 to 6.
      </Note>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Step 8 - Drones (FR9.8)                                           */
/* --------------------------------------------------------------- */

export function DronesStep({ onAssign }: StepProps & { onAssign?: (droneId: string) => void }) {
  const drones = useDrones()
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)
  const zoneNameFor = (zoneId: string | null) =>
    zoneId ? (zones.find((z) => z.zoneId === zoneId)?.name ?? zoneId) : 'No zone'
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

  return (
    <div>
      <h3 className="text-sm font-semibold">Drones</h3>
      <p className="mt-1 text-sm text-ink-muted">
        Registered drones and the zone each was last sent to. A drone is sent to a zone but never bound to one: its
        membership is computed from the cells it actually sees.
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {drones.map((drone) => {
          const identity = fleet.find((d) => d.droneId === drone.droneId)
          return (
            <li key={drone.droneId} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-2">
              <span className="text-sm">
                <span className="font-mono">{drone.droneId}</span>{' '}
                <span className="text-xs text-ink-muted">{identity?.label ?? ''}</span>
              </span>
              <span className="flex items-center gap-3 text-xs">
                <span>{zoneNameFor(identity?.assignedZoneId ?? null)}</span>
                <button
                  type="button"
                  onClick={() => onAssign?.(drone.droneId)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Assign
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <Note>
        The drone count and the zone count are unrelated on purpose. Measurements belong to cells, so the fleet can move
        without any measurement moving with it.
      </Note>
    </div>
  )
}

/* --------------------------------------------------------------- */
/* Review                                                            */
/* --------------------------------------------------------------- */

export function ReviewStep({ onSave }: { onSave?: () => void }) {
  const site = useConfigStore((s) => s.site)
  const grid = useConfigStore((s) => s.grid)
  const zones = useConfigStore((s) => s.zones)
  const exits = useConfigStore((s) => s.exits)
  const drones = useDrones()
  const cellsById = useCellsById()

  const entries = Object.entries(cellsById)
  const observed = entries.filter(
    ([, cell]: [string, CellObservation]) => cell.observationState === OBSERVATION_STATE.OBSERVED,
  ).length

  const preview: CellGridEntry[] = entries.slice(0, 400).flatMap(([cellId, observation]) => {
    const parsed = parseCellId(cellId)
    return parsed ? [{ cellId, col: parsed.col, row: parsed.row, observation }] : []
  })

  return (
    <div>
      <h3 className="text-sm font-semibold">Review</h3>
      <p className="mt-1 text-sm text-ink-muted">Everything configured above, before it is saved.</p>

      <dl className="mt-3">
        <Row label="Site">{site?.name ?? '-'}</Row>
        <Row label="Grid">
          <span className="font-mono text-xs tabular-nums">
            {grid ? `${grid.cols} by ${grid.rows}, ${grid.cellSizeM} m cells` : '-'}
          </span>
        </Row>
        <Row label="Zones">
          <span className="font-mono text-xs tabular-nums">{zones.length}</span>
        </Row>
        <Row label="Exits">
          <span className="font-mono text-xs tabular-nums">{exits.length}</span>
        </Row>
        <Row label="Drones">
          <span className="font-mono text-xs tabular-nums">{drones.length}</span>
        </Row>
        <Row label="Cells currently observed">
          <span className="font-mono text-xs tabular-nums">{observed}</span>
        </Row>
      </dl>

      <div className="mt-3 h-64 overflow-hidden rounded border border-border">
        <SiteMap
          planImageUrl={site?.planImageUrl ?? '/jamarat-satellite.svg'}
          groundExtentM={site?.groundExtentM ?? SITE_EXTENT_M}
        >
          <CellLayer cells={preview} cellSizeM={grid?.cellSizeM ?? CELL_SIZE_M} />
        </SiteMap>
      </div>

      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          className="mt-3 rounded bg-accent px-3 py-2 text-sm font-medium text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          Save configuration
        </button>
      ) : null}

      <Note>Every save is versioned and written to the audit log with its previous and new value.</Note>
    </div>
  )
}
