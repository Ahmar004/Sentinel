import { useState } from 'react'
import { Check } from 'lucide-react'
import { useConfigStore } from '@/store'
import {
  AttributesStep,
  DronesStep,
  ExitsStep,
  GridStep,
  PlanStep,
  ProposalsStep,
  ReviewStep,
  ThresholdsStep,
  ZonesStep,
} from './setup/SetupSteps'
import AssignDrone from '@/dialogs/AssignDrone'
import EditThresholds from '@/dialogs/EditThresholds'
import RegenerateGrid from '@/dialogs/RegenerateGrid'

const STEPS = [
  { id: 1, label: 'Site plan', requirement: 'FR9.1' },
  { id: 2, label: 'Grid', requirement: 'FR9.2' },
  { id: 3, label: 'Proposals', requirement: 'FR9.3' },
  { id: 4, label: 'Attributes', requirement: 'FR9.4' },
  { id: 5, label: 'Exits', requirement: 'FR9.5' },
  { id: 6, label: 'Zones', requirement: 'FR9.6' },
  { id: 7, label: 'Thresholds', requirement: 'FR9.7' },
  { id: 8, label: 'Drones', requirement: 'FR9.8' },
  { id: 9, label: 'Review', requirement: 'FR9.9' },
]

/**
 * design.md S11 - the venue setup wizard, Administrator only.
 *
 * Each step is a component `S12` reuses as a tab, so a venue is configured
 * once through a guided path and edited afterwards through the same
 * controls, and neither is written twice.
 *
 * Steps are non-linear once visited, because setting up a venue is not a
 * queue: an administrator who realises at step 6 that an exit was wrong
 * goes back to step 5 and returns, rather than starting again.
 */
export default function S11VenueSetupWizard() {
  const zones = useConfigStore((s) => s.zones)
  const [step, setStep] = useState(1)
  const [visited, setVisited] = useState<Set<number>>(new Set([1]))
  const [toast, setToast] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

  const go = (next: number) => {
    setStep(next)
    setVisited((v) => new Set(v).add(next))
  }

  const zoneBeingEdited = zones.find((z) => z.zoneId === editingZone)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Venue setup</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Run once per venue. Everything here is editable afterwards in configuration, through the same controls.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Desktop shows the step list beside the active step. Mobile shows
            one full-screen step at a time, which is the pattern an
            administrator on a phone at the venue can actually work with. */}
        <nav aria-label="Setup steps" className="shrink-0 border-b border-border md:w-64 md:border-b-0 md:border-r">
          <ol className="flex overflow-x-auto md:flex-col md:overflow-visible">
            {STEPS.map((s) => (
              <li key={s.id} className="md:border-b md:border-border md:last:border-b-0">
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  aria-current={step === s.id ? 'step' : undefined}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    step === s.id ? 'bg-surface-sunken font-medium' : ''
                  }`}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-xs">
                    {visited.has(s.id) && step !== s.id ? <Check className="size-3" aria-hidden="true" /> : s.id}
                  </span>
                  <span className="min-w-0">
                    {s.label}
                    <span className="ml-1 hidden text-xs text-ink-muted md:inline">{s.requirement}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {step === 1 ? <PlanStep /> : null}
          {step === 2 ? <GridStep onRequestRegenerate={setRegenerating} /> : null}
          {step === 3 ? <ProposalsStep onSaved={setToast} /> : null}
          {step === 4 ? <AttributesStep onSaved={setToast} /> : null}
          {step === 5 ? <ExitsStep onSaved={setToast} /> : null}
          {step === 6 ? <ZonesStep onSaved={setToast} /> : null}
          {step === 7 ? <ThresholdsStep onEdit={setEditingZone} /> : null}
          {step === 8 ? <DronesStep onAssign={setAssigning} /> : null}
          {step === 9 ? <ReviewStep onSave={() => setToast('Configuration saved and audit-logged.')} /> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => go(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => go(Math.min(STEPS.length, step + 1))}
              disabled={step === STEPS.length}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              {step === 3 ? 'Skip this step' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <p role="status" className="sticky bottom-0 border-t border-border bg-surface-raised px-4 py-2 text-xs">
          {toast}
        </p>
      ) : null}

      <RegenerateGrid cellSizeM={regenerating} onClose={() => setRegenerating(null)} onRegenerated={setToast} />
      <EditThresholds
        open={zoneBeingEdited !== undefined}
        zoneId={zoneBeingEdited?.zoneId ?? ''}
        zoneName={zoneBeingEdited?.name ?? ''}
        current={undefined}
        onClose={() => setEditingZone(null)}
        onSaved={setToast}
      />
      <AssignDrone droneId={assigning} onClose={() => setAssigning(null)} onAssigned={setToast} />
    </div>
  )
}
