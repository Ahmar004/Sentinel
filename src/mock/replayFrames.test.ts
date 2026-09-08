import { describe, expect, it } from 'vitest'
import { MockSentinelClient } from './MockSentinelClient'

/**
 * Replay used to build frames by calling `getRange` once per cell per
 * frame. At ten minutes of 1 Hz history over a full grid that is well over
 * a million range scans, each copying two buffers and parsing every
 * timestamp, and it locked the browser hard enough to look like a crash.
 *
 * These tests pin the behaviour that replaced it: one pass, bucketed, with
 * a hard cap on how many frames a single request may allocate.
 */
describe('getReplayFrames', () => {
  it('returns one frame per step across the range', async () => {
    const client = new MockSentinelClient()
    const from = new Date(Date.now() - 60_000)
    const to = new Date()
    const frames = await client.getReplayFrames('site-01', { from: from.toISOString(), to: to.toISOString() }, 10_000)
    expect(frames.length).toBe(7)
    client.dispose()
  })

  it('orders frames oldest first, one step apart', async () => {
    const client = new MockSentinelClient()
    const from = new Date(Date.now() - 30_000)
    const to = new Date()
    const frames = await client.getReplayFrames('site-01', { from: from.toISOString(), to: to.toISOString() }, 10_000)
    const times = frames.map((f) => Date.parse(f.ts))
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] - times[i - 1]).toBe(10_000)
    }
    client.dispose()
  })

  it('places every returned sample inside the frame it belongs to', async () => {
    const client = new MockSentinelClient()
    const from = new Date(Date.now() - 60_000)
    const to = new Date()
    const step = 10_000
    const frames = await client.getReplayFrames('site-01', { from: from.toISOString(), to: to.toISOString() }, step)

    for (const frame of frames) {
      const start = Date.parse(frame.ts)
      for (const cell of frame.cells) {
        const t = Date.parse(cell.ts)
        expect(t).toBeGreaterThanOrEqual(start)
        expect(t).toBeLessThan(start + step)
      }
    }
    client.dispose()
  })

  it('caps a range wide enough to allocate without limit', async () => {
    const client = new MockSentinelClient()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = new Date()
    const frames = await client.getReplayFrames('site-01', { from: from.toISOString(), to: to.toISOString() }, 1000)
    expect(frames.length).toBeLessThanOrEqual(900)
    client.dispose()
  })

  it('returns nothing for a range that ends before it starts', async () => {
    const client = new MockSentinelClient()
    const now = Date.now()
    const frames = await client.getReplayFrames(
      'site-01',
      { from: new Date(now).toISOString(), to: new Date(now - 60_000).toISOString() },
      1000,
    )
    expect(frames).toEqual([])
    client.dispose()
  })

  it('completes a ten minute 1 Hz request quickly', async () => {
    const client = new MockSentinelClient()
    const from = new Date(Date.now() - 10 * 60 * 1000)
    const to = new Date()
    const started = performance.now()
    await client.getReplayFrames('site-01', { from: from.toISOString(), to: to.toISOString() }, 1000)
    const elapsed = performance.now() - started
    // The quadratic version took long enough to hang a browser tab. A
    // generous ceiling still fails loudly if it ever comes back.
    expect(elapsed).toBeLessThan(2000)
    client.dispose()
  })
})
