import { useState } from 'react'
import { Dialog } from '@/components'
import { DWELL_GATE_MS, STALE_MAX_AGE_MS } from '@/domain/parameters'
import { getSentinelClient, useConfigStore, useDrone } from '@/store'

export interface AssignDroneProps {
  droneId: string | null
  onClose: () => void
  onAssigned?: (message: string) => void
}

/**
 * design.md D07 - send a drone to a zone (FR9.8).
 *
 * The target is chosen from the zones actually configured for this
 * environment, because zones are its named subdivisions and there is
 * nothing else meaningful to send a drone to. A free-text target would let
 * an operator name somewhere that does not exist.
 *
 * Sending a drone to a zone does not bind it to that zone. It keeps
 * writing to whatever cells it actually sees, and its zone membership
 * stays computed from its footprint, which is what lets the fleet move
 * without any measurement moving with it. The dialog says so, because the
 * dropdown could easily suggest otherwise.
 *
 * It also states both consequences of moving before it is confirmed: the
 * cells being left age into gaps (FR6.3), and the cells being arrived at
 * report not enough dwell for thirty seconds before any score appears
 * (FR4.2). Neither is a fault, and neither should surprise a coordinator
 * watching the map a moment later.
 */
export default function AssignDrone({ droneId, onClose, onAssigned }: AssignDroneProps) {
  const drone = useDrone(droneId ?? '')
  const zones = useConfigStore((s) => s.zones)

  const [chosenZoneId, setChosenZoneId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Falls back to the first configured zone rather than defaulting through
  // an effect: the selection is derivable from what is loaded, so writing
  // it into state would only add a render nobody needs.
  const zoneId = chosenZoneId || zones[0]?.zoneId || ''
  const target = zones.find((z) => z.zoneId === zoneId)
  const valid = target !== undefined
  const leaving = drone?.footprintCells ?? []

  const submit = async () => {
    if (!droneId || !target) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().assignDrone(droneId, { zoneId: target.zoneId })
      onAssigned?.(`${droneId} sent to ${target.name}.`)
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
      description="Send this drone to one of the zones this environment is divided into."
      confirmLabel={saving ? 'Sending...' : 'Send drone'}
      confirmDisabled={!valid || saving}
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Assignment is audit-logged."
    >
      <div className="mb-4">
        <label htmlFor="assign-zone" className="mb-1 block text-sm font-medium">
          Zone
        </label>
        <select
          id="assign-zone"
          value={zoneId}
          onChange={(event) => setChosenZoneId(event.target.value)}
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {zones.length === 0 ? <option value="">No zones are configured</option> : null}
          {zones.map((zone) => (
            <option key={zone.zoneId} value={zone.zoneId}>
              {zone.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          Only zones configured for this environment can be chosen. An administrator defines them in venue setup.
        </p>
      </div>

      {target ? (
        <p className="mb-4 text-xs text-ink-muted">
          {target.name} covers <span className="font-mono tabular-nums">{target.cellIds.length}</span> cells. The drone
          will observe a patch of them at a time, not all of them at once.
        </p>
      ) : null}

      <div className="rounded border border-border bg-surface-sunken p-2 text-xs">
        <p>
          Sending a drone to a zone does not bind it to that zone. It writes to whichever cells it actually sees, and
          its zone membership is computed from its footprint moment to moment.
        </p>
        <p className="mt-2">
          On arrival its cells report not enough dwell for {DWELL_GATE_MS / 1000} seconds before any score appears.
          Density is measured immediately; risk waits for a full window.
        </p>
        {leaving.length > 0 ? (
          <p className="mt-2">
            The {leaving.length} cells it is leaving stop being observed and become gaps once nothing has seen them for{' '}
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
