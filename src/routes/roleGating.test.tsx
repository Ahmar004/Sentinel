import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ROLE, type Role } from '@/domain/constants'
import { landingRouteForRole, navEntriesForRole } from '@/auth/permissions'
import { ROUTE_DEFS } from './routeConfig'
import RequireRole from './RequireRole'
import { useSessionStore } from '@/store'
import { bootMockBackend, teardownMockBackend } from '@/test/renderScreen'

const USER_FOR_ROLE: Record<Role, string> = {
  [ROLE.COORDINATOR]: 'a.rahman',
  [ROLE.ADMINISTRATOR]: 's.iqbal',
  [ROLE.DRONE_OPERATOR]: 'm.tariq',
  [ROLE.IT]: 'n.hassan',
}

/** Mounts one guarded route and reports where the role actually lands.
 * Unmounts before returning, because these run in loops and Testing
 * Library only cleans up between tests, not between renders. */
function landingFor(path: string, roles: readonly Role[]): string {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <RequireRole roles={roles}>
              <p>allowed</p>
            </RequireRole>
          }
        />
        <Route path="/403" element={<p>not permitted</p>} />
        <Route path="/login" element={<p>login</p>} />
        <Route path="*" element={<Navigate to="/403" replace />} />
      </Routes>
    </MemoryRouter>,
  )
  const outcome = screen.queryByText('allowed')
    ? 'allowed'
    : screen.queryByText('not permitted')
      ? '403'
      : 'login'
  view.unmount()
  return outcome
}

describe('role gating', () => {
  afterEach(() => {
    teardownMockBackend()
  })

  /**
   * FR10.3 in both directions. The navigation must never offer a screen the
   * matrix refuses, and the guard must refuse a screen the navigation never
   * offered, since a URL can always be typed. Testing only one direction
   * would leave the other free to drift.
   */
  it.each(Object.values(ROLE))('%s reaches exactly the routes the matrix grants', async (role) => {
    await bootMockBackend(USER_FOR_ROLE[role])
    expect(useSessionStore.getState().role).toBe(role)

    for (const def of ROUTE_DEFS) {
      const outcome = landingFor(def.path, def.roles)
      const granted = def.roles.includes(role)
      expect(outcome, `${role} at ${def.path}`).toBe(granted ? 'allowed' : '403')
    }
  })

  it.each(Object.values(ROLE))('%s is offered no nav entry it cannot open', (role) => {
    for (const entry of navEntriesForRole(role)) {
      const def = ROUTE_DEFS.find((d) => d.path === entry.route)
      expect(def, `nav offers ${entry.route} which is not a route`).toBeDefined()
      expect(def?.roles).toContain(role)
    }
  })

  it.each(Object.values(ROLE))('%s lands somewhere it is allowed to be', (role) => {
    const landing = landingRouteForRole(role)
    const def = ROUTE_DEFS.find((d) => d.path === landing)
    expect(def, `landing route ${landing} for ${role} is not a route`).toBeDefined()
    expect(def?.roles).toContain(role)
  })

  it('IT can reach no operational crowd surface at all', async () => {
    await bootMockBackend(USER_FOR_ROLE[ROLE.IT])
    const operational = ['/live', '/live/zones/:zoneId', '/live/alerts/:alertId', '/timeline', '/fleet', '/fleet/:droneId', '/history', '/history/:eventId', '/replay', '/suggestions', '/analytics']
    for (const path of operational) {
      const def = ROUTE_DEFS.find((d) => d.path === path)
      expect(def, `${path} is missing from the route table`).toBeDefined()
      expect(landingFor(path, def!.roles), `IT reached ${path}`).toBe('403')
    }
  })

  it('the drone operator sees the live map but is refused the screens behind it', async () => {
    await bootMockBackend(USER_FOR_ROLE[ROLE.DRONE_OPERATOR])
    const allowed = ['/live', '/fleet', '/fleet/:droneId', '/health']
    const refused = ['/live/zones/:zoneId', '/live/alerts/:alertId', '/timeline', '/history', '/replay', '/suggestions', '/analytics', '/setup', '/config', '/accounts', '/audit']

    for (const path of allowed) {
      const def = ROUTE_DEFS.find((d) => d.path === path)!
      expect(landingFor(path, def.roles), `operator refused ${path}`).toBe('allowed')
    }
    for (const path of refused) {
      const def = ROUTE_DEFS.find((d) => d.path === path)!
      expect(landingFor(path, def.roles), `operator reached ${path}`).toBe('403')
    }
  })
})
