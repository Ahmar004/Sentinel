import type { ConnectionState, SentinelClient } from '@/client/SentinelClient'
import { CONNECTION_STATE, OUTCOME_VERDICT, ROLE, SUGGESTION_STATUS } from '@/domain/constants'
import { MAX_ZONES, MIN_ZONES, OUTCOME_VERDICT_DELTA, OUTCOME_WINDOW_MS } from '@/domain/parameters'
import type {
  Alert,
  AlertQuery,
  AnalyticsAlertsByZone,
  AnalyticsSummary,
  AreaTarget,
  AuditEntry,
  AuditQuery,
  Cell,
  CellAttributes,
  CellSample,
  Credentials,
  Drone,
  DroneUpdate,
  Exit,
  ExitInput,
  Grid,
  GridConfig,
  HistoryEvent,
  HistoryQuery,
  LiveChannel,
  LiveMessage,
  Outcome,
  OutcomeTrajectoryPoint,
  Page,
  ProposalDecision,
  ReplayFrame,
  RoleDefinition,
  Session,
  Site,
  SitePlanInput,
  SiteState,
  SetupProposal,
  SuggestionListItem,
  SuggestionOption,
  SuggestionQuery,
  SystemHealth,
  ThresholdSet,
  TimeRange,
  Unsubscribe,
  User,
  UserInput,
  Zone,
  ZoneInput,
  ZoneSample,
  ZoneUpdate,
} from '@/domain/types'
import { CellStore } from './cellStore'
import { GRID_COLUMNS, GRID_ROWS } from '@/domain/parameters'
import { clamp, round } from './rng'
import { PlaybackController } from './scenarios'
import { SEED_NOW_ISO, SEED_PASSWORD, buildSeedBundle, type SeedBundle } from './seed'
import { TickEngine } from './tickEngine'

/** srs.md 3.4 - one error envelope for every failure. */
export class SentinelApiError extends Error {
  code: string
  field?: string
  requestId: string

  constructor(code: string, message: string, requestId: string, field?: string) {
    super(message)
    this.code = code
    this.field = field
    this.requestId = requestId
  }
}

const DEFAULT_PAGE_SIZE = 20

function paginate<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Page<T> {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function percentile95(values: number[]): number {
  if (values.length === 1) return values[0]
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp(Math.ceil(0.95 * sorted.length) - 1, 0, sorted.length - 1)
  return sorted[idx]
}

interface OutcomeTracker extends Outcome {
  affectedZoneId: string | null
  lastAppendedAtMs: number
}

/**
 * The mock implementation of `SentinelClient` (srs.md 3.5). Backed by a
 * deterministic `TickEngine` running at 1 Hz, matching the real backend's
 * push model exactly: this client never waits to be polled, it drives its
 * own channel subscribers forward on its own clock.
 */
/** Upper bound on frames one replay request may build. Ten minutes at
 * 1 Hz is 600, which is the widest the interface offers; the cap exists so
 * a hand-written range cannot allocate without limit. */
const MAX_REPLAY_FRAMES = 900

export class MockSentinelClient implements SentinelClient {
  private readonly seed: SeedBundle
  private readonly cellStore = new CellStore()
  private readonly engine: TickEngine
  private readonly playback: PlaybackController

  private readonly channelHandlers: Record<LiveChannel, Set<(msg: LiveMessage) => void>> = {
    CELLS: new Set(),
    ZONES: new Set(),
    DRONES: new Set(),
    ALERTS: new Set(),
    SUGGESTIONS: new Set(),
    OUTCOMES: new Set(),
    HEALTH: new Set(),
  }

  private site: Site
  private grid: Grid
  private cells: Map<string, Cell>
  private zones: Map<string, Zone>
  private exits: Map<string, Exit>
  private thresholds: Map<string, ThresholdSet>
  private users: Map<string, User>
  private passwords: Map<string, string>
  private setupProposals: SetupProposal[]
  private historyEvents: HistoryEvent[]
  private auditLog: AuditEntry[]
  private health: SystemHealth

  private readonly zoneHistory = new Map<string, ZoneUpdate[]>()
  private readonly droneHistory = new Map<string, DroneUpdate[]>()
  private readonly outcomes = new Map<string, Outcome>()
  private readonly pendingOutcomes = new Map<string, OutcomeTracker>()

  private currentUserId: string | null = null
  private connState: ConnectionState = CONNECTION_STATE.LIVE
  private auditSeq = 1
  private requestSeq = 1
  private userSeq = 1

  constructor() {
    this.seed = buildSeedBundle()
    this.engine = new TickEngine(this.seed, this.cellStore)
    this.playback = new PlaybackController(this.engine)

    this.site = this.seed.site
    this.grid = this.seed.grid
    this.cells = new Map(this.seed.cells.map((c) => [c.cellId, c]))
    this.zones = new Map(this.seed.zones.map((z) => [z.zoneId, z]))
    this.exits = new Map(this.seed.exits.map((e) => [e.exitId, e]))
    this.thresholds = new Map(this.seed.thresholds.map((t) => [t.zoneId, t]))
    this.users = new Map(this.seed.users.map((u) => [u.userId, u]))
    this.passwords = new Map(this.seed.users.map((u) => [u.userId, SEED_PASSWORD]))
    this.setupProposals = [...this.seed.setupProposals]
    this.historyEvents = [...this.seed.historyEvents]
    this.auditLog = [...this.seed.auditLog]
    this.health = this.seed.health
    this.outcomes.set(this.seed.outcome.suggestionId, this.seed.outcome)

    // Seed the cell store with the canonical snapshot so history and
    // replay have something real before the first live tick lands.
    for (const cell of this.engine.getCellUpdates(SEED_NOW_ISO)) {
      if (cell.observationState !== 'GAP') this.cellStore.push(cell)
    }
    for (const zone of this.engine.getZoneUpdates(SEED_NOW_ISO)) {
      this.zoneHistory.set(zone.zoneId, [zone])
    }
    for (const drone of this.engine.getDroneUpdates(SEED_NOW_ISO)) {
      this.droneHistory.set(drone.droneId, [drone])
    }

    this.playback.subscribe((result) => this.onTick(result))
    this.playback.play()
  }

  /* ---------------------------------------------------------------- */
  /* Internal: the tick loop                                            */
  /* ---------------------------------------------------------------- */

  private onTick(result: ReturnType<TickEngine['step']>): void {
    if (result.cellBatch.length > 0) {
      this.publish('CELLS', { type: 'cell.batch', payload: result.cellBatch })
    }
    for (const zone of result.zoneUpdates) {
      this.pushCapped(this.zoneHistory, zone.zoneId, zone, 4000)
      this.publish('ZONES', { type: 'zone.update', payload: zone })
    }
    for (const drone of result.droneUpdates) {
      this.pushCapped(this.droneHistory, drone.droneId, drone, 4000)
      this.publish('DRONES', { type: 'drone.update', payload: drone })
    }
    for (const alert of result.raisedAlerts) this.publish('ALERTS', { type: 'alert.raised', payload: alert })
    for (const alert of result.updatedAlerts) this.publish('ALERTS', { type: 'alert.updated', payload: alert })
    for (const alert of result.clearedAlerts) this.publish('ALERTS', { type: 'alert.cleared', payload: alert })
    for (const set of result.newSuggestionSets) this.publish('SUGGESTIONS', { type: 'suggestion.created', payload: set })

    this.stepOutcomes(result.ts)
  }

  private pushCapped<K, V>(map: Map<K, V[]>, key: K, value: V, cap: number): void {
    const list = map.get(key) ?? []
    list.push(value)
    if (list.length > cap) list.shift()
    map.set(key, list)
  }

  private publish(channel: LiveChannel, msg: LiveMessage): void {
    for (const handler of this.channelHandlers[channel]) handler(msg)
  }

  private nextRequestId(): string {
    return `req-${String(this.requestSeq++).padStart(6, '0')}`
  }

  private apiError(code: string, message: string, field?: string): never {
    throw new SentinelApiError(code, message, this.nextRequestId(), field)
  }

  private audit(action: string, targetType: string, targetId: string, previousValue: unknown, newValue: unknown): void {
    this.auditLog.unshift({
      entryId: `audit-live-${String(this.auditSeq++).padStart(4, '0')}`,
      ts: this.engine.getCurrentTs(),
      actorId: this.currentUserId ?? 'system',
      action,
      targetType,
      targetId,
      previousValue,
      newValue,
    })
  }

  /* ---------------------------------------------------------------- */
  /* Outcome tracking - FR8.6                                            */
  /* ---------------------------------------------------------------- */

  private startOutcomeTracking(suggestion: SuggestionOption, confirmedAtIso: string): void {
    const confirmedAtMs = Date.parse(confirmedAtIso)
    const riskAtConfirm = this.peakRiskAmong(suggestion.routeCells)
    const tracker: OutcomeTracker = {
      suggestionId: suggestion.suggestionId,
      confirmedAt: confirmedAtIso,
      windowEndsAt: new Date(confirmedAtMs + OUTCOME_WINDOW_MS).toISOString(),
      affectedCells: suggestion.routeCells,
      riskAtConfirm,
      peakRiskInWindow: riskAtConfirm,
      trajectory: [{ ts: confirmedAtIso, risk: riskAtConfirm }],
      verdict: OUTCOME_VERDICT.PENDING,
      affectedZoneId: null,
      lastAppendedAtMs: confirmedAtMs,
    }
    this.pendingOutcomes.set(suggestion.suggestionId, tracker)
    this.outcomes.set(suggestion.suggestionId, tracker)
  }

  private peakRiskAmong(cellIds: string[]): number {
    let peak = 0
    for (const cell of this.engine.getAllCells()) {
      if (cellIds.includes(cell.cellId) && cell.risk) peak = Math.max(peak, cell.risk.score)
    }
    return round(peak, 2)
  }

  private stepOutcomes(ts: string): void {
    const nowMs = Date.parse(ts)
    for (const tracker of this.pendingOutcomes.values()) {
      const currentRisk = this.peakRiskAmong(tracker.affectedCells)
      tracker.peakRiskInWindow = Math.max(tracker.peakRiskInWindow, currentRisk)
      if (nowMs - tracker.lastAppendedAtMs >= 60_000) {
        tracker.trajectory.push({ ts, risk: currentRisk })
        tracker.lastAppendedAtMs = nowMs
      }
      if (nowMs >= Date.parse(tracker.windowEndsAt)) {
        const delta = tracker.peakRiskInWindow - tracker.riskAtConfirm
        tracker.verdict =
          delta <= -OUTCOME_VERDICT_DELTA
            ? OUTCOME_VERDICT.IMPROVED
            : delta >= OUTCOME_VERDICT_DELTA
              ? OUTCOME_VERDICT.WORSENED
              : OUTCOME_VERDICT.UNCHANGED
        this.pendingOutcomes.delete(tracker.suggestionId)
        this.publish('OUTCOMES', { type: 'outcome.updated', payload: { ...tracker } })
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Auth                                                                */
  /* ---------------------------------------------------------------- */

  async login(credentials: Credentials): Promise<Session> {
    const user = this.users.get(credentials.username)
    const password = this.passwords.get(credentials.username)
    // FR10.1: the error must not disclose which field was wrong, so an
    // unknown user, a wrong password and a deactivated account all fail
    // identically.
    if (!user || !user.active || password !== credentials.password) {
      this.apiError('INVALID_CREDENTIALS', 'Invalid username or password.', 'password')
    }
    this.currentUserId = user.userId
    const updated: User = { ...user, lastLoginAt: this.engine.getCurrentTs() }
    this.users.set(user.userId, updated)
    return {
      user: updated,
      accessToken: `mock-access-${user.userId}`,
      refreshToken: `mock-refresh-${user.userId}`,
      expiresAt: new Date(Date.parse(this.engine.getCurrentTs()) + 60 * 60 * 1000).toISOString(),
    }
  }

  /* ---------------------------------------------------------------- */
  /* Site, history, drones, health, analytics                           */
  /* ---------------------------------------------------------------- */

  async getSiteState(siteId: string): Promise<SiteState> {
    void siteId // single-site mock: every request is served against the one seeded site
    const ts = this.engine.getCurrentTs()
    return {
      site: this.site,
      grid: this.grid,
      cells: this.engine.getCellUpdates(ts),
      zones: this.engine.getZoneUpdates(ts),
      drones: this.engine.getDroneUpdates(ts),
    }
  }

  async getCellHistory(cellId: string, range: TimeRange): Promise<CellSample[]> {
    return this.cellStore.getRange(cellId, Date.parse(range.from), Date.parse(range.to))
  }

  async getZoneHistory(_siteId: string, range: TimeRange, stepMs?: number): Promise<ZoneSample[]> {
    const fromMs = Date.parse(range.from)
    const toMs = Date.parse(range.to)
    const step = stepMs && stepMs > 1000 ? Math.round(stepMs / 1000) : 1
    const out: ZoneSample[] = []
    for (const series of this.zoneHistory.values()) {
      const inRange = series.filter((z) => {
        const t = Date.parse(z.ts)
        return t >= fromMs && t <= toMs
      })
      for (let i = 0; i < inRange.length; i += step) out.push(inRange[i])
    }
    return out.sort((a, b) => a.ts.localeCompare(b.ts))
  }

  async getDrones(siteId: string): Promise<Drone[]> {
    void siteId
    const ts = this.engine.getCurrentTs()
    return this.engine.getAllDrones().map((d) => ({
      droneId: d.droneId,
      ts,
      state: d.state,
      link: d.link,
      pose: d.pose,
      footprintCells: d.footprintCells,
      batteryPct: d.batteryPct,
      registration: d.registration,
      label: d.label,
      assignedAreaId: d.assignedAreaId,
    }))
  }

  async assignDrone(droneId: string, target: AreaTarget): Promise<Drone> {
    const drone = this.engine.getAllDrones().find((d) => d.droneId === droneId)
    if (!drone) this.apiError('NOT_FOUND', `No drone with id ${droneId}.`, 'droneId')
    const previousAreaId = drone.assignedAreaId
    drone.assignedAreaId = target.label.toLowerCase().replace(/\s+/g, '-')
    drone.footprintCells = target.cellIds
    this.audit('REASSIGN_DRONE', 'Drone', droneId, { assignedAreaId: previousAreaId }, { assignedAreaId: drone.assignedAreaId })
    const ts = this.engine.getCurrentTs()
    return {
      droneId: drone.droneId,
      ts,
      state: drone.state,
      link: drone.link,
      pose: drone.pose,
      footprintCells: drone.footprintCells,
      batteryPct: drone.batteryPct,
      registration: drone.registration,
      label: drone.label,
      assignedAreaId: drone.assignedAreaId,
    }
  }

  async getHealth(): Promise<SystemHealth> {
    return this.health
  }

  async getAnalytics(_siteId: string, range: TimeRange): Promise<AnalyticsSummary> {
    const fromMs = Date.parse(range.from)
    const toMs = Date.parse(range.to)
    const inRange = (iso: string): boolean => {
      const t = Date.parse(iso)
      return t >= fromMs && t <= toMs
    }

    const alertsInRange = this.engine.getAlerts().filter((a) => inRange(a.raisedAt))
    const alertsByZone: AnalyticsAlertsByZone[] = [...this.zones.values()].map((zone) => {
      const series = (this.zoneHistory.get(zone.zoneId) ?? []).filter((z) => inRange(z.ts))
      const observedTicks = series.filter((z) => z.risk !== null).length
      const observedShareOfRange = series.length > 0 ? round(observedTicks / series.length, 2) : 0
      const count = observedShareOfRange > 0 ? alertsInRange.filter((a) => a.zoneId === zone.zoneId).length : null
      return { zoneId: zone.zoneId, count, observedShareOfRange }
    })

    let responseTime: AnalyticsSummary['responseTime'] = null
    if (alertsInRange.length > 0) {
      const acknowledged = alertsInRange.filter((a) => a.acknowledgedAt !== null)
      const deltas = acknowledged.map((a) => Date.parse(a.acknowledgedAt as string) - Date.parse(a.raisedAt))
      responseTime = {
        raised: alertsInRange.length,
        acknowledged: acknowledged.length,
        medianMs: deltas.length > 0 ? Math.round(median(deltas)) : null,
        p95Ms: deltas.length > 0 ? Math.round(percentile95(deltas)) : null,
      }
    }

    const suggestionsInRange = this.engine
      .getAllSuggestions()
      .filter((s) => {
        const alert = this.engine.getAlert(s.alertId)
        return alert ? inRange(alert.raisedAt) : false
      })

    let acknowledgementRate: AnalyticsSummary['acknowledgementRate'] = null
    if (suggestionsInRange.length > 0) {
      acknowledgementRate = {
        issued: suggestionsInRange.length,
        confirmed: suggestionsInRange.filter((s) => s.status === SUGGESTION_STATUS.CONFIRMED).length,
        dismissed: suggestionsInRange.filter((s) => s.status === SUGGESTION_STATUS.DISMISSED).length,
        expired: suggestionsInRange.filter((s) => s.status === SUGGESTION_STATUS.EXPIRED).length,
      }
    }

    const confirmedInRange = suggestionsInRange.filter((s) => s.status === SUGGESTION_STATUS.CONFIRMED)
    let verdicts: AnalyticsSummary['verdicts'] = null
    if (confirmedInRange.length > 0) {
      verdicts = { PENDING: 0, IMPROVED: 0, UNCHANGED: 0, WORSENED: 0 }
      for (const s of confirmedInRange) {
        const outcome = this.outcomes.get(s.suggestionId)
        if (outcome) verdicts[outcome.verdict] += 1
      }
    }

    return {
      siteId: this.site.id,
      from: range.from,
      to: range.to,
      alertsByZone,
      responseTime,
      acknowledgementRate,
      verdicts,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Alerts and suggestions                                             */
  /* ---------------------------------------------------------------- */

  async queryAlerts(query: AlertQuery): Promise<Page<Alert>> {
    let items = this.engine.getAlerts()
    if (query.siteId) items = items.filter((a) => a.siteId === query.siteId)
    if (query.zoneId) items = items.filter((a) => a.zoneId === query.zoneId)
    if (query.cellId) items = items.filter((a) => a.cellId === query.cellId)
    if (query.band) items = items.filter((a) => a.band === query.band)
    if (query.status) items = items.filter((a) => a.status === query.status)
    if (query.actorId) items = items.filter((a) => a.acknowledgedBy === query.actorId)
    if (query.from) items = items.filter((a) => a.raisedAt >= (query.from as string))
    if (query.to) items = items.filter((a) => a.raisedAt <= (query.to as string))
    if (query.q) {
      const q = query.q.toLowerCase()
      items = items.filter((a) => a.alertId.toLowerCase().includes(q) || a.cellId.toLowerCase().includes(q))
    }
    items = [...items].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))
    return paginate(items, query.page, query.pageSize)
  }

  async acknowledgeAlert(alertId: string): Promise<Alert> {
    const updated = this.engine.acknowledgeAlert(alertId, this.currentUserId ?? 'system', this.engine.getCurrentTs())
    if (!updated) this.apiError('NOT_FOUND', `No alert with id ${alertId}.`, 'alertId')
    this.audit('ACKNOWLEDGE_ALERT', 'Alert', alertId, { status: 'OPEN' }, { status: 'ACKNOWLEDGED' })
    this.publish('ALERTS', { type: 'alert.updated', payload: updated })
    return updated
  }

  async getSuggestions(alertId: string): Promise<SuggestionOption[]> {
    return this.engine.getSuggestions(alertId)
  }

  async confirmSuggestion(suggestionId: string): Promise<SuggestionOption> {
    const suggestion = this.findSuggestion(suggestionId)
    if (!suggestion) this.apiError('NOT_FOUND', `No suggestion with id ${suggestionId}.`, 'suggestionId')
    if (suggestion.status !== SUGGESTION_STATUS.PROPOSED) {
      this.apiError('INVALID_STATE', 'Only a proposed suggestion can be confirmed.', 'status')
    }
    const ts = this.engine.getCurrentTs()
    const updated: SuggestionOption = {
      ...suggestion,
      status: SUGGESTION_STATUS.CONFIRMED,
      confirmedBy: this.currentUserId ?? 'system',
      confirmedAt: ts,
    }
    this.engine.setSuggestion(updated)
    this.startOutcomeTracking(updated, ts)
    this.audit('CONFIRM_SUGGESTION', 'SuggestionOption', suggestionId, { status: 'PROPOSED' }, { status: 'CONFIRMED' })
    this.publish('SUGGESTIONS', { type: 'suggestion.updated', payload: this.engine.getSuggestions(suggestion.alertId) })
    return updated
  }

  async dismissSuggestion(suggestionId: string): Promise<SuggestionOption> {
    const suggestion = this.findSuggestion(suggestionId)
    if (!suggestion) this.apiError('NOT_FOUND', `No suggestion with id ${suggestionId}.`, 'suggestionId')
    if (suggestion.status !== SUGGESTION_STATUS.PROPOSED) {
      this.apiError('INVALID_STATE', 'Only a proposed suggestion can be dismissed.', 'status')
    }
    const updated: SuggestionOption = {
      ...suggestion,
      status: SUGGESTION_STATUS.DISMISSED,
      dismissedBy: this.currentUserId ?? 'system',
      dismissedAt: this.engine.getCurrentTs(),
    }
    this.engine.setSuggestion(updated)
    this.audit('DISMISS_SUGGESTION', 'SuggestionOption', suggestionId, { status: 'PROPOSED' }, { status: 'DISMISSED' })
    this.publish('SUGGESTIONS', { type: 'suggestion.updated', payload: this.engine.getSuggestions(suggestion.alertId) })
    return updated
  }

  private findSuggestion(suggestionId: string): SuggestionOption | undefined {
    return this.engine.getAllSuggestions().find((s) => s.suggestionId === suggestionId)
  }

  async getOutcome(suggestionId: string): Promise<Outcome> {
    const outcome = this.outcomes.get(suggestionId)
    if (!outcome) this.apiError('NOT_FOUND', `No outcome for suggestion ${suggestionId}.`, 'suggestionId')
    return outcome
  }

  async querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionListItem>> {
    let items: SuggestionListItem[] = this.engine.getAllSuggestions().map((s) => ({
      ...s,
      outcomeVerdict: this.outcomes.get(s.suggestionId)?.verdict ?? null,
    }))
    if (query.siteId) {
      items = items.filter((s) => this.engine.getAlert(s.alertId)?.siteId === query.siteId)
    }
    if (query.zoneId) items = items.filter((s) => this.engine.getAlert(s.alertId)?.zoneId === query.zoneId)
    if (query.status) items = items.filter((s) => s.status === query.status)
    if (query.action) items = items.filter((s) => s.action === query.action)
    if (query.textSource) items = items.filter((s) => s.textSource === query.textSource)
    if (query.actorId) {
      items = items.filter((s) => s.confirmedBy === query.actorId || s.dismissedBy === query.actorId)
    }
    return paginate(items, query.page, query.pageSize)
  }

  /* ---------------------------------------------------------------- */
  /* History, replay                                                     */
  /* ---------------------------------------------------------------- */

  async queryHistory(query: HistoryQuery): Promise<Page<HistoryEvent>> {
    let items = this.historyEvents
    if (query.siteId) items = items.filter((h) => h.siteId === query.siteId)
    if (query.zoneId) items = items.filter((h) => h.zoneId === query.zoneId)
    if (query.type) items = items.filter((h) => h.type === query.type)
    if (query.from) items = items.filter((h) => h.ts >= (query.from as string))
    if (query.to) items = items.filter((h) => h.ts <= (query.to as string))
    if (query.q) {
      const q = query.q.toLowerCase()
      items = items.filter((h) => h.summary.toLowerCase().includes(q) || h.refId.toLowerCase().includes(q))
    }
    return paginate(items, query.page, query.pageSize)
  }

  /**
   * Frames for a period, built in one pass over the retained samples.
   *
   * Deliberately not one `getRange` call per cell per frame: that is
   * quadratic and, at ten minutes of 1 Hz history over a full grid, it
   * locked the browser hard enough to look like a crash. Here every sample
   * is visited once and dropped into its bucket, so cost scales with how
   * much history exists rather than with frames multiplied by cells.
   *
   * `MAX_REPLAY_FRAMES` is a hard stop rather than a rounding: a request
   * wide enough to exceed it gets the frames it asked for up to the cap,
   * because returning a truncated replay a viewer can scrub is better than
   * returning nothing, and far better than allocating until the tab dies.
   */
  async getReplayFrames(_siteId: string, range: TimeRange, stepMs: number): Promise<ReplayFrame[]> {
    const fromMs = Date.parse(range.from)
    const toMs = Date.parse(range.to)
    const step = Math.max(1, stepMs)

    const bucketCount = Math.min(MAX_REPLAY_FRAMES, Math.floor((toMs - fromMs) / step) + 1)
    if (bucketCount <= 0) return []

    const frames: ReplayFrame[] = []
    for (let i = 0; i < bucketCount; i += 1) {
      frames.push({ ts: new Date(fromMs + i * step).toISOString(), cells: [], zones: [], drones: [] })
    }

    const bucketOf = (tsMs: number): number => {
      if (tsMs < fromMs || tsMs > toMs) return -1
      const index = Math.floor((tsMs - fromMs) / step)
      return index >= 0 && index < bucketCount ? index : -1
    }

    this.cellStore.forEachSample((_cellId, sample, tsMs) => {
      const index = bucketOf(tsMs)
      if (index !== -1) frames[index].cells.push(sample)
    })

    for (const series of this.zoneHistory.values()) {
      for (const zone of series) {
        const index = bucketOf(Date.parse(zone.ts))
        if (index !== -1) frames[index].zones.push(zone)
      }
    }

    for (const series of this.droneHistory.values()) {
      for (const drone of series) {
        const index = bucketOf(Date.parse(drone.ts))
        if (index !== -1) frames[index].drones.push(drone)
      }
    }

    return frames
  }

  /* ---------------------------------------------------------------- */
  /* Configuration - FR9                                                 */
  /* ---------------------------------------------------------------- */

  async putSitePlan(_siteId: string, plan: SitePlanInput): Promise<Site> {
    const previous = this.site
    this.site = { ...this.site, planImageUrl: plan.imageDataUrl, groundExtentM: plan.groundExtentM }
    this.audit('PUT_SITE_PLAN', 'Site', this.site.id, { groundExtentM: previous.groundExtentM }, { groundExtentM: plan.groundExtentM })
    return this.site
  }

  async putGrid(_siteId: string, gridConfig: GridConfig): Promise<Grid> {
    // Scope note: this updates the configuration record only. Regenerating
    // the 2400-cell canonical grid and every zone/alert seeded against it
    // is out of scope for the mock layer; the running demo simulation keeps
    // its original layout regardless of this call.
    const previous = this.grid
    this.grid = {
      ...this.grid,
      cellSizeM: gridConfig.cellSizeM,
      originLatLon: gridConfig.originLatLon,
      cols: GRID_COLUMNS,
      rows: GRID_ROWS,
    }
    this.audit('PUT_GRID', 'Grid', this.site.id, { cellSizeM: previous.cellSizeM }, { cellSizeM: this.grid.cellSizeM })
    return this.grid
  }

  async getSetupProposals(siteId: string): Promise<SetupProposal[]> {
    void siteId
    return this.setupProposals
  }

  async resolveSetupProposal(id: string, decision: ProposalDecision): Promise<SetupProposal> {
    const proposal = this.setupProposals.find((p) => p.proposalId === id)
    if (!proposal) this.apiError('NOT_FOUND', `No setup proposal with id ${id}.`, 'id')
    const status = decision.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
    const updated: SetupProposal = { ...proposal, status }
    this.setupProposals = this.setupProposals.map((p) => (p.proposalId === id ? updated : p))
    if (status === 'ACCEPTED') {
      const attribute = decision.correctedAttribute ?? proposal.proposedAttribute
      for (const cellId of proposal.cellIds) this.applyCellAttribute(cellId, attribute)
    }
    this.audit('RESOLVE_SETUP_PROPOSAL', 'SetupProposal', id, { status: proposal.status }, { status })
    return updated
  }

  private applyCellAttribute(cellId: string, attribute: 'EXIT' | 'BARRIER' | 'OBSTRUCTION'): void {
    const cell = this.cells.get(cellId)
    if (!cell) return
    this.cells.set(cellId, {
      ...cell,
      isExit: attribute === 'EXIT',
      isBarrier: attribute === 'BARRIER',
      isObstruction: attribute === 'OBSTRUCTION',
      walkable: attribute !== 'BARRIER' && attribute !== 'OBSTRUCTION',
    })
  }

  async patchCellAttributes(_siteId: string, cellId: string, attrs: CellAttributes): Promise<Cell> {
    const cell = this.cells.get(cellId)
    if (!cell) this.apiError('NOT_FOUND', `No cell with id ${cellId}.`, 'cellId')
    const updated: Cell = { ...cell, ...attrs }
    this.cells.set(cellId, updated)
    this.audit('PATCH_CELL_ATTRIBUTES', 'Cell', cellId, cell, updated)
    return updated
  }

  async getZones(_siteId: string): Promise<Zone[]> {
    return [...this.zones.values()]
  }

  async getExits(_siteId: string): Promise<Exit[]> {
    return [...this.exits.values()]
  }

  async getThresholds(_siteId: string): Promise<ThresholdSet[]> {
    return [...this.thresholds.values()]
  }

  async putExits(_siteId: string, exitInputs: ExitInput[]): Promise<Exit[]> {
    const previous = [...this.exits.values()]
    this.exits = new Map(exitInputs.map((e) => [e.exitId, { ...e, siteId: this.site.id }]))
    this.audit('PUT_EXITS', 'Exit', this.site.id, previous, [...this.exits.values()])
    return [...this.exits.values()]
  }

  async saveZone(_siteId: string, zoneInput: ZoneInput): Promise<Zone> {
    const isNew = !this.zones.has(zoneInput.zoneId)
    if (isNew && this.zones.size >= MAX_ZONES) {
      this.apiError('ZONE_LIMIT_REACHED', 'A site supports between two and four zones.', 'zones')
    }
    const zone: Zone = { ...zoneInput, siteId: this.site.id }
    this.zones.set(zone.zoneId, zone)
    this.audit('SAVE_ZONE', 'Zone', zone.zoneId, null, zone)
    return zone
  }

  async deleteZone(_siteId: string, zoneId: string): Promise<void> {
    if (this.zones.size <= MIN_ZONES) {
      this.apiError('ZONE_LIMIT_REACHED', 'A site supports between two and four zones.', 'zones')
    }
    this.zones.delete(zoneId)
    this.audit('DELETE_ZONE', 'Zone', zoneId, { existed: true }, { existed: false })
  }

  async putThresholds(_siteId: string, thresholds: ThresholdSet): Promise<ThresholdSet> {
    const previous = this.thresholds.get(thresholds.zoneId)
    const updated: ThresholdSet = {
      ...thresholds,
      siteId: this.site.id,
      version: (previous?.version ?? 0) + 1,
      changedBy: this.currentUserId ?? 'system',
      changedAt: this.engine.getCurrentTs(),
    }
    this.thresholds.set(thresholds.zoneId, updated)
    this.audit('UPDATE_THRESHOLDS', 'ThresholdSet', thresholds.zoneId, previous, updated)
    return updated
  }

  /* ---------------------------------------------------------------- */
  /* Accounts and audit - FR10                                           */
  /* ---------------------------------------------------------------- */

  async getUsers(): Promise<User[]> {
    return [...this.users.values()]
  }

  async saveUser(userInput: UserInput): Promise<User> {
    if (userInput.userId && this.users.has(userInput.userId)) {
      const previous = this.users.get(userInput.userId) as User
      const updated: User = { ...previous, username: userInput.username, role: userInput.role }
      this.users.set(updated.userId, updated)
      if (userInput.password) this.passwords.set(updated.userId, userInput.password)
      this.audit('SAVE_USER', 'User', updated.userId, previous, updated)
      return updated
    }
    const userId = userInput.userId ?? userInput.username
    const created: User = {
      userId,
      username: userInput.username,
      role: userInput.role,
      active: true,
      createdAt: this.engine.getCurrentTs(),
      lastLoginAt: null,
    }
    this.users.set(userId, created)
    this.passwords.set(userId, userInput.password ?? SEED_PASSWORD)
    this.userSeq += 1
    this.audit('SAVE_USER', 'User', userId, null, created)
    return created
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = this.users.get(userId)
    if (!user) this.apiError('NOT_FOUND', `No user with id ${userId}.`, 'userId')
    const updated: User = { ...user, active: false }
    this.users.set(userId, updated)
    this.audit('DEACTIVATE_USER', 'User', userId, { active: true }, { active: false })
    return updated
  }

  async getRoles(): Promise<RoleDefinition[]> {
    return [
      {
        role: ROLE.COORDINATOR,
        capabilities: ['VIEW_LIVE_MAP', 'ACKNOWLEDGE_ALERT', 'VIEW_SUGGESTIONS', 'CONFIRM_SUGGESTION', 'DISMISS_SUGGESTION', 'VIEW_HISTORY'],
      },
      {
        role: ROLE.ADMINISTRATOR,
        capabilities: [
          'VIEW_LIVE_MAP',
          'ACKNOWLEDGE_ALERT',
          'VIEW_SUGGESTIONS',
          'CONFIRM_SUGGESTION',
          'DISMISS_SUGGESTION',
          'VIEW_HISTORY',
          'CONFIGURE_SITE',
          'MANAGE_ACCOUNTS',
          'VIEW_SYSTEM_HEALTH',
          'VIEW_ANALYTICS',
        ],
      },
      { role: ROLE.DRONE_OPERATOR, capabilities: ['VIEW_LIVE_MAP', 'ACKNOWLEDGE_ALERT', 'ASSIGN_DRONE'] },
      { role: ROLE.IT, capabilities: ['VIEW_SYSTEM_HEALTH', 'VIEW_ACCOUNTS_READ_ONLY', 'VIEW_ROLES'] },
    ]
  }

  async queryAuditLog(query: AuditQuery): Promise<Page<AuditEntry>> {
    let items = this.auditLog
    if (query.actorId) items = items.filter((a) => a.actorId === query.actorId)
    if (query.action) items = items.filter((a) => a.action === query.action)
    if (query.targetType) items = items.filter((a) => a.targetType === query.targetType)
    if (query.from) items = items.filter((a) => a.ts >= (query.from as string))
    if (query.to) items = items.filter((a) => a.ts <= (query.to as string))
    if (query.q) {
      const q = query.q.toLowerCase()
      items = items.filter((a) => a.targetId.toLowerCase().includes(q) || a.action.toLowerCase().includes(q))
    }
    return paginate(items, query.page, query.pageSize)
  }

  /* ---------------------------------------------------------------- */
  /* Push                                                                */
  /* ---------------------------------------------------------------- */

  subscribe(channel: LiveChannel, handler: (msg: LiveMessage) => void): Unsubscribe {
    this.channelHandlers[channel].add(handler)
    this.deliverInitial(channel, handler)
    return () => {
      this.channelHandlers[channel].delete(handler)
    }
  }

  private deliverInitial(channel: LiveChannel, handler: (msg: LiveMessage) => void): void {
    const ts = this.engine.getCurrentTs()
    if (channel === 'CELLS') {
      handler({
        type: 'snapshot',
        payload: {
          site: this.site,
          grid: this.grid,
          cells: this.engine.getCellUpdates(ts),
          zones: this.engine.getZoneUpdates(ts),
          drones: this.engine.getDroneUpdates(ts),
        },
      })
      return
    }
    if (channel === 'ZONES') {
      for (const zone of this.engine.getZoneUpdates(ts)) handler({ type: 'zone.update', payload: zone })
      return
    }
    if (channel === 'DRONES') {
      for (const drone of this.engine.getDroneUpdates(ts)) handler({ type: 'drone.update', payload: drone })
      return
    }
    if (channel === 'ALERTS') {
      for (const alert of this.engine.getAlerts()) {
        if (alert.status !== 'CLEARED') handler({ type: 'alert.raised', payload: alert })
      }
      return
    }
    if (channel === 'SUGGESTIONS') {
      const byAlert = new Map<string, SuggestionOption[]>()
      for (const suggestion of this.engine.getAllSuggestions()) {
        const alert = this.engine.getAlert(suggestion.alertId)
        if (!alert || alert.status === 'CLEARED') continue
        const list = byAlert.get(suggestion.alertId) ?? []
        list.push(suggestion)
        byAlert.set(suggestion.alertId, list)
      }
      for (const list of byAlert.values()) handler({ type: 'suggestion.created', payload: list })
      return
    }
    if (channel === 'HEALTH') {
      handler({ type: 'health.update', payload: this.health })
    }
  }

  connectionState(): ConnectionState {
    return this.connState
  }

  /* ---------------------------------------------------------------- */
  /* Convenience for App.tsx wiring only - not part of SentinelClient    */
  /*                                                                    */
  /* srs.md Appendix B marks the demo harness as scaffolding that no     */
  /* requirement depends on, so a real backend must never be asked to    */
  /* implement scenario playback. The composition root reads this once   */
  /* and registers it with src/demo/harness, which is the only boundary  */
  /* D14 sees, so no screen ever imports this file.                      */
  /* ---------------------------------------------------------------- */

  getPlaybackController(): PlaybackController {
    return this.playback
  }

  dispose(): void {
    this.playback.dispose()
  }
}

// Re-exported so a future demo-harness surface (Administrator only,
// srs.md Appendix B) has a typed trajectory shape to build against without
// reaching back into `tickEngine`.
export type { OutcomeTrajectoryPoint }
