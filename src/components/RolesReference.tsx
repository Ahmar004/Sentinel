import { Check, X } from 'lucide-react'
import { ROLE, type Role } from '@/domain/constants'
import { CAPABILITY, PERMISSION_MATRIX, type Capability } from '@/auth/permissions'

const ROLE_LABEL: Record<Role, string> = {
  [ROLE.COORDINATOR]: 'Coordinator',
  [ROLE.ADMINISTRATOR]: 'Administrator',
  [ROLE.DRONE_OPERATOR]: 'Drone operator',
  [ROLE.IT]: 'IT',
}

const ROLES: Role[] = [ROLE.COORDINATOR, ROLE.ADMINISTRATOR, ROLE.DRONE_OPERATOR, ROLE.IT]

const CAPABILITY_LABEL: Record<Capability, string> = {
  [CAPABILITY.VIEW_LIVE_MAP]: 'View live map',
  [CAPABILITY.VIEW_ALERTS_AND_ATTRIBUTION]: 'View alerts and attribution',
  [CAPABILITY.ACKNOWLEDGE_ALERT]: 'Acknowledge an alert',
  [CAPABILITY.VIEW_SUGGESTIONS]: 'View suggestions',
  [CAPABILITY.CONFIRM_OR_DISMISS_SUGGESTION]: 'Confirm or dismiss a suggestion',
  [CAPABILITY.VIEW_HISTORY_AND_REPLAY]: 'View history and replay',
  [CAPABILITY.VIEW_REPORTING_AND_ANALYTICS]: 'View reporting and analytics',
  [CAPABILITY.VIEW_PER_DRONE_AND_TELEMETRY]: 'View per-drone telemetry',
  [CAPABILITY.ASSIGN_DRONE]: 'Assign a drone',
  [CAPABILITY.VENUE_SETUP]: 'Venue setup',
  [CAPABILITY.EDIT_THRESHOLDS]: 'Edit thresholds',
  [CAPABILITY.VIEW_ROLES_REFERENCE]: 'View roles reference',
  [CAPABILITY.MANAGE_ACCOUNTS]: 'Manage accounts',
  [CAPABILITY.VIEW_SYSTEM_HEALTH]: 'View system health',
  [CAPABILITY.VIEW_AUDIT_LOG]: 'View audit log',
}

const CAPABILITIES = Object.keys(PERMISSION_MATRIX) as Capability[]

/**
 * design.md C11. Reads `PERMISSION_MATRIX` directly - the same table
 * `navEntriesForRole` and `hasCapability` (`src/auth/permissions.ts`)
 * derive the actual navigation and route guards from - so this reference
 * can never describe a permission the app does not really enforce.
 */
export default function RolesReference() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr>
            <th className="border-b border-border py-2 pr-3 text-left font-semibold text-ink-muted">Capability</th>
            {ROLES.map((role) => (
              <th key={role} className="border-b border-border px-2 py-2 text-center font-semibold text-ink-muted">
                {ROLE_LABEL[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((capability) => (
            <tr key={capability}>
              <td className="border-b border-border py-1.5 pr-3">{CAPABILITY_LABEL[capability]}</td>
              {ROLES.map((role) => {
                const allowed = PERMISSION_MATRIX[capability][role]
                return (
                  <td key={role} className="border-b border-border px-2 py-1.5 text-center">
                    {allowed ? (
                      <Check className="mx-auto size-3.5 text-[var(--color-status-online)]" aria-label="Allowed" />
                    ) : (
                      <X className="mx-auto size-3.5 text-ink-muted" aria-label="Not allowed" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
