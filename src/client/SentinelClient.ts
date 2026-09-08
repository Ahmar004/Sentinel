import type { ConnectionState as ConnectionStateType } from '@/domain/constants'
import type {
  AlertQuery,
  AnalyticsSummary,
  Alert,
  AreaTarget,
  AuditEntry,
  AuditQuery,
  Cell,
  CellAttributes,
  CellSample,
  Credentials,
  Drone,
  Exit,
  ExitInput,
  Grid,
  GridConfig,
  HistoryEvent,
  HistoryQuery,
  LiveChannel,
  LiveMessage,
  Outcome,
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
} from '@/domain/types'

// ConnectionState is imported under an alias purely so this file can also
// export the method `connectionState()` without a naming collision; the
// type itself is the enum from srs.md Appendix A.
export type ConnectionState = ConnectionStateType

/**
 * The SentinelClient contract - srs.md Section 3.5, verbatim.
 *
 * Both the mock and the real implementation satisfy this one interface.
 * Views and hooks consume the interface only, never a fixture and never a
 * raw fetch. This file declares the contract only: no HTTP, no WebSocket,
 * no mock data. `MockSentinelClient` and `HttpSentinelClient` are separate
 * modules that implement it.
 */
export interface SentinelClient {
  // request and response, mirroring Section 3.1
  login(credentials: Credentials): Promise<Session>
  getSiteState(siteId: string): Promise<SiteState>
  getCellHistory(cellId: string, range: TimeRange): Promise<CellSample[]>
  getZoneHistory(siteId: string, range: TimeRange, stepMs?: number): Promise<ZoneSample[]>
  getDrones(siteId: string): Promise<Drone[]>
  assignDrone(droneId: string, target: AreaTarget): Promise<Drone>
  queryAlerts(query: AlertQuery): Promise<Page<Alert>>
  acknowledgeAlert(alertId: string): Promise<Alert>
  getSuggestions(alertId: string): Promise<SuggestionOption[]>
  confirmSuggestion(suggestionId: string): Promise<SuggestionOption>
  dismissSuggestion(suggestionId: string): Promise<SuggestionOption>
  getOutcome(suggestionId: string): Promise<Outcome>
  querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionListItem>>
  queryHistory(query: HistoryQuery): Promise<Page<HistoryEvent>>
  getReplayFrames(siteId: string, range: TimeRange, stepMs: number): Promise<ReplayFrame[]>
  getHealth(): Promise<SystemHealth>
  getAnalytics(siteId: string, range: TimeRange): Promise<AnalyticsSummary>

  // configuration, FR9
  putSitePlan(siteId: string, plan: SitePlanInput): Promise<Site>
  putGrid(siteId: string, grid: GridConfig): Promise<Grid>
  getSetupProposals(siteId: string): Promise<SetupProposal[]>
  resolveSetupProposal(id: string, decision: ProposalDecision): Promise<SetupProposal>
  patchCellAttributes(siteId: string, cellId: string, attrs: CellAttributes): Promise<Cell>
  getZones(siteId: string): Promise<Zone[]>
  getExits(siteId: string): Promise<Exit[]>
  getThresholds(siteId: string): Promise<ThresholdSet[]>
  putExits(siteId: string, exits: ExitInput[]): Promise<Exit[]>
  saveZone(siteId: string, zone: ZoneInput): Promise<Zone>
  deleteZone(siteId: string, zoneId: string): Promise<void>
  putThresholds(siteId: string, thresholds: ThresholdSet): Promise<ThresholdSet>

  // accounts and audit, FR10
  getUsers(): Promise<User[]>
  saveUser(user: UserInput): Promise<User>
  deactivateUser(userId: string): Promise<User>
  getRoles(): Promise<RoleDefinition[]>
  queryAuditLog(query: AuditQuery): Promise<Page<AuditEntry>>

  // push, mirroring Section 3.2
  subscribe(channel: LiveChannel, handler: (msg: LiveMessage) => void): Unsubscribe
  connectionState(): ConnectionState
}
