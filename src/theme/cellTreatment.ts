import { OBSERVATION_STATE, RISK_BAND, type RiskBand } from '@/domain/constants'
import type { CellObservation } from '@/domain/types'
import { DEFAULT_DENSITY_THRESHOLD_PER_SQM } from '@/domain/parameters'

/**
 * Cell appearance - wireframes.md Section 2 and design.md C02.
 *
 * Three independent visual channels carry three independent facts, so a
 * cell reads correctly without relying on hue alone (NFR5):
 *  - `densityBucket` / `fillToken`  - densityPerSqM, a five-step lightness ramp
 *  - `pattern`                      - observationState
 *  - `outline`                      - riskBand, drawn only when OBSERVED
 *
 * This is the single place cell appearance is decided (design.md C02):
 * nothing else may invent a fill, a pattern or an outline for a cell.
 */

export type DensityBucket = 1 | 2 | 3 | 4 | 5

export type CellPattern =
  | 'solid'
  | 'diagonal-hatch'
  | 'cross-hatch'
  | 'dense-cross-hatch'

export interface CellOutline {
  widthPx: number
  colorToken: string
  style: 'solid' | 'dashed' | 'double'
  /** CRITICAL draws an additional inner ring, per wireframes.md Section 2. */
  innerRing: boolean
}

export interface CellTreatment {
  /** Null only for GAP, which carries no density at all. */
  densityBucket: DensityBucket | null
  /** A `var(--color-*)` reference, never a literal hex value. */
  fillToken: string
  pattern: CellPattern
  /** Null for every state except OBSERVED - risk band is drawn only when observed. */
  outline: CellOutline | null
}

/**
 * Bucket boundaries are multiples of the default density threshold
 * (4.0 /sqm, srs.md 2.7), the one density number the system already
 * justifies, rather than an arbitrary five-way split. Bucket 5 begins at
 * the threshold itself, so the darkest fill starts exactly where the
 * system would flag density-driven risk.
 */
export const DENSITY_BUCKET_BOUNDARIES: readonly [number, number, number, number] = [
  DEFAULT_DENSITY_THRESHOLD_PER_SQM * 0.25,
  DEFAULT_DENSITY_THRESHOLD_PER_SQM * 0.5,
  DEFAULT_DENSITY_THRESHOLD_PER_SQM * 0.75,
  DEFAULT_DENSITY_THRESHOLD_PER_SQM,
]

export function densityBucket(densityPerSqM: number): DensityBucket {
  const [b1, b2, b3, b4] = DENSITY_BUCKET_BOUNDARIES
  if (densityPerSqM < b1) return 1
  if (densityPerSqM < b2) return 2
  if (densityPerSqM < b3) return 3
  if (densityPerSqM < b4) return 4
  return 5
}

const DENSITY_FILL_TOKENS: Record<DensityBucket, string> = {
  1: 'var(--color-density-1)',
  2: 'var(--color-density-2)',
  3: 'var(--color-density-3)',
  4: 'var(--color-density-4)',
  5: 'var(--color-density-5)',
}

function outlineForBand(band: RiskBand): CellOutline {
  switch (band) {
    case RISK_BAND.NORMAL:
      return { widthPx: 1, colorToken: 'var(--color-risk-normal)', style: 'solid', innerRing: false }
    case RISK_BAND.WATCH:
      return { widthPx: 2, colorToken: 'var(--color-risk-watch)', style: 'dashed', innerRing: false }
    case RISK_BAND.ELEVATED:
      return { widthPx: 3, colorToken: 'var(--color-risk-elevated)', style: 'solid', innerRing: false }
    case RISK_BAND.CRITICAL:
      return { widthPx: 4, colorToken: 'var(--color-risk-critical)', style: 'double', innerRing: true }
  }
}

export function getCellTreatment(cell: CellObservation): CellTreatment {
  switch (cell.observationState) {
    case OBSERVATION_STATE.OBSERVED: {
      const bucket = densityBucket(cell.densityPerSqM)
      return {
        densityBucket: bucket,
        fillToken: DENSITY_FILL_TOKENS[bucket],
        pattern: 'solid',
        outline: outlineForBand(cell.risk.band),
      }
    }
    case OBSERVATION_STATE.NOT_ENOUGH_DWELL: {
      const bucket = densityBucket(cell.densityPerSqM)
      return {
        densityBucket: bucket,
        fillToken: DENSITY_FILL_TOKENS[bucket],
        pattern: 'diagonal-hatch',
        outline: null,
      }
    }
    case OBSERVATION_STATE.STALE: {
      const bucket = densityBucket(cell.densityPerSqM)
      return {
        densityBucket: bucket,
        fillToken: 'var(--color-obs-stale-fill)',
        pattern: 'cross-hatch',
        outline: null,
      }
    }
    case OBSERVATION_STATE.GAP:
      return {
        densityBucket: null,
        fillToken: 'var(--color-obs-gap-fill)',
        pattern: 'dense-cross-hatch',
        outline: null,
      }
  }
}
