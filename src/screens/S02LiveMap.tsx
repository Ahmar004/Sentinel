import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CellLayer, ConnectionBanner, Legend, SiteMap, type CellGridEntry } from '@/components'
import { CONNECTION_STATE } from '@/domain/constants'
import { CELL_SIZE_M, SITE_EXTENT_M, parseCellId } from '@/domain/parameters'
import {
  getSentinelClient,
  useAlerts,
  useCellEntries,
  useConfigStore,
  useConnectionState,
  useCurrentRole,
  useDrones,
  useSuggestions,
  useZones,
} from '@/store'
import AlertRail from './live/AlertRail'
import DroneMarkers from './live/DroneMarkers'
import ZoneStrip from './live/ZoneStrip'
import { summariseZones } from './live/zoneSummary'
import CellInspector from '@/dialogs/CellInspector'
import ConfirmSuggestion from '@/dialogs/ConfirmSuggestion'
import DismissSuggestion from '@/dialogs/DismissSuggestion'
import { CAPABILITY, hasCapability } from '@/auth/permissions'

/**
 * design.md S02 - the live site map, and the screen the proposal defence
 * opens on.
 *
 * Composition only: every value on screen arrives through a store selector
 * fed by the 1 Hz push feed, and nothing here generates, polls or smooths
 * data. Cell appearance is decided in `CellLayer` (C02) alone, so this
 * screen cannot invent a treatment, and zone risk always travels with its
 * coverage through `ZoneStrip`.
 */
export default function S02LiveMap() {
  const role = useCurrentRole()
  const cellEntries = useCellEntries()
  const zoneUpdates = useZones()
  const drones = useDrones()
  const alerts = useAlerts()
  const suggestions = useSuggestions()
  const connectionState = useConnectionState()
  const site = useConfigStore((s) => s.site)
  const configuredZones = useConfigStore((s) => s.zones)

  const [inspectedCellId, setInspectedCellId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // FR7.7: confirming is a deliberate human step, so acting on an option
  // opens D02 rather than calling the client from the rail card.
  const [confirming, setConfirming] = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const offline = connectionState === CONNECTION_STATE.DISCONNECTED

  const cells: CellGridEntry[] = useMemo(() => {
    const entries: CellGridEntry[] = []
    for (const [cellId, observation] of cellEntries) {
      const parsed = parseCellId(cellId)
      if (!parsed) continue
      entries.push({ cellId, col: parsed.col, row: parsed.row, observation })
    }
    return entries
  }, [cellEntries])

  const zoneSummaries = useMemo(() => {
    const updatesById = Object.fromEntries(zoneUpdates.map((z) => [z.zoneId, z]))
    const cellsById = Object.fromEntries(cellEntries)
    return summariseZones(configuredZones, updatesById, cellsById)
  }, [configuredZones, zoneUpdates, cellEntries])

  const zoneNamesById = useMemo(
    () => Object.fromEntries(configuredZones.map((z) => [z.zoneId, z.name])),
    [configuredZones],
  )

  if (!role) return null

  const canOpenZoneDetail = hasCapability(role, CAPABILITY.VIEW_HISTORY_AND_REPLAY)
  const openAlertCount = alerts.length

  const rail = (
    <AlertRail
      alerts={alerts}
      suggestions={suggestions}
      zoneNamesById={zoneNamesById}
      role={role}
      offline={offline}
      onAcknowledge={(alertId) => {
        void getSentinelClient().acknowledgeAlert(alertId)
      }}
      onConfirmSuggestion={setConfirming}
      onDismissSuggestion={setDismissing}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConnectionBanner state={connectionState} />

      {/* Mobile: the zone strip sits at the top, where a coordinator
          glances first. Desktop moves it below the map (see the second
          instance), so the map keeps the largest area. */}
      <div className="shrink-0 border-b border-border md:hidden">
        <ZoneStrip zones={zoneSummaries} linkToDetail={canOpenZoneDetail} />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <SiteMap
              planImageUrl={site?.planImageUrl ?? '/riverside-arena-plan.svg'}
              groundExtentM={site?.groundExtentM ?? SITE_EXTENT_M}
            >
              <CellLayer cells={cells} cellSizeM={CELL_SIZE_M} onCellClick={setInspectedCellId} />
              <DroneMarkers drones={drones} />
            </SiteMap>
            <div className="pointer-events-none absolute bottom-2 left-2 z-[400] max-w-[min(20rem,calc(100%-1rem))]">
              <div className="pointer-events-auto rounded border border-border bg-surface-raised/95 p-2">
                <Legend />
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 border-t border-border md:block">
            <ZoneStrip zones={zoneSummaries} linkToDetail={canOpenZoneDetail} />
          </div>
        </div>

        {/* Desktop: a persistent 360px rail. A coordinator must never have
            to open something to find out an alert is live. */}
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-border md:block">
          <h2 className="border-b border-border px-3 py-2 text-xs font-semibold tracking-wide uppercase">
            Alerts ({openAlertCount})
          </h2>
          {rail}
        </aside>
      </div>

      {/* Mobile: the same rail as a bottom sheet with a count badge. */}
      <div className="shrink-0 border-t border-border md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
          className="flex w-full items-center justify-between px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="font-medium">Alerts</span>
          <span className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs tabular-nums">{openAlertCount}</span>
            {sheetOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
          </span>
        </button>
        {sheetOpen ? <div className="max-h-[50vh] overflow-y-auto border-t border-border">{rail}</div> : null}
      </div>

      {toast ? (
        <p role="status" className="shrink-0 border-t border-border bg-surface-raised px-4 py-2 text-xs">
          {toast}
        </p>
      ) : null}

      <CellInspector cellId={inspectedCellId} onClose={() => setInspectedCellId(null)} />
      <ConfirmSuggestion
        suggestion={suggestions.find((s) => s.suggestionId === confirming) ?? null}
        onClose={() => setConfirming(null)}
        onConfirmed={setToast}
      />
      <DismissSuggestion
        suggestion={suggestions.find((s) => s.suggestionId === dismissing) ?? null}
        onClose={() => setDismissing(null)}
        onDismissed={setToast}
      />
    </div>
  )
}
