import { useState } from 'react'
import { Pause, Play, SkipForward } from 'lucide-react'
import { Dialog } from '@/components'
import { getDemoHarness } from '@/demo/harness'

export interface DemoHarnessProps {
  open: boolean
  onClose: () => void
}

/**
 * design.md D14 - the demo harness, Administrator only.
 *
 * Scaffolding for the proposal defence, not a product feature, and the
 * dialog says so plainly. Without directable scenarios, showing a coverage
 * gap or a rejected safeguard would mean waiting for one to happen by
 * chance in front of a panel (srs.md Appendix B).
 *
 * It drives the simulator only. It cannot change what a screen does with
 * the data it receives, so nothing seen while a scenario runs is a
 * different product from what runs without one.
 */
export default function DemoHarness({ open, onClose }: DemoHarnessProps) {
  const harness = getDemoHarness()
  const [, forceRender] = useState(0)
  const refresh = () => forceRender((n) => n + 1)

  return (
    <Dialog
      open={open}
      title="Demo harness"
      description="Proof-of-concept scaffolding. Not part of the product."
      cancelLabel="Close"
      onCancel={onClose}
    >
      {harness === null ? (
        <p className="text-sm text-ink-muted">
          No simulator is running, so there is nothing to drive. This is the expected state once a real backend is
          connected: the harness exists only to script the mock feed.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (harness.controller.isPlaying()) harness.controller.pause()
                else harness.controller.play()
                refresh()
              }}
              className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {harness.controller.isPlaying() ? (
                <>
                  <Pause className="size-4" aria-hidden="true" /> Pause
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" /> Play
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                harness.controller.jumpToNextAlert()
                refresh()
              }}
              className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <SkipForward className="size-4" aria-hidden="true" /> Jump to next alert
            </button>
          </div>

          <fieldset className="mb-4">
            <legend className="mb-1 text-sm font-medium">Speed</legend>
            <div className="flex gap-1">
              {harness.speeds.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => {
                    harness.controller.setSpeed(speed)
                    refresh()
                  }}
                  aria-pressed={harness.controller.getSpeed() === speed}
                  className={`rounded border px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    harness.controller.getSpeed() === speed ? 'border-accent bg-surface-sunken' : 'border-border'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Scenario</legend>
            <ul className="flex flex-col gap-2">
              {harness.scenarios.map((scenario) => {
                const active = harness.controller.getScenario() === scenario.id
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => {
                        harness.controller.setScenario(scenario.id)
                        refresh()
                      }}
                      aria-pressed={active}
                      className={`w-full rounded border p-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                        active ? 'border-accent bg-surface-sunken' : 'border-border'
                      }`}
                    >
                      <span className="text-sm font-medium">{scenario.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{scenario.description}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <p className="mt-4 rounded border border-border bg-surface-sunken p-2 text-xs">
            The harness drives the simulator and nothing else. It cannot change how a screen renders what it receives,
            so a scenario shows the real product reacting to scripted conditions, not a different product.
          </p>
        </>
      )}
    </Dialog>
  )
}
