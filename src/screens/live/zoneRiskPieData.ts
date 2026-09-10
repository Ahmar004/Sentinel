import type { RiskBand } from '@/domain/constants'
import { OBSERVATION_STATE } from '@/domain/constants'
import { OBSERVATION_STATE_TOKEN, RISK_BAND_TOKEN } from '@/components/stateChipLabels'
import type { ZoneSummary } from './zoneSummary'

export interface ZoneRiskSlice {
  zoneId: string
  name: string
  /** The pie value: the zone's risk score when observed, else a shared nominal. */
  value: number
  /** True when the zone has a real risk reading. */
  observed: boolean
  score: number | null
  band: RiskBand | null
  observedPercent: number
  /** A `var(--color-*)` reference, never a literal colour. */
  fillToken: string
}

export interface ZoneRiskPieData {
  slices: ZoneRiskSlice[]
  /** True when not one zone has a risk reading - the component drops every number. */
  allUnobserved: boolean
  /** Name of the zone carrying the site peak score, or null. */
  peakZoneName: string | null
}

const GREY_FILL = OBSERVATION_STATE_TOKEN[OBSERVATION_STATE.GAP]

function observedPercent(summary: ZoneSummary): number {
  const coverage = summary.update?.coverage
  if (!coverage || coverage.total === 0) return 0
  return Math.round((coverage.observed / coverage.total) * 100)
}

/**
 * design doc Section 5. One slice per configured zone.
 *  - Observed zone: value is the zone's aggregate risk score (the same
 *    number on its strip tile), fill is its risk-band colour.
 *  - Unobserved zone: value is a shared nominal so the slice stays
 *    visible, fill is the grey gap token, and it carries no score. Never
 *    dropped: a zone can only look calm by being unobserved (FR4.6).
 */
export function toZoneRiskPieData(zones: ZoneSummary[]): ZoneRiskPieData {
  const observedScores = zones
    .map((zone) => zone.update?.risk?.score)
    .filter((score): score is number => typeof score === 'number')

  const nominal = observedScores.length
    ? observedScores.reduce((sum, score) => sum + score, 0) / observedScores.length
    : 0.1

  let peakZoneName: string | null = null
  let peakScore = -1
  for (const zone of zones) {
    const score = zone.update?.risk?.score
    if (typeof score === 'number' && score > peakScore) {
      peakScore = score
      peakZoneName = zone.name
    }
  }

  const slices = zones.map<ZoneRiskSlice>((zone) => {
    const risk = zone.update?.risk ?? null
    const observed = risk !== null
    return {
      zoneId: zone.zoneId,
      name: zone.name,
      value: observed ? Math.max(risk.score, 0.001) : nominal,
      observed,
      score: observed ? risk.score : null,
      band: observed ? risk.band : null,
      observedPercent: observedPercent(zone),
      fillToken: observed ? RISK_BAND_TOKEN[risk.band] : GREY_FILL,
    }
  })

  return { slices, allUnobserved: observedScores.length === 0, peakZoneName }
}
