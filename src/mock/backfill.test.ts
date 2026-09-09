import { describe, expect, it } from 'vitest'
import { MockSentinelClient } from './MockSentinelClient'
import { ZONE_B_ID, ZONE_C_ID } from './seed'

/**
 * The timeline was empty for two compounding reasons: nothing seeded the
 * history before the app opened, and the simulation clock was pinned to a
 * fixed calendar date while every screen asks for "the last hour" measured
 * from the real one. Both are covered here, because either alone brings
 * the empty chart back.
 */
describe('history is present and anchored to the real clock', () => {
  it('the last 15 minutes of zone history is populated', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 15 * 60 * 1000)
    const samples = await client.getZoneHistory('site-01', { from: from.toISOString(), to: to.toISOString() })
    expect(samples.length).toBeGreaterThan(100)
    client.dispose()
  })

  it('the last hour of zone history is populated for every zone', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)
    const samples = await client.getZoneHistory('site-01', { from: from.toISOString(), to: to.toISOString() })

    for (const zoneId of ['zone-a', 'zone-b', 'zone-c']) {
      expect(samples.filter((s) => s.zoneId === zoneId).length, `${zoneId} has no history`).toBeGreaterThan(500)
    }
    client.dispose()
  })

  it('zone B climbs into the elevated band by the end of the hour', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)
    const samples = (await client.getZoneHistory('site-01', { from: from.toISOString(), to: to.toISOString() }))
      .filter((s) => s.zoneId === ZONE_B_ID)
      .filter((s) => s.risk !== null)

    const first = samples[0]!.risk!.score
    const last = samples[samples.length - 1]!.risk!.score
    expect(last).toBeGreaterThan(first)
    expect(last).toBeGreaterThanOrEqual(0.7)
    client.dispose()
  })

  it('zone C carries no score at any point in its history, never a zero', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)
    const samples = (await client.getZoneHistory('site-01', { from: from.toISOString(), to: to.toISOString() })).filter(
      (s) => s.zoneId === ZONE_C_ID,
    )

    expect(samples.length).toBeGreaterThan(0)
    expect(samples.every((s) => s.risk === null)).toBe(true)
    client.dispose()
  })

  it('every zone sample carries its coverage, never risk alone', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 60 * 60 * 1000)
    const samples = await client.getZoneHistory('site-01', { from: from.toISOString(), to: to.toISOString() })
    expect(samples.every((s) => s.coverage && s.coverage.total > 0)).toBe(true)
    client.dispose()
  })

  it('cell history covers the ten minutes the cell charts ask for', async () => {
    const client = new MockSentinelClient()
    const to = new Date()
    const from = new Date(to.getTime() - 10 * 60 * 1000)
    const samples = await client.getCellHistory('C-031-022', { from: from.toISOString(), to: to.toISOString() })
    expect(samples.length).toBeGreaterThan(10)
    client.dispose()
  })

  it('the open alert is timestamped close to now, not to a fixed calendar date', async () => {
    const client = new MockSentinelClient()
    const page = await client.queryAlerts({ siteId: 'site-01', pageSize: 50 })
    const alert = page.items.find((a) => a.alertId === 'A-1042')
    expect(alert).toBeDefined()
    const ageMs = Date.now() - Date.parse(alert!.raisedAt)
    expect(ageMs).toBeGreaterThanOrEqual(0)
    expect(ageMs).toBeLessThan(5 * 60 * 1000)
    client.dispose()
  })
})
