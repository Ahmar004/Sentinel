import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/shell/AppShell'
import RequireRole from '@/routes/RequireRole'
import LandingRedirect from '@/routes/LandingRedirect'
import { ROUTE_DEFS } from '@/routes/routeConfig'
import S01Login from '@/screens/S01Login'
import S16NotPermitted from '@/screens/S16NotPermitted'
import { MockSentinelClient } from '@/mock/MockSentinelClient'
import { SEED_SITE_ID } from '@/mock/seed'
import { getSentinelClient, setSentinelClient } from '@/store/clientRegistry'
import { connectLiveStore } from '@/store/liveStore'
import { useConfigStore } from '@/store/configStore'
import { setDemoHarness } from '@/demo/harness'
import { PLAYBACK_SPEEDS, SCENARIOS } from '@/mock/scenarios'

/**
 * Composition root: this is the one place in the app that knows a mock
 * client exists at all (CLAUDE.md - "components must never import
 * src/mock/ directly"). It registers the client the store layer talks to,
 * starts the 1 Hz push feed, and hydrates `configStore`.
 *
 * Every value used to hydrate `configStore` - site, grid, zones, exits,
 * thresholds - is fetched through the `SentinelClient` interface
 * (srs.md 3.5), never through a mock-only method. A real backend swapped
 * in behind that same interface hydrates this store identically.
 */
function bootstrapMockBackend(): void {
  const client = new MockSentinelClient()
  setSentinelClient(client)

  const sentinelClient = getSentinelClient()

  sentinelClient.getSiteState(SEED_SITE_ID).then((siteState) => {
    useConfigStore.getState().setSite(siteState.site)
    useConfigStore.getState().setGrid(siteState.grid)
  })
  sentinelClient.getZones(SEED_SITE_ID).then((zones) => useConfigStore.getState().setZones(zones))
  sentinelClient.getExits(SEED_SITE_ID).then((exits) => useConfigStore.getState().setExits(exits))
  sentinelClient.getThresholds(SEED_SITE_ID).then((thresholds) => useConfigStore.getState().setThresholds(thresholds))

  // srs.md Appendix B: the demo harness is scaffolding, so it is wired
  // here at the composition root rather than exposed on the client
  // contract. Delete the mock layer and nothing registers, which is
  // exactly what D14 then reports.
  setDemoHarness({
    controller: client.getPlaybackController(),
    scenarios: SCENARIOS.map((s) => ({ id: s.id, label: s.label, description: s.description })),
    speeds: PLAYBACK_SPEEDS,
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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
