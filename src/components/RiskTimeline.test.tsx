import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import RiskTimeline from './RiskTimeline'

describe('RiskTimeline', () => {
  it('renders without crashing when the series contains a gap', () => {
    const { getByTestId } = render(
      <RiskTimeline
        points={[
          { ts: '2026-08-27T10:00:00.000Z', risk: 0.3 },
          { ts: '2026-08-27T10:00:01.000Z', risk: null },
          { ts: '2026-08-27T10:00:02.000Z', risk: 0.6 },
        ]}
        height={200}
      />,
    )
    expect(getByTestId('risk-timeline')).toBeInTheDocument()
  })

  it('renders an honest empty state rather than an empty chart for no data', () => {
    const { getByText } = render(<RiskTimeline points={[]} />)
    expect(getByText(/no risk history/i)).toBeInTheDocument()
  })
})
