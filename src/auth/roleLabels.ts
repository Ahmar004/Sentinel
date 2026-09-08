import { ROLE, type Role } from '@/domain/constants'

/** The one place a role enum becomes words a person reads. Nothing else
 * spells these out, so "Drone operator" cannot become "Operator" on one
 * screen and "Pilot" on another (CLAUDE.md: no invented synonyms). */
export const ROLE_LABEL: Record<Role, string> = {
  [ROLE.COORDINATOR]: 'Coordinator',
  [ROLE.ADMINISTRATOR]: 'Administrator',
  [ROLE.DRONE_OPERATOR]: 'Drone operator',
  [ROLE.IT]: 'IT',
}
