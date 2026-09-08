/**
 * One seeded PRNG for the whole mock layer - CLAUDE.md "every stochastic
 * decision threads through it so the demo is identical on every reload".
 * `Math.random` must never appear anywhere under `src/mock`.
 *
 * mulberry32: small, fast, and good enough statistically for demo data.
 * Not cryptographic; determinism is the only property that matters here.
 */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The one canonical seed. Fixed so the demo is reproducible across reloads. */
export const CANONICAL_SEED = 0x53454e54 // 'SENT' in hex, arbitrary but fixed

/** Integer in [0, maxExclusive). */
export function nextInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

/** Float in [min, max). */
export function nextFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/** True with probability `p` (0 to 1). */
export function chance(rng: Rng, p: number): boolean {
  return rng() < p
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() called with an empty array')
  return items[nextInt(rng, items.length)]
}

/** Fisher-Yates shuffle, seeded, non-mutating. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Round to a fixed number of decimal places, avoiding float noise in seeded data. */
export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}
