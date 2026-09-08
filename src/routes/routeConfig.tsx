import type { ReactElement } from 'react'
import { ROLE, type Role } from '@/domain/constants'
import S02LiveMap from '@/screens/S02LiveMap'
import S03ZoneDetail from '@/screens/S03ZoneDetail'
import S04AlertDetail from '@/screens/S04AlertDetail'
import S05RiskTimeline from '@/screens/S05RiskTimeline'
import S06DroneFleet from '@/screens/S06DroneFleet'
import S07PerDroneView from '@/screens/S07PerDroneView'
import S08History from '@/screens/S08History'
import S09EventDetail from '@/screens/S09EventDetail'
import S10Replay from '@/screens/S10Replay'
import S11VenueSetupWizard from '@/screens/S11VenueSetupWizard'
import S12SiteConfiguration from '@/screens/S12SiteConfiguration'
import S13Accounts from '@/screens/S13Accounts'
import S14AuditLog from '@/screens/S14AuditLog'
import S15SystemHealth from '@/screens/S15SystemHealth'
import S17RolesReference from '@/screens/S17RolesReference'
import S18Suggestions from '@/screens/S18Suggestions'
import S19Analytics from '@/screens/S19Analytics'

const { COORDINATOR, ADMINISTRATOR, DRONE_OPERATOR, IT } = ROLE

export interface RouteDef {
  screenId: string
  path: string
  roles: readonly Role[]
  element: ReactElement
}

/**
 * The screen inventory - design.md Section 4, S02 to S19 (S01 Login and
 * S16 Not permitted are routed outside the authenticated shell in
 * `src/App.tsx`). Each entry's `roles` is exactly the "Roles" column of
 * that table, which is the single source `RequireRole` enforces against.
 */
export const ROUTE_DEFS: RouteDef[] = [
  { screenId: 'S02', path: '/live', roles: [COORDINATOR, ADMINISTRATOR, DRONE_OPERATOR], element: <S02LiveMap /> },
  { screenId: 'S03', path: '/live/zones/:zoneId', roles: [COORDINATOR, ADMINISTRATOR], element: <S03ZoneDetail /> },
  { screenId: 'S04', path: '/live/alerts/:alertId', roles: [COORDINATOR, ADMINISTRATOR], element: <S04AlertDetail /> },
  { screenId: 'S05', path: '/timeline', roles: [COORDINATOR, ADMINISTRATOR], element: <S05RiskTimeline /> },
  { screenId: 'S06', path: '/fleet', roles: [COORDINATOR, ADMINISTRATOR, DRONE_OPERATOR], element: <S06DroneFleet /> },
  { screenId: 'S07', path: '/fleet/:droneId', roles: [COORDINATOR, ADMINISTRATOR, DRONE_OPERATOR], element: <S07PerDroneView /> },
  { screenId: 'S08', path: '/history', roles: [COORDINATOR, ADMINISTRATOR], element: <S08History /> },
  { screenId: 'S09', path: '/history/:eventId', roles: [COORDINATOR, ADMINISTRATOR], element: <S09EventDetail /> },
  { screenId: 'S10', path: '/replay', roles: [COORDINATOR, ADMINISTRATOR], element: <S10Replay /> },
  { screenId: 'S11', path: '/setup', roles: [ADMINISTRATOR], element: <S11VenueSetupWizard /> },
  { screenId: 'S12', path: '/config', roles: [ADMINISTRATOR], element: <S12SiteConfiguration /> },
  { screenId: 'S13', path: '/accounts', roles: [ADMINISTRATOR], element: <S13Accounts /> },
  { screenId: 'S14', path: '/audit', roles: [ADMINISTRATOR, IT], element: <S14AuditLog /> },
  { screenId: 'S15', path: '/health', roles: [ADMINISTRATOR, DRONE_OPERATOR, IT], element: <S15SystemHealth /> },
  { screenId: 'S17', path: '/roles', roles: [ADMINISTRATOR, IT], element: <S17RolesReference /> },
  { screenId: 'S18', path: '/suggestions', roles: [COORDINATOR, ADMINISTRATOR], element: <S18Suggestions /> },
  { screenId: 'S19', path: '/analytics', roles: [COORDINATOR, ADMINISTRATOR], element: <S19Analytics /> },
]
