import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { bootMockBackend, renderAt, teardownMockBackend } from '@/test/renderScreen'
import S03ZoneDetail from './S03ZoneDetail'
import S07PerDroneView from './S07PerDroneView'
import S10Replay from './S10Replay'
import S18Suggestions from './S18Suggestions'
import S19Analytics from './S19Analytics'

/**
 * The honesty invariant, asserted on rendered screens rather than on the
 * functions behind them.
 *
 * CLAUDE.md puts it first: Sentinel's credibility rests on never showing a
 * number it cannot justify. Every check here is a specific way the
 * interface could lie - a zone with no score reading as calm, a report
 * turning absent data into zero, a rejected route offering a confirm
 * button - and each has a screen behind it that must refuse to.
 */
describe('the interface never shows a number it cannot justify', () => {
  beforeEach(async () => {
    await bootMockBackend('s.iqbal')
  })

  afterEach(() => {
    teardownMockBackend()
  })

  it('a zone whose every cell is still filling its window reads as no score, never 0.00', async () => {
    renderAt(<S03ZoneDetail />, '/live/zones/:zoneId', '/live/zones/zone-c')

    expect(screen.getAllByText(/no score/i).length).toBeGreaterThan(0)

    // The load-bearing assertion: the zone header must not carry a score
    // at all. 0.00 there would claim the Wusta basin had been measured and
    // found calm, when in fact nothing has been measured yet.
    const header = screen.getByRole('banner')
    expect(within(header).queryByText('0.00')).toBeNull()
    // Two of them: the zone's own score and the coverage bar's paired
    // value. Both refuse to invent a number, which is the point.
    expect(within(header).getAllByText(/no score/i).length).toBeGreaterThan(0)
  })

  it('that zone states why it has no score rather than leaving a blank', () => {
    renderAt(<S03ZoneDetail />, '/live/zones/:zoneId', '/live/zones/zone-c')
    expect(screen.getByText(/not the same as a calm zone/i)).toBeInTheDocument()
  })

  it('a zone with no observed cell reports no people estimate rather than zero', () => {
    renderAt(<S03ZoneDetail />, '/live/zones/:zoneId', '/live/zones/zone-c')
    expect(screen.getByText(/no estimate/i)).toBeInTheDocument()
  })

  it('a transiting drone says density only, and does not offer a risk score', () => {
    renderAt(<S07PerDroneView />, '/fleet/:droneId', '/fleet/D-03')
    expect(
      screen.getByText(/in transit\. density only\. flow and risk are not produced from a moving camera\./i),
    ).toBeInTheDocument()
  })

  it('the per-drone screen states that no imagery is carried anywhere', () => {
    renderAt(<S07PerDroneView />, '/fleet/:droneId', '/fleet/D-01')
    expect(screen.getByText(/no imagery is transmitted, stored or displayed/i)).toBeInTheDocument()
  })

  it('replay states the sample resolution it is drawing at', () => {
    renderAt(<S10Replay />, '/replay', '/replay')
    expect(screen.getByText(/sampled every/i)).toBeInTheDocument()
  })

  it('replay is unmistakably marked as recorded rather than live', () => {
    renderAt(<S10Replay />, '/replay', '/replay')
    expect(screen.getByText(/recorded data, not live/i)).toBeInTheDocument()
  })

  it('a rejected suggestion names its failing safeguard and offers nothing to confirm', async () => {
    renderAt(<S18Suggestions />, '/suggestions', '/suggestions')
    const rejected = await screen.findByText(/rejected by a safeguard/i, {}, { timeout: 3000 })
    expect(rejected).toBeInTheDocument()
    expect(rejected.textContent).toMatch(/nothing to confirm/i)
  })

  it('analytics reports no data rather than zero where nothing was measured', async () => {
    renderAt(<S19Analytics />, '/analytics', '/analytics')
    const noData = await screen.findAllByText(/no data/i, {}, { timeout: 3000 })
    expect(noData.length).toBeGreaterThan(0)
  })

  it('analytics states that it reports rather than forecasts', async () => {
    renderAt(<S19Analytics />, '/analytics', '/analytics')
    expect(
      screen.getByText(/does not forecast, recommend staffing or plan capacity/i),
    ).toBeInTheDocument()
  })
})
