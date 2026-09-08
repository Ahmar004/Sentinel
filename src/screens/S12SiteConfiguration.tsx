import { useState } from 'react'
import { useConfigStore } from '@/store'
import {
  AttributesStep,
  DronesStep,
  ExitsStep,
  GridStep,
  PlanStep,
  ProposalsStep,
  ThresholdsStep,
  ZonesStep,
} from './setup/SetupSteps'
import AssignDrone from '@/dialogs/AssignDrone'
import EditThresholds from '@/dialogs/EditThresholds'
import RegenerateGrid from '@/dialogs/RegenerateGrid'
import DemoHarness from '@/dialogs/DemoHarness'

type Tab = 'plan' | 'grid' | 'attributes' | 'exits' | 'zones' | 'thresholds' | 'drones' | 'demo'

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'grid', label: 'Grid' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'exits', label: 'Exits' },
  { id: 'zones', label: 'Zones' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'drones', label: 'Drones' },
  { id: 'demo', label: 'Demo' },
]

/**
 * design.md S12 - site configuration, Administrator only.
 *
 * Seven of the wizard's step components reused as tabs, so a venue is
 * edited after setup through exactly the controls it was created with.
 * Proposals gets no tab of its own, because the setup pass runs once per
 * venue; its accept and reject controls appear inside the Attributes tab
 * wherever unreviewed proposals remain.
 *
 * The Demo tab exists only for the proof of concept and says so.
 */
export default function S12SiteConfiguration() {
  const zones = useConfigStore((s) => s.zones)
  const thresholds = useConfigStore((s) => s.thresholds)
  const [tab, setTab] = useState<Tab>('plan')
  const [toast, setToast] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [harnessOpen, setHarnessOpen] = useState(false)

  const zoneBeingEdited = zones.find((z) => z.zoneId === editingZone)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Site configuration</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The same controls venue setup used, available individually after the venue is running.
        </p>

        <div role="tablist" aria-label="Configuration" className="mt-3 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                tab === t.id ? 'border-accent font-medium' : 'border-transparent text-ink-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {tab === 'plan' ? <PlanStep /> : null}
        {tab === 'grid' ? <GridStep onRequestRegenerate={setRegenerating} /> : null}
        {tab === 'attributes' ? (
          <div className="flex flex-col gap-6">
            <AttributesStep onSaved={setToast} />
            {/* The setup pass runs once per venue, so its review controls
                live here rather than in a tab of their own. */}
            <ProposalsStep onSaved={setToast} />
          </div>
        ) : null}
        {tab === 'exits' ? <ExitsStep onSaved={setToast} /> : null}
        {tab === 'zones' ? <ZonesStep onSaved={setToast} /> : null}
        {tab === 'thresholds' ? <ThresholdsStep onEdit={setEditingZone} /> : null}
        {tab === 'drones' ? <DronesStep onAssign={setAssigning} /> : null}
        {tab === 'demo' ? (
          <div>
            <h3 className="text-sm font-semibold">Demo harness</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Scaffolding for the proposal defence, not a product feature. It drives the mock feed so a coverage gap or
              a rejected safeguard can be shown on demand rather than waited for.
            </p>
            <button
              type="button"
              onClick={() => setHarnessOpen(true)}
              className="mt-3 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Open the harness
            </button>
          </div>
        ) : null}
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
        current={thresholds.find((t) => t.zoneId === editingZone)}
        onClose={() => setEditingZone(null)}
        onSaved={setToast}
      />
      <AssignDrone droneId={assigning} onClose={() => setAssigning(null)} onAssigned={setToast} />
      <DemoHarness open={harnessOpen} onClose={() => setHarnessOpen(false)} />
    </div>
  )
}
