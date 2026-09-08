import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pause, Play, SkipForward } from 'lucide-react'
import { CellLayer, Legend, SiteMap, StateChip, type CellGridEntry } from '@/components'
import { CELL_SIZE_M, HISTORY_DOWNSAMPLED_STEP_MS, HISTORY_FULL_RATE_DURATION_MS, SITE_EXTENT_M, parseCellId } from '@/domain/parameters'
import { toCellObservation } from '@/domain/cellObservation'
import type { ReplayFrame } from '@/domain/types'
import { getSentinelClient, useConfigStore } from '@/store'

const SPEEDS = [1, 4, 16]

type Load =
  | { state: 'loading' }
  | { state: 'error' }
  /** `stepMs` travels with the frames it produced, so the resolution chip
   * always describes the samples actually on screen rather than what the
   * next request would ask for. */
  | { state: 'ready'; frames: ReplayFrame[]; stepMs: number }

/**
 * design.md S10 - the map driven from history rather than the live stream.
 *
 * The playhead steps in whole samples and the resolution chip states what
 * those samples are: 1 Hz inside the most recent hour, one every ten
 * seconds beyond it. Downsampled data is never interpolated to look
 * full rate, because a smooth line through samples nobody recorded is a
 * picture of data that does not exist (FR8.5).
 *
 * A persistent replay marker distinguishes this screen from `S02` at a
 * glance, so recorded data is never mistaken for live.
 */
export default function S10Replay() {
  const [params] = useSearchParams()
  const site = useConfigStore((s) => s.site)
  const zones = useConfigStore((s) => s.zones)

  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timer = useRef<number | null>(null)

  const siteId = site?.id ?? ''
  const fromParam = params.get('from')

  useEffect(() => {
    if (!siteId) return
    let cancelled = false
    const now = Date.now()
    const anchor = fromParam ? new Date(fromParam) : new Date(now - 10 * 60 * 1000)
    // Anything older than the full-rate hour exists only at the coarser
    // step, so the request asks for what was actually retained rather than
    // for a fidelity the store cannot supply.
    const stepMs = now - anchor.getTime() > HISTORY_FULL_RATE_DURATION_MS ? HISTORY_DOWNSAMPLED_STEP_MS : 1000
    const to = new Date(Math.min(now, anchor.getTime() + 10 * 60 * 1000))
    getSentinelClient()
      .getReplayFrames(siteId, { from: anchor.toISOString(), to: to.toISOString() }, stepMs)
      .then((frames) => {
        if (!cancelled) setLoad({ state: 'ready', frames, stepMs })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [siteId, fromParam])

  const frameCount = load.state === 'ready' ? load.frames.length : 0

  useEffect(() => {
    if (!playing || frameCount === 0) return
    // The playhead advances one whole recorded sample per tick. It never
    // interpolates between samples, so 16x shows sixteen real frames a
    // second rather than a smoothed animation of four (FR8.5).
    timer.current = window.setInterval(() => {
      setIndex((i) => {
        const next = i + 1
        // Stop at the end rather than looping: a replay that silently
        // restarts invites a viewer to read the second pass as new data.
        if (next >= frameCount - 1) setPlaying(false)
        return Math.min(next, frameCount - 1)
      })
    }, 1000 / speed)
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [playing, speed, frameCount])

  const frame = load.state === 'ready' ? load.frames[index] : undefined

  const cells: CellGridEntry[] = useMemo(() => {
    if (!frame) return []
    const entries: CellGridEntry[] = []
    for (const update of frame.cells) {
      const parsed = parseCellId(update.cellId)
      if (!parsed) continue
      try {
        entries.push({
          cellId: update.cellId,
          col: parsed.col,
          row: parsed.row,
          observation: toCellObservation(update),
        })
      } catch {
        // A malformed recorded sample is skipped rather than guessed at.
      }
    }
    return entries
  }, [frame])

  const downsampled = load.state === 'ready' && load.stepMs > 1000

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The persistent marker. Deliberately loud: mistaking recorded data
          for live is the one misreading this screen must never allow. */}
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-risk-elevated bg-surface-raised px-4 py-2">
        <span className="rounded bg-risk-elevated px-2 py-0.5 text-xs font-semibold tracking-wide uppercase text-surface">
          Replay
        </span>
        <span className="text-xs text-ink-muted">
          Recorded data, not live. The live map is a separate screen.
        </span>
        <span className="ml-auto rounded border border-border px-2 py-0.5 text-xs">
          {downsampled
            ? `Sampled every ${HISTORY_DOWNSAMPLED_STEP_MS / 1000} s`
            : 'Sampled every second, 1 Hz'}
        </span>
      </div>

      {load.state === 'loading' ? (
        <p className="p-4 text-sm text-ink-muted">Loading frames.</p>
      ) : load.state === 'error' ? (
        <p className="p-4 text-sm text-ink-muted">
          Replay frames could not be loaded. Nothing is played rather than a partial recording.
        </p>
      ) : frameCount === 0 ? (
        <p className="p-4 text-sm text-ink-muted">
          No frames were recorded for this period. Nothing is shown rather than an interpolated reconstruction.
        </p>
      ) : (
        <>
          <div className="relative min-h-0 flex-1">
            <SiteMap
              planImageUrl={site?.planImageUrl ?? '/jamarat-plan.svg'}
              groundExtentM={site?.groundExtentM ?? SITE_EXTENT_M}
            >
              <CellLayer cells={cells} cellSizeM={CELL_SIZE_M} />
            </SiteMap>
            <div className="pointer-events-none absolute bottom-2 left-2 z-[400] max-w-[min(20rem,calc(100%-1rem))]">
              <div className="pointer-events-auto rounded border border-border bg-surface-raised/95 p-2">
                <Legend />
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause' : 'Play'}
                className="rounded border border-border p-1.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(frameCount - 1, i + 1))}
                aria-label="Step forward one sample"
                className="rounded border border-border p-1.5 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <SkipForward className="size-4" aria-hidden="true" />
              </button>

              <div className="flex gap-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    aria-pressed={speed === s}
                    className={`rounded border px-2 py-0.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      speed === s ? 'border-accent bg-surface-sunken' : 'border-border'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <span className="font-mono text-xs tabular-nums">
                {frame ? new Date(frame.ts).toLocaleTimeString() : '-'}
              </span>
              <span className="text-xs text-ink-muted">
                sample {index + 1} of {frameCount}
              </span>
            </div>

            <label htmlFor="replay-scrub" className="sr-only">
              Scrub through recorded samples
            </label>
            <input
              id="replay-scrub"
              type="range"
              min={0}
              max={Math.max(0, frameCount - 1)}
              step={1}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="mt-3 w-full"
            />

            {frame ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {frame.zones.map((zone) => {
                  const name = zones.find((z) => z.zoneId === zone.zoneId)?.name ?? zone.zoneId
                  return (
                    <span key={zone.zoneId} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs">
                      {name}
                      {zone.risk ? (
                        <>
                          <span className="font-mono tabular-nums">{zone.risk.score.toFixed(2)}</span>
                          <StateChip kind="riskBand" value={zone.risk.band} />
                        </>
                      ) : (
                        <span className="text-ink-muted">No score</span>
                      )}
                    </span>
                  )
                })}
              </div>
            ) : null}

            <p className="mt-2 text-xs text-ink-muted">
              The playhead steps in whole recorded samples. Nothing between two samples is drawn, because no measurement
              exists there.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
