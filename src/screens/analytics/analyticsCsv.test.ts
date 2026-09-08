import { describe, expect, it } from 'vitest'
import type { AnalyticsSummary } from '@/domain/types'
import { NO_DATA, acknowledgementPercent, analyticsToCsv } from './analyticsCsv'

const base: AnalyticsSummary = {
  siteId: 'site-01',
  from: '2026-09-08T00:00:00.000Z',
  to: '2026-09-08T23:59:59.999Z',
  alertsByZone: [
    { zoneId: 'zone-a', count: 0, observedShareOfRange: 0.94 },
    { zoneId: 'zone-b', count: 3, observedShareOfRange: 0.71 },
    { zoneId: 'zone-c', count: null, observedShareOfRange: 0 },
  ],
  responseTime: { raised: 4, acknowledged: 3, medianMs: 13_000, p95Ms: 41_000 },
  acknowledgementRate: { issued: 7, confirmed: 3, dismissed: 2, expired: 2 },
  verdicts: { PENDING: 0, IMPROVED: 2, UNCHANGED: 1, WORSENED: 0 },
}

const names = { 'zone-a': 'A Concourse', 'zone-b': 'B North Gate', 'zone-c': 'C Arena Floor' }

describe('analyticsToCsv', () => {
  it('writes a measured zero as zero and an unobserved zone as no data', () => {
    const csv = analyticsToCsv(base, names)
    expect(csv).toContain('A Concourse,0,94%')
    expect(csv).toContain(`C Arena Floor,${NO_DATA},0%`)
  })

  it('writes no data rather than zero when no alert was raised', () => {
    const csv = analyticsToCsv({ ...base, responseTime: null }, names)
    expect(csv).toContain(`Alerts raised,${NO_DATA}`)
    expect(csv).not.toContain('Alerts raised,0')
  })

  it('distinguishes alerts raised but unacknowledged from no alerts at all', () => {
    const csv = analyticsToCsv(
      { ...base, responseTime: { raised: 4, acknowledged: 0, medianMs: null, p95Ms: null } },
      names,
    )
    expect(csv).toContain('Alerts raised,4')
    expect(csv).toContain('Acknowledged,0')
    expect(csv).toContain(`Median seconds,${NO_DATA}`)
  })

  it('writes no data rather than zero when no suggestion was issued', () => {
    const csv = analyticsToCsv({ ...base, acknowledgementRate: null }, names)
    expect(csv).toContain(`Suggestions issued,${NO_DATA}`)
  })

  it('writes no data rather than zero verdicts when none was confirmed', () => {
    const csv = analyticsToCsv({ ...base, verdicts: null }, names)
    expect(csv).toContain(`Confirmed suggestions,${NO_DATA}`)
  })

  it('escapes a zone name containing a comma', () => {
    const csv = analyticsToCsv(base, { ...names, 'zone-a': 'A Concourse, west' })
    expect(csv).toContain('"A Concourse, west",0,94%')
  })
})

describe('acknowledgementPercent', () => {
  it('computes a percentage when suggestions were issued', () => {
    expect(acknowledgementPercent(base)).toBe(43)
  })

  it('returns null rather than 0 percent when none was issued', () => {
    expect(acknowledgementPercent({ ...base, acknowledgementRate: null })).toBeNull()
    expect(
      acknowledgementPercent({ ...base, acknowledgementRate: { issued: 0, confirmed: 0, dismissed: 0, expired: 0 } }),
    ).toBeNull()
  })

  it('returns 0 when suggestions were issued and every one was ignored', () => {
    expect(
      acknowledgementPercent({ ...base, acknowledgementRate: { issued: 5, confirmed: 0, dismissed: 5, expired: 0 } }),
    ).toBe(0)
  })
})
