import { RISK_BAND } from '@/domain/constants'
import { HISTORY_FULL_RATE_DURATION_MS, RISK_BAND_RANGES } from '@/domain/parameters'
import type { CellSample, CellUpdate, ZoneUpdate } from '@/domain/types'
import { ZONE_A_ID, ZONE_B_ID, ZONE_C_ID, ZONE_COVERAGE } from './seed'
import { mulberry32, round } from './rng'

/** One sample a second for the hour the store retains at full rate. */
const BACKFILL_STEP_MS = 1000
const BACKFILL_SPAN_MS = HISTORY_FULL_RATE_DURATION_MS

/** Cell history is far larger than zone history, so it is backfilled over
 * the ten minutes the cell charts actually show, at a coarser step. A cell
 * chart with a point every five seconds still reads as a trend; one with
 * 3600 points per cell would cost more than it shows. */
const CELL_BACKFILL_SPAN_MS = 10 * 60 * 1000
const CELL_BACKFILL_STEP_MS = 5000

function bandFor(score: number): (typeof RISK_BAND)[keyof typeof RISK_BAND] {
  if (score >= RISK_BAND_RANGES.CRITICAL.min) return RISK_BAND.CRITICAL
  if (score >= RISK_BAND_RANGES.ELEVATED.min) return RISK_BAND.ELEVATED
  if (score >= RISK_BAND_RANGES.WATCH.min) return RISK_BAND.WATCH
  return RISK_BAND.NORMAL
}

/**
 * The risk each zone held `msAgo` before the seed moment.
 *
 * This is the story the canonical dataset ends on, told backwards, so the
 * timeline shows how the site arrived at the state every other screen
 * describes rather than starting flat at the moment the app opened.
 *
 * Zone B climbs from the watch band into elevated over the last few
 * minutes and crosses its 0.70 threshold right where the alert was raised,
 * which is what makes the alert legible on the chart instead of appearing
 * from nowhere. Zone A drifts gently around its calm value. Zone C carries
 * no score at any point, because every cell in it has been filling its
 * dwell window the whole time, and inventing history for it would be the
 * one lie this whole dataset exists to avoid.
 */
function zoneRiskAt(zoneId: string, msAgo: number, jitter: number): number | null {
  const minutesAgo = msAgo / 60_000

  if (zoneId === ZONE_C_ID) return null

  if (zoneId === ZONE_B_ID) {
    // 0.78 now, easing back to about 0.42 an hour ago, with the steepest
    // part of the climb in the last four minutes.
    const ramp = minutesAgo <= 4 ? 0.78 - (minutesAgo / 4) * 0.12 : 0.66 - Math.min(0.24, (minutesAgo - 4) * 0.0043)
    return round(Math.max(0.05, Math.min(0.95, ramp + jitter * 0.02)), 2)
  }

  // Zone A: calm throughout, wandering inside the normal band.
  const base = 0.31 + Math.sin(minutesAgo / 7) * 0.04
  return round(Math.max(0.05, Math.min(0.39, base + jitter * 0.015)), 2)
}

/**
 * An hour of zone history ending at `nowMs`, oldest first.
 *
 * Coverage counts are held at the canonical figures rather than animated:
 * the dataset states them exactly, and drifting them would put the chart
 * at odds with the zone strip a viewer is looking at beside it.
 */
export function backfillZoneHistory(nowMs: number): Map<string, ZoneUpdate[]> {
  const rng = mulberry32(20260908)
  const out = new Map<string, ZoneUpdate[]>()

  for (const zoneId of [ZONE_A_ID, ZONE_B_ID, ZONE_C_ID]) {
    const coverage = ZONE_COVERAGE[zoneId]
    const series: ZoneUpdate[] = []

    for (let msAgo = BACKFILL_SPAN_MS; msAgo > 0; msAgo -= BACKFILL_STEP_MS) {
      const score = zoneRiskAt(zoneId, msAgo, rng() * 2 - 1)
      series.push({
        zoneId,
        ts: new Date(nowMs - msAgo).toISOString(),
        risk: score === null ? null : { score, band: bandFor(score) },
        coverage: { ...coverage, total: coverage.observed + coverage.notEnoughDwell + coverage.stale + coverage.gap },
        peakCellId: null,
      })
    }
    out.set(zoneId, series)
  }

  return out
}

/**
 * Ten minutes of history for the cells that currently carry a reading.
 *
 * A cell with no current reading gets no history: it has not been observed,
 * and manufacturing a past for it would be exactly the interpolation the
 * honesty invariant forbids. Samples that are not `OBSERVED` keep their
 * null risk all the way back, so a chart over them breaks rather than
 * drawing a line through ground nobody was watching.
 */
export function backfillCellHistory(current: CellUpdate[], nowMs: number): CellSample[] {
  const rng = mulberry32(20260909)
  const out: CellSample[] = []

  for (const cell of current) {
    if (cell.risk === null && cell.densityPerSqM === null) continue

    for (let msAgo = CELL_BACKFILL_SPAN_MS; msAgo > 0; msAgo -= CELL_BACKFILL_STEP_MS) {
      const drift = (rng() * 2 - 1) * 0.05
      const minutesAgo = msAgo / 60_000

      const score =
        cell.risk === null
          ? null
          : round(Math.max(0.02, Math.min(0.97, cell.risk.score - minutesAgo * 0.012 + drift)), 2)

      const density =
        cell.densityPerSqM === null
          ? null
          : round(Math.max(0, cell.densityPerSqM - minutesAgo * 0.05 + drift), 2)

      out.push({
        ...cell,
        ts: new Date(nowMs - msAgo).toISOString(),
        densityPerSqM: density,
        risk: score === null ? null : { score, band: bandFor(score) },
      })
    }
  }

  return out
}
