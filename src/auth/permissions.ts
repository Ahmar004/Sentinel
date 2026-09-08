import { ROLE, type Role } from '@/domain/constants'

/**
 * The one permission matrix - srs.md Section 2.4.
 *
 * Every role-dependent decision in the front-end derives from this table
 * and nothing else: no ad hoc `role === 'ADMINISTRATOR'` checks scattered
 * through components. `navEntriesForRole`, `landingRouteForRole` and any
 * future route guard all read this same matrix, so the navigation can
 * never offer a screen the matrix would refuse.
 */
export const CAPABILITY = {
  VIEW_LIVE_MAP: 'VIEW_LIVE_MAP',
  VIEW_ALERTS_AND_ATTRIBUTION: 'VIEW_ALERTS_AND_ATTRIBUTION',
  ACKNOWLEDGE_ALERT: 'ACKNOWLEDGE_ALERT',
  VIEW_SUGGESTIONS: 'VIEW_SUGGESTIONS',
  CONFIRM_OR_DISMISS_SUGGESTION: 'CONFIRM_OR_DISMISS_SUGGESTION',
  VIEW_HISTORY_AND_REPLAY: 'VIEW_HISTORY_AND_REPLAY',
  VIEW_REPORTING_AND_ANALYTICS: 'VIEW_REPORTING_AND_ANALYTICS',
  VIEW_PER_DRONE_AND_TELEMETRY: 'VIEW_PER_DRONE_AND_TELEMETRY',
  ASSIGN_DRONE: 'ASSIGN_DRONE',
  VENUE_SETUP: 'VENUE_SETUP',
  EDIT_THRESHOLDS: 'EDIT_THRESHOLDS',
  VIEW_ROLES_REFERENCE: 'VIEW_ROLES_REFERENCE',
  MANAGE_ACCOUNTS: 'MANAGE_ACCOUNTS',
  VIEW_SYSTEM_HEALTH: 'VIEW_SYSTEM_HEALTH',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
} as const
export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY]

const { COORDINATOR, ADMINISTRATOR, DRONE_OPERATOR, IT } = ROLE

/** srs.md 2.4, transcribed row for row. */
export const PERMISSION_MATRIX: Record<Capability, Record<Role, boolean>> = {
  [CAPABILITY.VIEW_LIVE_MAP]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: false },
  [CAPABILITY.VIEW_ALERTS_AND_ATTRIBUTION]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: false },
  [CAPABILITY.ACKNOWLEDGE_ALERT]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: false },
  [CAPABILITY.VIEW_SUGGESTIONS]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.CONFIRM_OR_DISMISS_SUGGESTION]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.VIEW_HISTORY_AND_REPLAY]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.VIEW_REPORTING_AND_ANALYTICS]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.VIEW_PER_DRONE_AND_TELEMETRY]: { [COORDINATOR]: true, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: false },
  [CAPABILITY.ASSIGN_DRONE]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: false },
  [CAPABILITY.VENUE_SETUP]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.EDIT_THRESHOLDS]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.VIEW_ROLES_REFERENCE]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: true },
  [CAPABILITY.MANAGE_ACCOUNTS]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: false },
  [CAPABILITY.VIEW_SYSTEM_HEALTH]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: true, [IT]: true },
  [CAPABILITY.VIEW_AUDIT_LOG]: { [COORDINATOR]: false, [ADMINISTRATOR]: true, [DRONE_OPERATOR]: false, [IT]: true },
}

export function hasCapability(role: Role, capability: Capability): boolean {
  return PERMISSION_MATRIX[capability][role]
}

export function capabilitiesForRole(role: Role): Capability[] {
  return (Object.keys(PERMISSION_MATRIX) as Capability[]).filter((capability) =>
    hasCapability(role, capability),
  )
}

/**
 * Navigation - design.md Section 3.2, plus `/suggestions` and `/analytics`
 * for Coordinator and Administrator only (decisions D22, D23). Each entry
 * names the capability that must be true for the role to see it, so the
 * navigation can never drift from the permission matrix above.
 */
export interface NavEntry {
  id: string
  label: string
  route: string
  capability: Capability
}

const NAV_ENTRIES: NavEntry[] = [
  { id: 'live', label: 'Live map', route: '/live', capability: CAPABILITY.VIEW_LIVE_MAP },
  { id: 'timeline', label: 'Timeline', route: '/timeline', capability: CAPABILITY.VIEW_HISTORY_AND_REPLAY },
  { id: 'fleet', label: 'Fleet', route: '/fleet', capability: CAPABILITY.VIEW_PER_DRONE_AND_TELEMETRY },
  { id: 'history', label: 'History', route: '/history', capability: CAPABILITY.VIEW_HISTORY_AND_REPLAY },
  { id: 'suggestions', label: 'Suggestions', route: '/suggestions', capability: CAPABILITY.VIEW_SUGGESTIONS },
  { id: 'analytics', label: 'Analytics', route: '/analytics', capability: CAPABILITY.VIEW_REPORTING_AND_ANALYTICS },
  { id: 'replay', label: 'Replay', route: '/replay', capability: CAPABILITY.VIEW_HISTORY_AND_REPLAY },
  { id: 'config', label: 'Configuration', route: '/config', capability: CAPABILITY.VENUE_SETUP },
  { id: 'accounts', label: 'Accounts', route: '/accounts', capability: CAPABILITY.MANAGE_ACCOUNTS },
  { id: 'audit', label: 'Audit log', route: '/audit', capability: CAPABILITY.VIEW_AUDIT_LOG },
  { id: 'health', label: 'System health', route: '/health', capability: CAPABILITY.VIEW_SYSTEM_HEALTH },
  { id: 'roles', label: 'Roles reference', route: '/roles', capability: CAPABILITY.VIEW_ROLES_REFERENCE },
]

export function navEntriesForRole(role: Role): NavEntry[] {
  return NAV_ENTRIES.filter((entry) => hasCapability(role, entry.capability))
}

/**
 * Landing route after login, by role - design.md Section 3.2. Coordinator
 * and Administrator land on the live map, the Drone Operator lands on the
 * fleet (the Operator's live map access is real but the fleet is the
 * role's actual job), and IT lands on system health because the role has
 * no operational crowd data to land on at all (srs.md 2.4).
 */
export function landingRouteForRole(role: Role): string {
  switch (role) {
    case ROLE.COORDINATOR:
    case ROLE.ADMINISTRATOR:
      return '/live'
    case ROLE.DRONE_OPERATOR:
      return '/fleet'
    case ROLE.IT:
      return '/health'
  }
}
