import { render, type RenderResult } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { MockSentinelClient } from '@/mock/MockSentinelClient'
import { SEED_SITE_ID } from '@/mock/seed'
import { getSentinelClient, setSentinelClient, useConfigStore, useSessionStore } from '@/store'
import { connectLiveStore, disconnectLiveStore } from '@/store/liveStore'
import type { Role } from '@/domain/constants'

let active: MockSentinelClient | null = null

/**
 * Boots the same composition the application root builds - mock client,
 * hydrated configuration, live subscription, authenticated session - so a
 * screen under test sees exactly the world it sees at runtime.
 *
 * This exists because the unit tests could all pass while the app was
 * unusable: S02 rendered blank in a browser from an infinite render loop
 * that no pure-logic test could reach. Mounting the real screen against
 * the real mock is the only thing that catches that class of defect.
 */
export async function bootMockBackend(username = 'a.rahman'): Promise<void> {
  const client = new MockSentinelClient()
  active = client
  setSentinelClient(client)

  const c = getSentinelClient()
  const siteState = await c.getSiteState(SEED_SITE_ID)
  useConfigStore.getState().setSite(siteState.site)
  useConfigStore.getState().setGrid(siteState.grid)
  useConfigStore.getState().setZones(await c.getZones(SEED_SITE_ID))
  useConfigStore.getState().setExits(await c.getExits(SEED_SITE_ID))
  useConfigStore.getState().setThresholds(await c.getThresholds(SEED_SITE_ID))

  await useSessionStore.getState().login({ username, password: 'sentinel' })
  connectLiveStore()
}

export function teardownMockBackend(): void {
  disconnectLiveStore()
  active?.dispose()
  active = null
  useSessionStore.getState().logout()
}

export function currentRole(): Role | null {
  return useSessionStore.getState().role
}

/** Renders one screen at a route, inside a router, with nothing else. */
export function renderAt(element: ReactElement, path: string, initialEntry: string): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}
