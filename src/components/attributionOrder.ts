import type { AlertAttribution } from '@/domain/types'

/** design.md C04: signed bars, ordered by absolute contribution,
 * descending, without mutating the array the caller passed in. */
export function orderByAbsContribution(attribution: AlertAttribution[]): AlertAttribution[] {
  return [...attribution].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
}
