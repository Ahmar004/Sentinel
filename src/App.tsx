import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/shell/AppShell'
import RequireRole from '@/routes/RequireRole'
import LandingRedirect from '@/routes/LandingRedirect'
import { ROUTE_DEFS } from '@/routes/routeConfig'
import S01Login from '@/screens/S01Login'
import S16NotPermitted from '@/screens/S16NotPermitted'
import { MockSentinelClient } from '@/mock/MockSentinelClient'
import { SEED_SITE_ID } from '@/mock/seed'
import { setSentinelClient } from '@/store/clientRegistry'
import { connectLiveStore } from '@/store/liveStore'
import { useConfigStore } from '@/store/configStore'

/**
 * Composition root: this is the one place in the app that knows a mock
 * client exists at all (CLAUDE.md - "components must never import
 * src/mock/ directly"). It registers the client the store layer talks to,
 * starts the 1 Hz push feed, and hydrates `configStore`.
 *
 * `getSiteState` returns exactly the `SiteState` shape `SentinelClient`
 * declares - site, grid, live cells, live zones, live drones - which has
 * no room for the full `Zone`/`Exit`/`ThresholdSet` configuration objects
 * `configStore` also needs (that contract carries only per-tick
 * `ZoneUpdate`s, not zone definitions). Those come from the same canonical
 * seed via `getConfigSeed()`, a mock-only convenience method that exists
 * alongside the `SentinelClient` interface rather than inside it, since
 * this file was told not to change that interface's signatures.
 */
function bootstrapMockBackend(): void {
  const client = new MockSentinelClient()
  setSentinelClient(client)

  const { zones, exits, thresholds } = client.getConfigSeed()
  useConfigStore.getState().setZones(zones)
  useConfigStore.getState().setExits(exits)
  useConfigStore.getState().setThresholds(thresholds)

  client.getSiteState(SEED_SITE_ID).then((siteState) => {
    useConfigStore.getState().setSite(siteState.site)
    useConfigStore.getState().setGrid(siteState.grid)
  })

  connectLiveStore()
}

bootstrapMockBackend()

/**
 * All 19 screens, S01 to S19 (design.md Section 4). S01 and S16 sit
 * outside the authenticated shell: a login page has no nav to render, and
 * "not permitted" must render for a role the shell itself might reject.
 * Every other screen is role-gated by `RequireRole`, reading from the one
 * permission-derived list in `routeConfig.tsx`.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<S01Login />} />
        <Route path="/403" element={<S16NotPermitted />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<LandingRedirect />} />
          {ROUTE_DEFS.map(({ screenId, path, roles, element }) => (
            <Route
              key={screenId}
              path={path}
              element={<RequireRole roles={roles}>{element}</RequireRole>}
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
