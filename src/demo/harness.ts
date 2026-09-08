/**
 * The demo harness boundary.
 *
 * `srs.md` Appendix B marks the harness as scaffolding for the proposal
 * defence: nothing in it survives the arrival of a real backend, and no
 * requirement depends on it. So it deliberately does NOT live on the
 * `SentinelClient` contract, which a real backend must satisfy in full.
 *
 * Instead the composition root registers whatever controller the mock
 * layer provides, and `D14` reads it from here. That keeps the rule
 * `CLAUDE.md` sets - a screen never imports `src/mock` - while letting the
 * harness reach the simulator. When the mock layer is deleted, nothing
 * registers a controller, `getDemoHarness()` returns null, and `D14`
 * renders its controls disabled with the reason stated.
 */

export interface DemoScenario {
  id: string
  label: string
  description: string
}

export interface DemoHarnessController {
  play(): void
  pause(): void
  isPlaying(): boolean
  setSpeed(speed: number): void
  getSpeed(): number
  setScenario(scenario: string): void
  getScenario(): string
  jumpToNextAlert(): void
}

export interface DemoHarness {
  controller: DemoHarnessController
  scenarios: DemoScenario[]
  speeds: readonly number[]
}

let harness: DemoHarness | null = null

export function setDemoHarness(next: DemoHarness | null): void {
  harness = next
}

/** Null whenever no simulator is running behind the client, which is the
 * normal state once a real backend is connected. */
export function getDemoHarness(): DemoHarness | null {
  return harness
}
