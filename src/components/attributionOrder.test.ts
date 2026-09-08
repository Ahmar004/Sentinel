import { describe, expect, it } from 'vitest'
import { orderByAbsContribution } from './attributionOrder'
import { RISK_FEATURE } from '@/domain/constants'
import type { AlertAttribution } from '@/domain/types'

describe('orderByAbsContribution', () => {
  it('orders by absolute contribution, descending, regardless of sign', () => {
    const input: AlertAttribution[] = [
      { feature: RISK_FEATURE.stopStartPulses, contribution: 0.09, value: 1.1 },
      { feature: RISK_FEATURE.flowConvergence, contribution: 0.19, value: 0.8 },
      { feature: RISK_FEATURE.speedMean, contribution: -0.14, value: 0.4 },
    ]
    const ordered = orderByAbsContribution(input)
    expect(ordered.map((r) => r.feature)).toEqual([
      RISK_FEATURE.flowConvergence,
      RISK_FEATURE.speedMean,
      RISK_FEATURE.stopStartPulses,
    ])
  })

  it('does not mutate the input array', () => {
    const input: AlertAttribution[] = [
      { feature: RISK_FEATURE.density, contribution: 0.1, value: 2 },
      { feature: RISK_FEATURE.counterFlow, contribution: 0.5, value: 1 },
    ]
    const copy = [...input]
    orderByAbsContribution(input)
    expect(input).toEqual(copy)
  })
})
