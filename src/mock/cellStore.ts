import { HISTORY_DOWNSAMPLED_STEP_MS, HISTORY_FULL_RATE_DURATION_MS } from '@/domain/parameters'
import type { CellSample } from '@/domain/types'

interface CellSeries {
  /** Ordered by `ts` ascending. Never older than one hour. */
  fullRate: CellSample[]
  /** Ordered by `ts` ascending. One sample per 10 s, older than one hour. */
  downsampled: CellSample[]
  lastDownsampleBucket: number | null
}

/**
 * Per-cell ring buffer - CLAUDE.md: "30s/30-sample window plus one hour
 * full-rate; beyond an hour, one sample per 10s." Every sample pushed here
 * was actually produced by `tickEngine` for that exact cell; nothing here
 * ever fabricates, interpolates or forward-fills a missing tick (FR6.4).
 */
export class CellStore {
  private series = new Map<string, CellSeries>()

  push(sample: CellSample): void {
    let s = this.series.get(sample.cellId)
    if (!s) {
      s = { fullRate: [], downsampled: [], lastDownsampleBucket: null }
      this.series.set(sample.cellId, s)
    }
    s.fullRate.push(sample)
    const cutoffMs = Date.parse(sample.ts) - HISTORY_FULL_RATE_DURATION_MS
    while (s.fullRate.length > 0 && Date.parse(s.fullRate[0].ts) < cutoffMs) {
      const evicted = s.fullRate.shift()
      if (!evicted) break
      const bucket = Math.floor(Date.parse(evicted.ts) / HISTORY_DOWNSAMPLED_STEP_MS)
      if (s.lastDownsampleBucket !== bucket) {
        s.downsampled.push(evicted)
        s.lastDownsampleBucket = bucket
      }
    }
  }

  /** All retained samples for a cell within `[fromMs, toMs]`, oldest first. */
  getRange(cellId: string, fromMs: number, toMs: number): CellSample[] {
    const s = this.series.get(cellId)
    if (!s) return []
    const all = [...s.downsampled, ...s.fullRate]
    return all.filter((sample) => {
      const t = Date.parse(sample.ts)
      return t >= fromMs && t <= toMs
    })
  }

  /** The last up to `count` full-rate samples, oldest first - the sliding window. */
  getWindow(cellId: string, count: number): CellSample[] {
    const s = this.series.get(cellId)
    if (!s) return []
    return s.fullRate.slice(-count)
  }

  hasCell(cellId: string): boolean {
    return this.series.has(cellId)
  }

  cellIds(): string[] {
    return [...this.series.keys()]
  }
}
