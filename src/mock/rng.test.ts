import { describe, expect, it } from 'vitest'
import { mulberry32, nextFloat, nextInt, shuffle } from './rng'

describe('mulberry32', () => {
  it('is deterministic: the same seed produces the same sequence', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('always returns a value in [0, 1)', () => {
    const rng = mulberry32(999)
    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('nextInt / nextFloat / shuffle determinism', () => {
  it('nextInt and nextFloat replay identically from the same seed', () => {
    const run = () => {
      const rng = mulberry32(42)
      return {
        ints: Array.from({ length: 10 }, () => nextInt(rng, 100)),
        floats: Array.from({ length: 10 }, () => nextFloat(rng, -5, 5)),
      }
    }
    expect(run()).toEqual(run())
  })

  it('shuffle is deterministic for the same seed and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = shuffle(mulberry32(7), input)
    const b = shuffle(mulberry32(7), input)
    expect(a).toEqual(b)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...a].sort()).toEqual(input)
  })
})
