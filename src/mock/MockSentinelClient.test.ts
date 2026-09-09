import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockSentinelClient } from './MockSentinelClient'
import { SEED_NOW_MS } from './seed'

/**
 * A whole day around a moment on the demo clock.
 *
 * The seed anchors itself to the real clock so that "the last hour" always
 * has data in it, which means a test may not name a calendar date: one
 * written as 2026-09-08 passes on that day and fails on every other.
 */
function rangeAround(ms: number): { from: string; to: string } {
  return {
    from: new Date(ms - 12 * 60 * 60 * 1000).toISOString(),
    to: new Date(ms + 12 * 60 * 60 * 1000).toISOString(),
  }
}


describe('MockSentinelClient auth (FR10)', () => {
  let client: MockSentinelClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new MockSentinelClient()
  })

  afterEach(() => {
    client.dispose()
    vi.useRealTimers()
  })

  it('logs in each of the four active seeded users with the seeded password', async () => {
    const active: [string, string][] = [
      ['a.rahman', 'COORDINATOR'],
      ['s.iqbal', 'ADMINISTRATOR'],
      ['m.tariq', 'DRONE_OPERATOR'],
      ['n.hassan', 'IT'],
    ]
    for (const [username, role] of active) {
      const session = await client.login({ username, password: 'sentinel' })
      expect(session.user.role).toBe(role)
      expect(session.user.active).toBe(true)
    }
  })

  it('rejects a deactivated account even with the correct password', async () => {
    await expect(client.login({ username: 'k.javed', password: 'sentinel' })).rejects.toThrow()
  })

  it('rejects a wrong password identically to an unknown user (no field disclosed)', async () => {
    let deactivatedMessage = ''
    let unknownMessage = ''
    try {
      await client.login({ username: 'a.rahman', password: 'wrong' })
    } catch (err) {
      deactivatedMessage = err instanceof Error ? err.message : ''
    }
    try {
      await client.login({ username: 'nobody', password: 'sentinel' })
    } catch (err) {
      unknownMessage = err instanceof Error ? err.message : ''
    }
    expect(deactivatedMessage).toBe(unknownMessage)
    expect(deactivatedMessage.length).toBeGreaterThan(0)
  })
})

describe('MockSentinelClient.getAnalytics - null vs zero (FR11.3)', () => {
  let client: MockSentinelClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new MockSentinelClient()
  })

  afterEach(() => {
    client.dispose()
    vi.useRealTimers()
  })

  it('gives a zone never observed in the range a null count, not zero', async () => {
    const longAgo = { from: '2000-01-01T00:00:00.000Z', to: '2000-01-02T00:00:00.000Z' }
    const analytics = await client.getAnalytics('site-01', longAgo)
    for (const entry of analytics.alertsByZone) {
      expect(entry.observedShareOfRange).toBe(0)
      expect(entry.count).toBeNull()
    }
  })

  it('gives a zone that was observed a numeric count, even when it is zero', async () => {
    const aroundSeed = rangeAround(SEED_NOW_MS)
    const analytics = await client.getAnalytics('site-01', aroundSeed)
    const zoneA = analytics.alertsByZone.find((z) => z.zoneId === 'zone-a')
    expect(zoneA?.observedShareOfRange).toBeGreaterThan(0)
    expect(zoneA?.count).not.toBeNull()
    expect(typeof zoneA?.count).toBe('number')
  })

  it('reports a non-null responseTime once an alert has been raised, and null with none in range', async () => {
    const withAlert = rangeAround(SEED_NOW_MS)
    const withAlertAnalytics = await client.getAnalytics('site-01', withAlert)
    expect(withAlertAnalytics.responseTime).not.toBeNull()
    expect(withAlertAnalytics.responseTime?.raised).toBeGreaterThan(0)

    const noAlerts = { from: '2000-01-01T00:00:00.000Z', to: '2000-01-02T00:00:00.000Z' }
    const noAlertAnalytics = await client.getAnalytics('site-01', noAlerts)
    expect(noAlertAnalytics.responseTime).toBeNull()
  })

  it('reports null verdicts when nothing was confirmed in the range', async () => {
    const noAlerts = { from: '2000-01-01T00:00:00.000Z', to: '2000-01-02T00:00:00.000Z' }
    const analytics = await client.getAnalytics('site-01', noAlerts)
    expect(analytics.verdicts).toBeNull()
  })

  it('reports the SG-0771 confirmation\'s IMPROVED verdict for a range covering yesterday', async () => {
    const yesterday = rangeAround(SEED_NOW_MS - 86_400_000)
    const analytics = await client.getAnalytics('site-01', yesterday)
    expect(analytics.verdicts).not.toBeNull()
    expect(analytics.verdicts?.IMPROVED).toBeGreaterThanOrEqual(1)
  })
})

describe('MockSentinelClient push delivery', () => {
  let client: MockSentinelClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new MockSentinelClient()
  })

  afterEach(() => {
    client.dispose()
    vi.useRealTimers()
  })

  it('delivers a snapshot immediately on subscribing to CELLS', () => {
    const messages: string[] = []
    const unsubscribe = client.subscribe('CELLS', (msg) => messages.push(msg.type))
    expect(messages).toEqual(['snapshot'])
    unsubscribe()
  })

  it('delivers the already-open A-1042 alert immediately on subscribing to ALERTS', () => {
    const alerts: string[] = []
    const unsubscribe = client.subscribe('ALERTS', (msg) => {
      if (msg.type === 'alert.raised') alerts.push(msg.payload.alertId)
    })
    expect(alerts).toContain('A-1042')
    unsubscribe()
  })
})
