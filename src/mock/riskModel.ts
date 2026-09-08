import { RISK_BAND, type RiskBand } from '@/domain/constants'
import { RISK_BAND_RANGES } from '@/domain/parameters'
import type { Risk } from '@/domain/types'

/**
 * Maps a normalised 0-1 score to its band per srs.md 2.7 / Appendix C D2.
 * Upper bound of each range is exclusive except CRITICAL.
 */
export function bandFor(score: number): RiskBand {
  if (score >= RISK_BAND_RANGES.CRITICAL.min) return RISK_BAND.CRITICAL
  if (score >= RISK_BAND_RANGES.ELEVATED.min) return RISK_BAND.ELEVATED
  if (score >= RISK_BAND_RANGES.WATCH.min) return RISK_BAND.WATCH
  return RISK_BAND.NORMAL
}

export function riskFor(score: number): Risk {
  return { score, band: bandFor(score) }
}
