import type { DroneLink, DroneState, ObservationState } from '@/domain/constants'
import type { DronePose, DroneRegistration, Flow, Risk } from '@/domain/types'

/**
 * Internal simulation state. Not part of the wire contract - `tickEngine`
 * converts these into the normative `CellUpdate` / `DroneUpdate` shapes
 * from `@/domain/types` on every emission. Kept separate so the simulator
 * can carry bookkeeping (like the sim-clock timestamp of the last real
 * observation) that the wire schema has no field for.
 */
export interface SimCell {
  cellId: string
  col: number
  row: number
  zoneId: string | null
  walkable: boolean
  observationState: ObservationState
  densityPerSqM: number | null
  flow: Flow | null
  risk: Risk | null
  dwellMs: number
  observedBy: string[]
  /** Sim-clock ms of the last tick this cell received a real observation. */
  lastRealSampleAtMs: number | null
}

export interface SimDrone {
  droneId: string
  label: string
  assignedZoneId: string | null
  state: DroneState
  link: DroneLink
  pose: DronePose
  footprintCells: string[]
  batteryPct: number
  registration: DroneRegistration
  /** Internal transit bookkeeping: cells queued to become the next footprint. */
  transitTargetFootprint: string[] | null
  transitTicksRemaining: number
}
