/**
 * Normative glossary and constants - srs.md Appendix A.
 *
 * These are the exact identifiers the SRS fixes. No domain enum literal may
 * be hardcoded in a component: import the value from here instead.
 */

export const OBSERVATION_STATE = {
  OBSERVED: 'OBSERVED',
  NOT_ENOUGH_DWELL: 'NOT_ENOUGH_DWELL',
  STALE: 'STALE',
  GAP: 'GAP',
} as const
export type ObservationState = (typeof OBSERVATION_STATE)[keyof typeof OBSERVATION_STATE]

export const RISK_BAND = {
  NORMAL: 'NORMAL',
  WATCH: 'WATCH',
  ELEVATED: 'ELEVATED',
  CRITICAL: 'CRITICAL',
} as const
export type RiskBand = (typeof RISK_BAND)[keyof typeof RISK_BAND]

export const DRONE_STATE = {
  OBSERVE: 'OBSERVE',
  TRANSIT: 'TRANSIT',
} as const
export type DroneState = (typeof DRONE_STATE)[keyof typeof DRONE_STATE]

export const DRONE_LINK = {
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
} as const
export type DroneLink = (typeof DRONE_LINK)[keyof typeof DRONE_LINK]

export const ALERT_STATUS = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  CLEARED: 'CLEARED',
} as const
export type AlertStatus = (typeof ALERT_STATUS)[keyof typeof ALERT_STATUS]

export const SUGGESTION_STATUS = {
  PROPOSED: 'PROPOSED',
  CONFIRMED: 'CONFIRMED',
  DISMISSED: 'DISMISSED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const
export type SuggestionStatus = (typeof SUGGESTION_STATUS)[keyof typeof SUGGESTION_STATUS]

export const SUGGESTION_ACTION = {
  DIVERT: 'DIVERT',
  HOLD_AND_METER: 'HOLD_AND_METER',
  OPEN_ALTERNATE_ROUTE: 'OPEN_ALTERNATE_ROUTE',
  SLOW_INFLOW: 'SLOW_INFLOW',
} as const
export type SuggestionAction = (typeof SUGGESTION_ACTION)[keyof typeof SUGGESTION_ACTION]

export const SAFEGUARD_CHECK = {
  OVER_THRESHOLD_CELL: 'OVER_THRESHOLD_CELL',
  WOULD_PUSH_NEIGHBOUR_OVER: 'WOULD_PUSH_NEIGHBOUR_OVER',
  STALE_CELL_ON_ROUTE: 'STALE_CELL_ON_ROUTE',
  UNKNOWN_CELL_ON_ROUTE: 'UNKNOWN_CELL_ON_ROUTE',
  EXIT_OVER_CAPACITY: 'EXIT_OVER_CAPACITY',
} as const
export type SafeguardCheck = (typeof SAFEGUARD_CHECK)[keyof typeof SAFEGUARD_CHECK]

export const TEXT_SOURCE = {
  MODEL: 'MODEL',
  TEMPLATE: 'TEMPLATE',
} as const
export type TextSource = (typeof TEXT_SOURCE)[keyof typeof TEXT_SOURCE]

export const OUTCOME_VERDICT = {
  PENDING: 'PENDING',
  IMPROVED: 'IMPROVED',
  UNCHANGED: 'UNCHANGED',
  WORSENED: 'WORSENED',
} as const
export type OutcomeVerdict = (typeof OUTCOME_VERDICT)[keyof typeof OUTCOME_VERDICT]

export const ROLE = {
  COORDINATOR: 'COORDINATOR',
  ADMINISTRATOR: 'ADMINISTRATOR',
  DRONE_OPERATOR: 'DRONE_OPERATOR',
  IT: 'IT',
} as const
export type Role = (typeof ROLE)[keyof typeof ROLE]

export const RISK_FEATURE = {
  density: 'density',
  densityGradient: 'densityGradient',
  densityRateOfChange: 'densityRateOfChange',
  flowConvergence: 'flowConvergence',
  counterFlow: 'counterFlow',
  speedMean: 'speedMean',
  speedVariance: 'speedVariance',
  stopStartPulses: 'stopStartPulses',
  exitOccupancy: 'exitOccupancy',
} as const
export type RiskFeature = (typeof RISK_FEATURE)[keyof typeof RISK_FEATURE]

export const CONNECTION_STATE = {
  CONNECTING: 'CONNECTING',
  LIVE: 'LIVE',
  DEGRADED: 'DEGRADED',
  DISCONNECTED: 'DISCONNECTED',
} as const
export type ConnectionState = (typeof CONNECTION_STATE)[keyof typeof CONNECTION_STATE]
