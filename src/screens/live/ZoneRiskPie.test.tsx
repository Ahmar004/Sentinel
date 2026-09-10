import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RISK_BAND } from '@/domain/constants'
import type { ZoneSummary } from './zoneSummary'
import ZoneRiskPie from './ZoneRiskPie'

afterEach(cleanup)

const observedZone = (
  zoneId: string,
  name: string,
  score: number,
  band: (typeof RISK_BAND)[keyof typeof RISK_BAND] = RISK_BAND.WATCH,
): ZoneSummary => ({
  zoneId,
  name,
  estimatedPeople: 100,
  observedCellCount: 40,
  update: {
    zoneId,
    ts: '2026-09-10T10:00:00Z',
    risk: { score, band },
    coverage: { observed: 40, notEnoughDwell: 0, stale: 0, gap: 60, total: 100 },
    peakCellId: null,
  },
})

const unobservedZone = (zoneId: string, name: string): ZoneSummary => ({
  zoneId,
  name,
  estimatedPeople: null,
  observedCellCount: 0,
  update: undefined,
})

describe('ZoneRiskPie', () => {
  it('lists every zone with its score and observed percent', () => {
    render(<ZoneRiskPie zones={[observedZone('a', 'Wadi', 0.31, RISK_BAND.NORMAL), observedZone('b', 'Aqaba', 0.78)]} />)
    expect(screen.getByText('Wadi')).toBeInTheDocument()
    expect(screen.getByText('0.31')).toBeInTheDocument()
    expect(screen.getByText('0.78')).toBeInTheDocument()
    expect(screen.getAllByText(/% observed/i).length).toBe(2)
  })

  it('shows an unobserved zone as "no reading" and never as a number', () => {
    render(<ZoneRiskPie zones={[observedZone('a', 'Wadi', 0.4), unobservedZone('c', 'Wusta')]} />)
    const row = screen.getByText('Wusta').closest('li')!
    expect(row.textContent).toMatch(/no reading/i)
    expect(row.textContent).not.toMatch(/\d\.\d\d/)
  })

  it('drops all numbers when no zone is observed', () => {
    render(<ZoneRiskPie zones={[unobservedZone('a', 'Wadi'), unobservedZone('c', 'Wusta')]} />)
    expect(screen.getByText(/no zone is currently observed/i)).toBeInTheDocument()
    expect(screen.queryByText(/\d\.\d\d/)).toBeNull()
  })

  it('carries a caption and an InfoPopover trigger', () => {
    render(<ZoneRiskPie zones={[observedZone('a', 'Wadi', 0.4)]} />)
    expect(screen.getByText(/share of current site risk by zone/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /how this pie is read/i })).toBeInTheDocument()
  })
})
