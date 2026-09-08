import {
  OBSERVATION_STATE,
  RISK_BAND,
  DRONE_STATE,
  DRONE_LINK,
  ALERT_STATUS,
  SUGGESTION_STATUS,
  OUTCOME_VERDICT,
  CONNECTION_STATE,
  type ObservationState,
  type RiskBand,
  type DroneState,
  type DroneLink,
  type AlertStatus,
  type SuggestionStatus,
  type OutcomeVerdict,
  type ConnectionState,
} from '@/domain/constants'

/**
 * design.md C10: the single renderer of every domain status string.
 * Nothing else in the app may render these strings directly - every
 * screen imports `StateChip` instead, so a label can never drift from
 * this one map. Kept in its own module (rather than inside `StateChip.tsx`)
 * so the component file exports only the component, per fast-refresh
 * conventions, while tests and other C10 consumers can still import the
 * label tables directly.
 */
export type StateChipProps =
  | { kind: 'observationState'; value: ObservationState }
  | { kind: 'riskBand'; value: RiskBand }
  | { kind: 'droneState'; value: DroneState }
  | { kind: 'droneLink'; value: DroneLink }
  | { kind: 'alertStatus'; value: AlertStatus }
  | { kind: 'suggestionStatus'; value: SuggestionStatus }
  | { kind: 'outcomeVerdict'; value: OutcomeVerdict }
  | { kind: 'connectionState'; value: ConnectionState }

export const OBSERVATION_STATE_LABEL: Record<ObservationState, string> = {
  [OBSERVATION_STATE.OBSERVED]: 'Observed',
  [OBSERVATION_STATE.NOT_ENOUGH_DWELL]: 'Not enough dwell',
  [OBSERVATION_STATE.STALE]: 'Stale',
  [OBSERVATION_STATE.GAP]: 'Gap',
}
export const OBSERVATION_STATE_TOKEN: Record<ObservationState, string> = {
  [OBSERVATION_STATE.OBSERVED]: 'var(--color-status-online)',
  [OBSERVATION_STATE.NOT_ENOUGH_DWELL]: 'var(--color-obs-not-enough-dwell-fill)',
  [OBSERVATION_STATE.STALE]: 'var(--color-obs-stale-fill)',
  [OBSERVATION_STATE.GAP]: 'var(--color-obs-gap-fill)',
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  [RISK_BAND.NORMAL]: 'Normal',
  [RISK_BAND.WATCH]: 'Watch',
  [RISK_BAND.ELEVATED]: 'Elevated',
  [RISK_BAND.CRITICAL]: 'Critical',
}
export const RISK_BAND_TOKEN: Record<RiskBand, string> = {
  [RISK_BAND.NORMAL]: 'var(--color-risk-normal)',
  [RISK_BAND.WATCH]: 'var(--color-risk-watch)',
  [RISK_BAND.ELEVATED]: 'var(--color-risk-elevated)',
  [RISK_BAND.CRITICAL]: 'var(--color-risk-critical)',
}

export const DRONE_STATE_LABEL: Record<DroneState, string> = {
  [DRONE_STATE.OBSERVE]: 'Observing',
  [DRONE_STATE.TRANSIT]: 'In transit',
}
export const DRONE_STATE_TOKEN: Record<DroneState, string> = {
  [DRONE_STATE.OBSERVE]: 'var(--color-status-online)',
  [DRONE_STATE.TRANSIT]: 'var(--color-accent)',
}

export const DRONE_LINK_LABEL: Record<DroneLink, string> = {
  [DRONE_LINK.ONLINE]: 'Online',
  [DRONE_LINK.DEGRADED]: 'Degraded',
  [DRONE_LINK.OFFLINE]: 'Offline',
}
export const DRONE_LINK_TOKEN: Record<DroneLink, string> = {
  [DRONE_LINK.ONLINE]: 'var(--color-status-online)',
  [DRONE_LINK.DEGRADED]: 'var(--color-status-degraded)',
  [DRONE_LINK.OFFLINE]: 'var(--color-status-offline)',
}

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  [ALERT_STATUS.OPEN]: 'Open',
  [ALERT_STATUS.ACKNOWLEDGED]: 'Acknowledged',
  [ALERT_STATUS.CLEARED]: 'Cleared',
}
export const ALERT_STATUS_TOKEN: Record<AlertStatus, string> = {
  [ALERT_STATUS.OPEN]: 'var(--color-risk-critical)',
  [ALERT_STATUS.ACKNOWLEDGED]: 'var(--color-status-degraded)',
  [ALERT_STATUS.CLEARED]: 'var(--color-status-online)',
}

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
  [SUGGESTION_STATUS.PROPOSED]: 'Proposed',
  [SUGGESTION_STATUS.CONFIRMED]: 'Confirmed',
  [SUGGESTION_STATUS.DISMISSED]: 'Dismissed',
  [SUGGESTION_STATUS.REJECTED]: 'Rejected',
  [SUGGESTION_STATUS.EXPIRED]: 'Expired',
}
export const SUGGESTION_STATUS_TOKEN: Record<SuggestionStatus, string> = {
  [SUGGESTION_STATUS.PROPOSED]: 'var(--color-accent)',
  [SUGGESTION_STATUS.CONFIRMED]: 'var(--color-status-online)',
  [SUGGESTION_STATUS.DISMISSED]: 'var(--color-status-offline)',
  [SUGGESTION_STATUS.REJECTED]: 'var(--color-risk-critical)',
  [SUGGESTION_STATUS.EXPIRED]: 'var(--color-status-offline)',
}

export const OUTCOME_VERDICT_LABEL: Record<OutcomeVerdict, string> = {
  [OUTCOME_VERDICT.PENDING]: 'Pending',
  [OUTCOME_VERDICT.IMPROVED]: 'Improved',
  [OUTCOME_VERDICT.UNCHANGED]: 'Unchanged',
  [OUTCOME_VERDICT.WORSENED]: 'Worsened',
}
export const OUTCOME_VERDICT_TOKEN: Record<OutcomeVerdict, string> = {
  [OUTCOME_VERDICT.PENDING]: 'var(--color-status-degraded)',
  [OUTCOME_VERDICT.IMPROVED]: 'var(--color-risk-normal)',
  [OUTCOME_VERDICT.UNCHANGED]: 'var(--color-risk-watch)',
  [OUTCOME_VERDICT.WORSENED]: 'var(--color-risk-critical)',
}

export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  [CONNECTION_STATE.CONNECTING]: 'Connecting',
  [CONNECTION_STATE.LIVE]: 'Live',
  [CONNECTION_STATE.DEGRADED]: 'Degraded',
  [CONNECTION_STATE.DISCONNECTED]: 'Disconnected',
}

/** So other C10 consumers (RolesReference, tests) can list every value
 * StateChip knows how to render without re-deriving it from the constants
 * module by hand. */
export const STATE_CHIP_LABELS = {
  observationState: OBSERVATION_STATE_LABEL,
  riskBand: RISK_BAND_LABEL,
  droneState: DRONE_STATE_LABEL,
  droneLink: DRONE_LINK_LABEL,
  alertStatus: ALERT_STATUS_LABEL,
  suggestionStatus: SUGGESTION_STATUS_LABEL,
  outcomeVerdict: OUTCOME_VERDICT_LABEL,
  connectionState: CONNECTION_STATE_LABEL,
} as const
