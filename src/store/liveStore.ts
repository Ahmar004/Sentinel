import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { CONNECTION_STATE, type ConnectionState } from '@/domain/constants'
import { GAP_CELL, toCellObservation } from '@/domain/cellObservation'
import type {
  Alert,
  CellObservation,
  CellUpdate,
  DroneUpdate,
  LiveChannel,
  LiveMessage,
  SuggestionOption,
  Unsubscribe,
  ZoneUpdate,
} from '@/domain/types'
import { getSentinelClient } from './clientRegistry'

export interface LiveState {
  cells: Record<string, CellObservation>
  zones: Record<string, ZoneUpdate>
  drones: Record<string, DroneUpdate>
  alerts: Record<string, Alert>
  suggestions: Record<string, SuggestionOption>
  connectionState: ConnectionState
}

/**
 * The push-driven cell, zone, drone, alert and suggestion state - CLAUDE.md
 * "Live means live". `create` is intentionally not exported: the only way
 * to change this state is `connectLiveStore`'s subscription below. Every
 * other consumer reads through the selector hooks at the bottom of this
 * file, never through a raw `setState`.
 */
const useLiveStoreInternal = create<LiveState>(() => ({
  cells: {},
  zones: {},
  drones: {},
  alerts: {},
  suggestions: {},
  connectionState: CONNECTION_STATE.CONNECTING,
}))

let unsubscribers: Unsubscribe[] = []

function safeToCellObservation(update: CellUpdate): CellObservation {
  try {
    return toCellObservation(update)
  } catch (err) {
    // A malformed tick must never render as a guess. Log it and show the
    // cell as GAP, which is always an honest thing to display.
    console.error(`Malformed cell update for ${update.cellId}, showing as GAP.`, err)
    return GAP_CELL
  }
}

function applyMessage(msg: LiveMessage): void {
  switch (msg.type) {
    case 'snapshot': {
      const cells: Record<string, CellObservation> = {}
      for (const cell of msg.payload.cells) cells[cell.cellId] = safeToCellObservation(cell)
      const zones: Record<string, ZoneUpdate> = {}
      for (const zone of msg.payload.zones) zones[zone.zoneId] = zone
      const drones: Record<string, DroneUpdate> = {}
      for (const drone of msg.payload.drones) drones[drone.droneId] = drone
      useLiveStoreInternal.setState({ cells, zones, drones })
      return
    }
    case 'cell.batch': {
      useLiveStoreInternal.setState((state) => {
        const cells = { ...state.cells }
        for (const cell of msg.payload) cells[cell.cellId] = safeToCellObservation(cell)
        return { cells }
      })
      return
    }
    case 'zone.update': {
      useLiveStoreInternal.setState((state) => ({
        zones: { ...state.zones, [msg.payload.zoneId]: msg.payload },
      }))
      return
    }
    case 'drone.update': {
      useLiveStoreInternal.setState((state) => ({
        drones: { ...state.drones, [msg.payload.droneId]: msg.payload },
      }))
      return
    }
    case 'alert.raised':
    case 'alert.updated':
    case 'alert.cleared': {
      useLiveStoreInternal.setState((state) => ({
        alerts: { ...state.alerts, [msg.payload.alertId]: msg.payload },
      }))
      return
    }
    case 'suggestion.created':
    case 'suggestion.updated': {
      useLiveStoreInternal.setState((state) => {
        const suggestions = { ...state.suggestions }
        for (const suggestion of msg.payload) suggestions[suggestion.suggestionId] = suggestion
        return { suggestions }
      })
      return
    }
    case 'outcome.updated':
      // Outcomes are fetched through getOutcome/querySuggestions on demand
      // (S09, S18); they are not accumulated in this store.
      return
    case 'health.update':
      // System health has its own surface, S15; not part of this store.
      return
  }
}

const LIVE_CHANNELS: LiveChannel[] = [
  'CELLS',
  'ZONES',
  'DRONES',
  'ALERTS',
  'SUGGESTIONS',
  'OUTCOMES',
  'HEALTH',
]

/**
 * Starts the one subscription allowed to write to this store. Call once at
 * the application root, after `setSentinelClient`. Modelled as a push
 * stream the store subscribes to, matching the real backend's Django
 * Channels WebSocket rather than a snapshot polled by components.
 */
export function connectLiveStore(): void {
  disconnectLiveStore()
  const client = getSentinelClient()
  unsubscribers = LIVE_CHANNELS.map((channel) => client.subscribe(channel, applyMessage))
  useLiveStoreInternal.setState({ connectionState: client.connectionState() })
}

export function disconnectLiveStore(): void {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
}

export function setConnectionState(connectionState: ConnectionState): void {
  useLiveStoreInternal.setState({ connectionState })
}

/* ------------------------------------------------------------------ */
/* Selector hooks - the only supported way to read this store.          */
/* ------------------------------------------------------------------ */

/** A cell not yet known to the store has never been observed, which is
 * exactly what GAP means - so it is the honest default, never `undefined`. */
export function useCell(cellId: string): CellObservation {
  return useLiveStoreInternal((s) => s.cells[cellId] ?? GAP_CELL)
}

export function useZone(zoneId: string): ZoneUpdate | undefined {
  return useLiveStoreInternal((s) => s.zones[zoneId])
}

export function useDrone(droneId: string): DroneUpdate | undefined {
  return useLiveStoreInternal((s) => s.drones[droneId])
}

export function useConnectionState(): ConnectionState {
  return useLiveStoreInternal((s) => s.connectionState)
}

export function useAlerts(): Alert[] {
  return useLiveStoreInternal(useShallow((s) => Object.values(s.alerts)))
}

export function useSuggestions(): SuggestionOption[] {
  return useLiveStoreInternal(useShallow((s) => Object.values(s.suggestions)))
}
