/**
 * Fixed system parameters - srs.md Section 2.7.
 *
 * Every number the system depends on, in one place, so nothing is defined
 * twice. The reasoning behind each value is in srs.md Appendix C.
 */

/** Cell size in metres, 5 m by 5 m, 25 square metres per cell. */
export const CELL_SIZE_M = 5
export const CELL_AREA_SQM = CELL_SIZE_M * CELL_SIZE_M

/** Reference demo site extent. Not a system limit. */
export const SITE_EXTENT_M = { width: 300, height: 200 } as const

/** Grid dimensions, derived from the site extent and cell size. */
export const GRID_COLUMNS = 60
export const GRID_ROWS = 40
export const GRID_CELL_COUNT = GRID_COLUMNS * GRID_ROWS // 2400

/** Cell identifiers are `C-<col>-<row>`, zero padded to three digits. */
export function formatCellId(col: number, row: number): string {
  const pad = (n: number) => String(n).padStart(3, '0')
  return `C-${pad(col)}-${pad(row)}`
}

const CELL_ID_PATTERN = /^C-(\d{3})-(\d{3})$/

export function parseCellId(cellId: string): { col: number; row: number } | null {
  const match = CELL_ID_PATTERN.exec(cellId)
  if (!match) return null
  return { col: Number(match[1]), row: Number(match[2]) }
}

/** Per-cell summary rate, from proposal Section 13. */
export const SUMMARY_RATE_HZ = 1

/** End-to-end latency budget, capture to display. Also the fresh boundary. */
export const LATENCY_BUDGET_MS = 2000

/** Sliding window governing window features and the dwell gate. */
export const WINDOW_DURATION_MS = 30_000
export const WINDOW_SAMPLE_COUNT = 30

/** Lag features carrying the time pattern, so no sequence model ships. */
export const LAG_FEATURES_MS = [5_000, 10_000, 20_000] as const

/** Dwell gate, equal to the window by definition. */
export const DWELL_GATE_MS = 30_000

/** Freshness boundaries. Fresh below LATENCY_BUDGET_MS. */
export const FRESH_MAX_AGE_MS = LATENCY_BUDGET_MS
export const STALE_MAX_AGE_MS = 10_000
// Beyond STALE_MAX_AGE_MS, or never observed: GAP.

/** Risk bands, normalised 0 to 1. Upper bound of each range is exclusive except CRITICAL. */
export const RISK_BAND_RANGES = {
  NORMAL: { min: 0.0, max: 0.4 },
  WATCH: { min: 0.4, max: 0.7 },
  ELEVATED: { min: 0.7, max: 0.85 },
  CRITICAL: { min: 0.85, max: 1.0 },
} as const

/** Default alert threshold, per zone, administrator-configurable under FR9. */
export const DEFAULT_ALERT_THRESHOLD = 0.7

/** Default density threshold, per zone, administrator-configurable under FR9. */
export const DEFAULT_DENSITY_THRESHOLD_PER_SQM = 4.0

/** Alert clear hysteresis: threshold minus 0.05, held for 30 s. */
export const ALERT_CLEAR_HYSTERESIS = 0.05
export const ALERT_CLEAR_HOLD_MS = 30_000

/** Zones: 2 to 4, demo uses 3. Validated scope, the UI must reflect this limit. */
export const MIN_ZONES = 2
export const MAX_ZONES = 4
export const DEMO_ZONE_COUNT = 3

/** Drones: unbounded in the specification, demo uses 4. Never tied to zone count. */
export const DEMO_DRONE_COUNT = 4

/** Ranked suggestions per alert, including options rejected by safeguards. */
export const MAX_SUGGESTIONS_PER_ALERT = 3

/** Outcome follow-up window: verdict threshold is plus or minus 0.10 peak risk. */
export const OUTCOME_WINDOW_MS = 10 * 60 * 1000
export const OUTCOME_VERDICT_DELTA = 0.1

/** Cell history retention. */
export const HISTORY_FULL_RATE_DURATION_MS = 60 * 60 * 1000 // 1 hour at 1 Hz
export const HISTORY_DOWNSAMPLED_STEP_MS = 10_000 // 1 sample per 10 s
export const HISTORY_DOWNSAMPLED_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/** Audit records: 30 days, never downsampled. */
export const AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
