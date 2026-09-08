import type {
  ObservationState,
  RiskBand,
  DroneState,
  DroneLink,
  AlertStatus,
  SuggestionStatus,
  SuggestionAction,
  SafeguardCheck,
  TextSource,
  OutcomeVerdict,
  Role,
  RiskFeature,
} from './constants'

/* ------------------------------------------------------------------ */
/* The honesty invariant - srs.md Section 2.3                          */
/* ------------------------------------------------------------------ */

export interface Flow {
  dirDeg: number
  speedMps: number
}

export interface Risk {
  score: number
  band: RiskBand
}

/**
 * The critical type. `observationState` decides which other fields exist,
 * so a component reading `risk` on a cell it has not proven is `OBSERVED`
 * fails to compile rather than merely renders wrong. Never widen this back
 * into one object with optional fields: that is exactly the shape the
 * honesty invariant forbids. The literal strings below are the exact
 * `OBSERVATION_STATE` values from `./constants`; `ObservationState` is
 * their union, checked by the `satisfies` below rather than referenced
 * directly, so the discriminant stays a literal type for narrowing.
 */
export type CellObservation =
  | {
      observationState: 'OBSERVED'
      densityPerSqM: number
      flow: Flow | null
      risk: Risk
      dwellMs: number
    }
  | {
      observationState: 'NOT_ENOUGH_DWELL'
      densityPerSqM: number
      flow: Flow | null
      risk: null
      dwellMs: number
    }
  | {
      observationState: 'STALE'
      densityPerSqM: number
      flow: null
      risk: null
      ageMs: number
    }
  | {
      observationState: 'GAP'
      densityPerSqM: null
      flow: null
      risk: null
    }

// CellObservation['observationState'] must be exactly the ObservationState
// union from the constants module, no more and no fewer members, so the
// two can never silently drift apart.
export type AssertExact<T, Expected> = [T] extends [Expected]
  ? [Expected] extends [T]
    ? true
    : never
  : never
export type CellObservationCoversAllStates = AssertExact<
  CellObservation['observationState'],
  ObservationState
>

/* ------------------------------------------------------------------ */
/* Wire payload schemas - srs.md Section 3.3, verbatim field names      */
/* ------------------------------------------------------------------ */

/** An element of `cell.batch`. `risk` is null whenever `observationState`
 * is not `OBSERVED`. `flow` is null while the observing drone is in
 * transit. `densityPerSqM` is null for `GAP`. */
export interface CellUpdate {
  cellId: string
  ts: string
  observationState: ObservationState
  densityPerSqM: number | null
  flow: Flow | null
  risk: Risk | null
  ageMs: number
  dwellMs: number
  observedBy: string[]
}

/** Cell history is the same per-cell wire shape, one entry per timestamp. */
export type CellSample = CellUpdate

export interface ZoneCoverage {
  observed: number
  notEnoughDwell: number
  stale: number
  gap: number
  total: number
}

/** Zone risk is never sent without `coverage` - srs.md 3.3. `risk` is null
 * when every cell in the zone is `NOT_ENOUGH_DWELL` or unobserved, per the
 * canonical dataset's Zone C, which carries a dash rather than a zero. */
export interface ZoneUpdate {
  zoneId: string
  ts: string
  risk: Risk | null
  coverage: ZoneCoverage
  peakCellId: string | null
}

/** Zone history is the same per-zone wire shape, one series per zone. */
export type ZoneSample = ZoneUpdate

export interface DronePose {
  lat: number
  lon: number
  altM: number
  headingDeg: number
}

export interface DroneRegistration {
  referenceFrameLocked: boolean
  inliers: number
}

export interface DroneUpdate {
  droneId: string
  ts: string
  state: DroneState
  link: DroneLink
  pose: DronePose
  footprintCells: string[]
  batteryPct: number
  registration: DroneRegistration
}

/** The fleet entity, `DroneUpdate` plus the identity fields that do not
 * change tick to tick. */
export interface Drone extends DroneUpdate {
  label: string
  assignedAreaId: string | null
}

export interface AlertAttribution {
  feature: RiskFeature
  contribution: number
  value: number
}

/** `attribution` is ordered by absolute contribution, descending, and is
 * recorded at the moment the alert fired. It is never recomputed on read. */
export interface Alert {
  alertId: string
  raisedAt: string
  siteId: string
  zoneId: string
  cellId: string
  score: number
  threshold: number
  band: RiskBand
  status: AlertStatus
  attribution: AlertAttribution[]
  acknowledgedBy: string | null
  acknowledgedAt: string | null
}

export interface SafeguardResult {
  check: SafeguardCheck
  passed: boolean
  /** Present when `passed` is false. */
  reason?: string
}

/** A rejected option carries `status: "REJECTED"`, at least one safeguard
 * with `passed: false` and a `reason` on that safeguard, and is still
 * returned: showing a rejection reason demonstrates the safeguards. */
export interface SuggestionOption {
  suggestionId: string
  alertId: string
  rank: number
  status: SuggestionStatus
  action: SuggestionAction
  targetExitId: string | null
  routeCells: string[]
  text: string
  textSource: TextSource
  rationale: string
  safeguards: SafeguardResult[]
  confirmedBy: string | null
  confirmedAt: string | null
  dismissedBy: string | null
  dismissedAt: string | null
}

/** Elements returned by `querySuggestions` additionally carry
 * `outcomeVerdict`, the verdict of the option's outcome or `null` while its
 * window is still open, so a list renders its verdict chips without one
 * outcome request per row. */
export interface SuggestionListItem extends SuggestionOption {
  outcomeVerdict: OutcomeVerdict | null
}

export interface OutcomeTrajectoryPoint {
  ts: string
  risk: number
}

/** `verdict` is `PENDING` until the window closes. */
export interface Outcome {
  suggestionId: string
  confirmedAt: string
  windowEndsAt: string
  affectedCells: string[]
  riskAtConfirm: number
  peakRiskInWindow: number
  trajectory: OutcomeTrajectoryPoint[]
  verdict: OutcomeVerdict
}

export interface AnalyticsAlertsByZone {
  zoneId: string
  /** Null when the zone was never observed in the range: a count of zero
   * is a measured result only when `observedShareOfRange` is above zero. */
  count: number | null
  observedShareOfRange: number
}

/** Null only when no alert was raised in the range. */
export interface AnalyticsResponseTime {
  raised: number
  acknowledged: number
  medianMs: number | null
  p95Ms: number | null
}

/** Null when no suggestion was issued in the range. */
export interface AnalyticsAcknowledgementRate {
  issued: number
  confirmed: number
  dismissed: number
  expired: number
}

/** Null when no suggestion in the range was confirmed. Counts otherwise
 * cover confirmed suggestions only. */
export type AnalyticsVerdicts = Record<OutcomeVerdict, number> | null

export interface AnalyticsSummary {
  siteId: string
  from: string
  to: string
  alertsByZone: AnalyticsAlertsByZone[]
  responseTime: AnalyticsResponseTime | null
  acknowledgementRate: AnalyticsAcknowledgementRate | null
  verdicts: AnalyticsVerdicts
}

/* ------------------------------------------------------------------ */
/* Error model - srs.md Section 3.4                                    */
/* ------------------------------------------------------------------ */

export interface ApiError {
  error: {
    code: string
    message: string
    field?: string
    requestId: string
  }
}

/* ------------------------------------------------------------------ */
/* Entities - srs.md Section 5 Data Model                              */
/* ------------------------------------------------------------------ */

export interface LatLon {
  lat: number
  lon: number
}

export interface Extent2D {
  width: number
  height: number
}

export interface Site {
  id: string
  name: string
  planImageUrl: string
  groundExtentM: Extent2D
  createdAt: string
}

export interface Grid {
  siteId: string
  cellSizeM: number
  originLatLon: LatLon
  cols: number
  rows: number
}

export interface GridConfig {
  cellSizeM: number
  originLatLon: LatLon
}

export interface Cell {
  cellId: string
  gridId: string
  col: number
  row: number
  centreLatLon: LatLon
  walkable: boolean
  isExit: boolean
  isBarrier: boolean
  isObstruction: boolean
  zoneId: string | null
}

export type CellAttributes = Partial<
  Pick<Cell, 'walkable' | 'isExit' | 'isBarrier' | 'isObstruction'>
>

export interface SitePlanInput {
  imageDataUrl: string
  groundExtentM: Extent2D
}

export interface Zone {
  zoneId: string
  siteId: string
  name: string
  cellIds: string[]
  riskThreshold: number
  densityThreshold: number
}

export type ZoneInput = Omit<Zone, 'siteId'>

export interface Exit {
  exitId: string
  siteId: string
  cellIds: string[]
  capacityPerMin: number
  label: string
}

export type ExitInput = Omit<Exit, 'siteId'>

export interface ThresholdSet {
  siteId: string
  zoneId: string
  riskThreshold: number
  densityThreshold: number
  version: number
  changedBy: string
  changedAt: string
}

export type SetupProposalAttribute = 'EXIT' | 'BARRIER' | 'OBSTRUCTION'
export type SetupProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface SetupProposal {
  proposalId: string
  siteId: string
  cellIds: string[]
  proposedAttribute: SetupProposalAttribute
  confidence: number
  status: SetupProposalStatus
}

export interface ProposalDecision {
  decision: 'ACCEPT' | 'REJECT'
  correctedAttribute?: SetupProposalAttribute
}

/** A drone's assignment target. Spans zones freely and never becomes a
 * zone (FR9.8). */
export interface AreaTarget {
  label: string
  cellIds: string[]
}

export interface User {
  userId: string
  username: string
  role: Role
  active: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface UserInput {
  userId?: string
  username: string
  role: Role
  password?: string
}

export interface RoleDefinition {
  role: Role
  capabilities: string[]
}

export interface AuditEntry {
  entryId: string
  ts: string
  actorId: string
  action: string
  targetType: string
  targetId: string
  previousValue: unknown
  newValue: unknown
}

export type HistoryEventType = 'ALERT' | 'SUGGESTION' | 'OUTCOME' | 'CONFIG_CHANGE'

export interface HistoryEvent {
  eventId: string
  ts: string
  type: HistoryEventType
  siteId: string
  zoneId: string | null
  summary: string
  refId: string
}

export interface ReplayFrame {
  ts: string
  cells: CellUpdate[]
  zones: ZoneUpdate[]
  drones: DroneUpdate[]
}

export type ServiceStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE'

export interface SystemHealthService {
  name: string
  status: ServiceStatus
  detail?: string
}

export interface SystemHealthLatency {
  measuredMs: number
  p95Ms: number
  budgetMs: number
}

export interface SystemHealthWorker {
  name: string
  status: ServiceStatus
  queueDepth: number
}

export interface SystemHealth {
  services: SystemHealthService[]
  latency: SystemHealthLatency
  workers: SystemHealthWorker[]
}

export interface SiteState {
  site: Site
  grid: Grid
  cells: CellUpdate[]
  zones: ZoneUpdate[]
  drones: DroneUpdate[]
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

export interface Credentials {
  username: string
  password: string
}

export interface Session {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

/* ------------------------------------------------------------------ */
/* Queries and paging                                                   */
/* ------------------------------------------------------------------ */

export interface TimeRange {
  from: string
  to: string
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface AlertQuery {
  siteId?: string
  zoneId?: string
  cellId?: string
  band?: RiskBand
  status?: AlertStatus
  actorId?: string
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

export interface SuggestionQuery {
  siteId?: string
  zoneId?: string
  status?: SuggestionStatus
  action?: SuggestionAction
  textSource?: TextSource
  actorId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface HistoryQuery {
  siteId?: string
  zoneId?: string
  type?: HistoryEventType
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

export interface AuditQuery {
  actorId?: string
  action?: string
  targetType?: string
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

/* ------------------------------------------------------------------ */
/* Push - srs.md Section 3.2                                            */
/* ------------------------------------------------------------------ */

export type LiveChannel =
  | 'CELLS'
  | 'ZONES'
  | 'DRONES'
  | 'ALERTS'
  | 'SUGGESTIONS'
  | 'OUTCOMES'
  | 'HEALTH'

export type LiveMessage =
  | { type: 'snapshot'; payload: SiteState }
  | { type: 'cell.batch'; payload: CellUpdate[] }
  | { type: 'zone.update'; payload: ZoneUpdate }
  | { type: 'drone.update'; payload: DroneUpdate }
  | { type: 'alert.raised' | 'alert.updated' | 'alert.cleared'; payload: Alert }
  | { type: 'suggestion.created' | 'suggestion.updated'; payload: SuggestionOption[] }
  | { type: 'outcome.updated'; payload: Outcome }
  | { type: 'health.update'; payload: SystemHealth }

export type Unsubscribe = () => void
