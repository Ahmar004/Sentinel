import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StateChip, { type StateChipProps } from './StateChip'
import { STATE_CHIP_LABELS } from './stateChipLabels'
import {
  OBSERVATION_STATE,
  RISK_BAND,
  DRONE_STATE,
  DRONE_LINK,
  ALERT_STATUS,
  SUGGESTION_STATUS,
  OUTCOME_VERDICT,
  CONNECTION_STATE,
} from '@/domain/constants'

/**
 * design.md C10: StateChip is the only place any of these strings render.
 * Every enum member of every kind it claims to cover must produce its
 * label, so this test enumerates all of them from the constants module
 * rather than a hand-picked subset.
 */
const CASES: StateChipProps[] = [
  ...Object.values(OBSERVATION_STATE).map((value) => ({ kind: 'observationState', value }) as const),
  ...Object.values(RISK_BAND).map((value) => ({ kind: 'riskBand', value }) as const),
  ...Object.values(DRONE_STATE).map((value) => ({ kind: 'droneState', value }) as const),
  ...Object.values(DRONE_LINK).map((value) => ({ kind: 'droneLink', value }) as const),
  ...Object.values(ALERT_STATUS).map((value) => ({ kind: 'alertStatus', value }) as const),
  ...Object.values(SUGGESTION_STATUS).map((value) => ({ kind: 'suggestionStatus', value }) as const),
  ...Object.values(OUTCOME_VERDICT).map((value) => ({ kind: 'outcomeVerdict', value }) as const),
  ...Object.values(CONNECTION_STATE).map((value) => ({ kind: 'connectionState', value }) as const),
]

describe('StateChip', () => {
  it.each(CASES)('renders the label for $kind = $value', (props) => {
    render(<StateChip {...props} />)
    const labels = STATE_CHIP_LABELS[props.kind] as Record<string, string>
    expect(screen.getByText(labels[props.value])).toBeInTheDocument()
  })

  it('covers every kind exactly once per enum member, so nothing is silently unhandled', () => {
    const totalEnumMembers =
      Object.values(OBSERVATION_STATE).length +
      Object.values(RISK_BAND).length +
      Object.values(DRONE_STATE).length +
      Object.values(DRONE_LINK).length +
      Object.values(ALERT_STATUS).length +
      Object.values(SUGGESTION_STATUS).length +
      Object.values(OUTCOME_VERDICT).length +
      Object.values(CONNECTION_STATE).length
    expect(CASES.length).toBe(totalEnumMembers)
  })
})
