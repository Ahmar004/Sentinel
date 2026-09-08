import { RISK_BAND } from '@/domain/constants'
import type { Alert } from '@/domain/types'

const BAND_RANK: Record<string, number> = {
  [RISK_BAND.CRITICAL]: 0,
  [RISK_BAND.ELEVATED]: 1,
  [RISK_BAND.WATCH]: 2,
  [RISK_BAND.NORMAL]: 3,
}

/**
 * Priority order for the alert rail: worst band first, then highest score,
 * then most recent.
 *
 * Not newest first. A coordinator reading top to bottom under time
 * pressure has to find the most dangerous thing first, and a critical
 * alert raised two minutes ago outranks an elevated one raised ten
 * seconds ago (NFR3).
 */
export function byPriority(a: Alert, b: Alert): number {
  const band = (BAND_RANK[a.band] ?? 9) - (BAND_RANK[b.band] ?? 9)
  if (band !== 0) return band
  if (b.score !== a.score) return b.score - a.score
  return b.raisedAt.localeCompare(a.raisedAt)
}
