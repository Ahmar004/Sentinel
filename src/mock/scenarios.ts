import { SCENARIO_ID, type ScenarioId, type TickEngine, type TickResult } from './tickEngine'

export { SCENARIO_ID }
export type { ScenarioId }

export const PLAYBACK_SPEEDS = [1, 4, 16] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export interface ScenarioDescriptor {
  id: ScenarioId
  label: string
  description: string
}

/**
 * srs.md Appendix B - the proof-of-concept demo harness. Scaffolding for
 * the defence only: nothing here is a product requirement, and no FR in
 * srs.md Section 4 depends on it.
 */
export const SCENARIOS: ScenarioDescriptor[] = [
  { id: SCENARIO_ID.CALM, label: 'Calm', description: 'Steady state. All observed cells in normal and watch bands.' },
  {
    id: SCENARIO_ID.CONVERGENCE,
    label: 'Convergence',
    description:
      'Two streams meeting at a zone boundary drive flow convergence and counter-flow up until an elevated alert fires.',
  },
  {
    id: SCENARIO_ID.TRANSIT_GAP,
    label: 'Transit gap',
    description:
      'A drone leaves an area: its cells pass through stale into gap, then show not enough dwell for 30 s on arrival.',
  },
  {
    id: SCENARIO_ID.SAFEGUARD_REJECT,
    label: 'Safeguard reject',
    description: 'An alert whose best-ranked route contains a stale cell, returned rejected with its reason.',
  },
  {
    id: SCENARIO_ID.MODEL_OFF,
    label: 'Model off',
    description: 'Every suggestion rendered from template text, with the source indicated.',
  },
]

export type TickListener = (result: TickResult) => void

/**
 * Owns the one `setInterval` that drives `TickEngine.step()` in real time.
 * `speed` only changes how often real time maps to a simulated second;
 * the simulated sequence itself (scores, states, alerts) is a pure
 * function of the number of ticks elapsed, so it is identical regardless
 * of which speed the tick was played back at - CLAUDE.md "Live means
 * live" plus the determinism this module must not break.
 */
export class PlaybackController {
  private readonly engine: TickEngine
  private timer: ReturnType<typeof setInterval> | null = null
  private speed: PlaybackSpeed = 1
  private readonly listeners = new Set<TickListener>()

  constructor(engine: TickEngine) {
    this.engine = engine
  }

  subscribe(listener: TickListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(result: TickResult): void {
    for (const listener of this.listeners) listener(result)
  }

  play(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.emit(this.engine.step()), 1000 / this.speed)
  }

  pause(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  isPlaying(): boolean {
    return this.timer !== null
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed
    if (this.timer) {
      this.pause()
      this.play()
    }
  }

  getSpeed(): PlaybackSpeed {
    return this.speed
  }

  setScenario(scenario: ScenarioId): void {
    this.engine.setScenario(scenario)
  }

  getScenario(): ScenarioId {
    return this.engine.getScenario()
  }

  /**
   * Fast-forwards synchronously until the next alert fires (starting the
   * `CONVERGENCE` scenario if nothing is already ramping), or a safety cap
   * is reached. Every intermediate tick is still emitted to subscribers,
   * exactly as it would be during ordinary playback, so no state is
   * skipped or interpolated.
   */
  jumpToNextAlert(maxTicks = 90): void {
    if (this.engine.getScenario() === SCENARIO_ID.CALM) {
      this.engine.setScenario(SCENARIO_ID.CONVERGENCE)
    }
    for (let i = 0; i < maxTicks; i++) {
      const result = this.engine.step()
      this.emit(result)
      if (result.raisedAlerts.length > 0) return
    }
  }

  dispose(): void {
    this.pause()
    this.listeners.clear()
  }
}
