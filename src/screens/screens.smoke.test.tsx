import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { bootMockBackend, renderAt, teardownMockBackend } from '@/test/renderScreen'

import S02LiveMap from './S02LiveMap'
import S03ZoneDetail from './S03ZoneDetail'
import S04AlertDetail from './S04AlertDetail'
import S05RiskTimeline from './S05RiskTimeline'
import S06DroneFleet from './S06DroneFleet'
import S07PerDroneView from './S07PerDroneView'
import S08History from './S08History'
import S09EventDetail from './S09EventDetail'
import S10Replay from './S10Replay'
import S11VenueSetupWizard from './S11VenueSetupWizard'
import S12SiteConfiguration from './S12SiteConfiguration'
import S13Accounts from './S13Accounts'
import S14AuditLog from './S14AuditLog'
import S15SystemHealth from './S15SystemHealth'
import S16NotPermitted from './S16NotPermitted'
import S17RolesReference from './S17RolesReference'
import S18Suggestions from './S18Suggestions'
import S19Analytics from './S19Analytics'

/**
 * Every screen, mounted against the real mock backend.
 *
 * A blank screen from an infinite render loop passes every pure-logic test
 * there is, which is exactly what happened to S02: the suite was green
 * while the application was unusable. These mount each screen for real, so
 * a render that throws, loops or produces nothing fails here first.
 */
const SCREENS: { id: string; element: React.ReactElement; path: string; entry: string; expect: RegExp }[] = [
  { id: 'S02', element: <S02LiveMap />, path: '/live', entry: '/live', expect: /alerts/i },
  {
    id: 'S03',
    element: <S03ZoneDetail />,
    path: '/live/zones/:zoneId',
    entry: '/live/zones/zone-b',
    expect: /jamrat al-aqaba/i,
  },
  {
    id: 'S04',
    element: <S04AlertDetail />,
    path: '/live/alerts/:alertId',
    entry: '/live/alerts/A-1042',
    expect: /why this fired|alert not found/i,
  },
  { id: 'S05', element: <S05RiskTimeline />, path: '/timeline', entry: '/timeline', expect: /risk timeline/i },
  { id: 'S06', element: <S06DroneFleet />, path: '/fleet', entry: '/fleet', expect: /drone fleet/i },
  {
    id: 'S07',
    element: <S07PerDroneView />,
    path: '/fleet/:droneId',
    entry: '/fleet/D-01',
    expect: /telemetry|drone not found/i,
  },
  { id: 'S08', element: <S08History />, path: '/history', entry: '/history', expect: /history/i },
  {
    id: 'S09',
    element: <S09EventDetail />,
    path: '/history/:eventId',
    entry: '/history/A-1042',
    expect: /loading event|event not found|recorded/i,
  },
  { id: 'S10', element: <S10Replay />, path: '/replay', entry: '/replay', expect: /replay/i },
  { id: 'S11', element: <S11VenueSetupWizard />, path: '/setup', entry: '/setup', expect: /venue setup/i },
  { id: 'S12', element: <S12SiteConfiguration />, path: '/config', entry: '/config', expect: /site configuration/i },
  { id: 'S13', element: <S13Accounts />, path: '/accounts', entry: '/accounts', expect: /accounts/i },
  { id: 'S14', element: <S14AuditLog />, path: '/audit', entry: '/audit', expect: /audit log/i },
  { id: 'S15', element: <S15SystemHealth />, path: '/health', entry: '/health', expect: /system health/i },
  { id: 'S16', element: <S16NotPermitted />, path: '/403', entry: '/403', expect: /permitted|permission/i },
  { id: 'S17', element: <S17RolesReference />, path: '/roles', entry: '/roles', expect: /roles reference/i },
  { id: 'S18', element: <S18Suggestions />, path: '/suggestions', entry: '/suggestions', expect: /suggestions/i },
  { id: 'S19', element: <S19Analytics />, path: '/analytics', entry: '/analytics', expect: /analytics/i },
]

describe('every screen mounts against the mock backend', () => {
  beforeEach(async () => {
    await bootMockBackend('s.iqbal')
  })

  afterEach(() => {
    teardownMockBackend()
  })

  for (const spec of SCREENS) {
    it(`${spec.id} renders without throwing or looping`, () => {
      expect(() => renderAt(spec.element, spec.path, spec.entry)).not.toThrow()
      expect(screen.getAllByText(spec.expect).length).toBeGreaterThan(0)
    })
  }
})
