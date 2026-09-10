import { describe, expect, it } from 'vitest'
import { RISK_BAND } from '@/domain/constants'
import type { ZoneSummary } from './zoneSummary'
import { toZoneRiskPieData } from './zoneRiskPieData'

function summary(over: Partial<ZoneSummary> & { zoneId: string; name: string }): ZoneSummary {
  return { update: undefined, estimatedPeople: null, observedCellCount: 0, ...over }
}

const observedZone = (
  zoneId: string,
  name: string,
  score: number,
  band: (typeof RISK_BAND)[keyof typeof RISK_BAND] = RISK_BAND.WATCH,
): ZoneSummary =>
  summary({
    zoneId,
    name,
    observedCellCount: 40,
    update: {
      zoneId,
      ts: '2026-09-10T10:00:00Z',
      risk: { score, band },
      coverage: { observed: 40, notEnoughDwell: 5, stale: 5, gap: 50, total: 100 },
      peakCellId: `${zoneId}-c1`,
    },
  })

describe('toZoneRiskPieData', () => {
  it('makes one slice per zone, sized by the zone risk score, coloured by band', () => {
    const data = toZoneRiskPieData([
      observedZone('a', 'Wadi', 0.31, RISK_BAND.NORMAL),
      observedZone('b', 'Aqaba', 0.78, RISK_BAND.ELEVATED),
    ])
    expect(data.slices.map((s) => s.value)).toEqual([0.31, 0.78])
    expect(data.slices[1].fillToken).toBe('var(--color-risk-elevated)')
    expect(data.slices[1].observedPercent).toBe(40)
    expect(data.allUnobserved).toBe(false)
    expect(data.peakZoneName).toBe('Aqaba')
  })

  it('renders an unobserved zone as a grey "no reading" slice of nominal size, never omitted', () => {
    const data = toZoneRiskPieData([observedZone('a', 'Wadi', 0.4), summary({ zoneId: 'c', name: 'Wusta' })])
    const wusta = data.slices.find((s) => s.zoneId === 'c')!
    expect(wusta.observed).toBe(false)
    expect(wusta.score).toBeNull()
    expect(wusta.band).toBeNull()
    expect(wusta.fillToken).toBe('var(--color-obs-gap-fill)')
    expect(wusta.value).toBeGreaterThan(0)
  })

  it('flags all-unobserved so the component can drop every number', () => {
    const data = toZoneRiskPieData([summary({ zoneId: 'a', name: 'Wadi' }), summary({ zoneId: 'c', name: 'Wusta' })])
    expect(data.allUnobserved).toBe(true)
    expect(data.peakZoneName).toBeNull()
    expect(data.slices).toHaveLength(2)
  })
})
