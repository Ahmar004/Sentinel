import { create } from 'zustand'
import type {
  CellAttributes,
  Cell,
  Exit,
  ExitInput,
  Grid,
  GridConfig,
  Site,
  SitePlanInput,
  ThresholdSet,
  Zone,
  ZoneInput,
} from '@/domain/types'
import { getSentinelClient } from './clientRegistry'

/**
 * FR9: venue setup, the cell grid, zones, exits and capacities, and
 * thresholds. This is configuration state, not live telemetry: it changes
 * only when an administrator saves a change, never on a 1 Hz tick, which
 * is what separates it from liveStore.
 */
export interface ConfigState {
  site: Site | null
  grid: Grid | null
  zones: Zone[]
  exits: Exit[]
  thresholds: ThresholdSet[]

  setSite: (site: Site) => void
  setGrid: (grid: Grid) => void
  setZones: (zones: Zone[]) => void
  setExits: (exits: Exit[]) => void
  setThresholds: (thresholds: ThresholdSet[]) => void

  putSitePlan: (siteId: string, plan: SitePlanInput) => Promise<Site>
  putGrid: (siteId: string, grid: GridConfig) => Promise<Grid>
  patchCellAttributes: (siteId: string, cellId: string, attrs: CellAttributes) => Promise<Cell>
  saveZone: (siteId: string, zone: ZoneInput) => Promise<Zone>
  deleteZone: (siteId: string, zoneId: string) => Promise<void>
  putExits: (siteId: string, exits: ExitInput[]) => Promise<Exit[]>
  putThresholds: (siteId: string, thresholds: ThresholdSet) => Promise<ThresholdSet>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  site: null,
  grid: null,
  zones: [],
  exits: [],
  thresholds: [],

  setSite: (site) => set({ site }),
  setGrid: (grid) => set({ grid }),
  setZones: (zones) => set({ zones }),
  setExits: (exits) => set({ exits }),
  setThresholds: (thresholds) => set({ thresholds }),

  putSitePlan: async (siteId, plan) => {
    const site = await getSentinelClient().putSitePlan(siteId, plan)
    set({ site })
    return site
  },

  putGrid: async (siteId, gridConfig) => {
    const grid = await getSentinelClient().putGrid(siteId, gridConfig)
    set({ grid })
    return grid
  },

  patchCellAttributes: (siteId, cellId, attrs) =>
    getSentinelClient().patchCellAttributes(siteId, cellId, attrs),

  saveZone: async (siteId, zoneInput) => {
    const zone = await getSentinelClient().saveZone(siteId, zoneInput)
    const existing = get().zones.filter((z) => z.zoneId !== zone.zoneId)
    set({ zones: [...existing, zone] })
    return zone
  },

  deleteZone: async (siteId, zoneId) => {
    await getSentinelClient().deleteZone(siteId, zoneId)
    set({ zones: get().zones.filter((z) => z.zoneId !== zoneId) })
  },

  putExits: async (siteId, exitInputs) => {
    const exits = await getSentinelClient().putExits(siteId, exitInputs)
    set({ exits })
    return exits
  },

  putThresholds: async (siteId, thresholds) => {
    const saved = await getSentinelClient().putThresholds(siteId, thresholds)
    const existing = get().thresholds.filter((t) => t.zoneId !== saved.zoneId)
    set({ thresholds: [...existing, saved] })
    return saved
  },
}))
