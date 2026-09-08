import { useState } from 'react'
import { Dialog } from '@/components'
import { DEFAULT_ALERT_THRESHOLD, DEFAULT_DENSITY_THRESHOLD_PER_SQM } from '@/domain/parameters'
import type { ThresholdSet } from '@/domain/types'
import { useConfigStore } from '@/store'

export interface EditThresholdsProps {
  open: boolean
  zoneId: string
  zoneName: string
  current: ThresholdSet | undefined
  onClose: () => void
  onSaved?: (message: string) => void
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (next: string) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  )
}

/**
 * design.md D06 - per-zone risk and density thresholds (FR9.7).
 *
 * Editable through the interface with no code change and no restart, which
 * is the requirement's whole point. Every save is versioned and written to
 * the audit log with its previous and new value (FR9.9), so a threshold
 * that was lowered before an incident can be found afterwards.
 */
export default function EditThresholds({ open, zoneId, zoneName, current, onClose, onSaved }: EditThresholdsProps) {
  const putThresholds = useConfigStore((s) => s.putThresholds)
  const site = useConfigStore((s) => s.site)

  const [risk, setRisk] = useState(String(current?.riskThreshold ?? DEFAULT_ALERT_THRESHOLD))
  const [density, setDensity] = useState(String(current?.densityThreshold ?? DEFAULT_DENSITY_THRESHOLD_PER_SQM))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const riskValue = Number(risk)
  const densityValue = Number(density)
  const valid =
    Number.isFinite(riskValue) && riskValue > 0 && riskValue <= 1 && Number.isFinite(densityValue) && densityValue > 0

  const save = async () => {
    if (!valid || !site) return
    setSaving(true)
    setError(null)
    try {
      await putThresholds(site.id, {
        siteId: site.id,
        zoneId,
        riskThreshold: riskValue,
        densityThreshold: densityValue,
        version: (current?.version ?? 0) + 1,
        changedBy: current?.changedBy ?? '',
        changedAt: new Date().toISOString(),
      })
      onSaved?.(
        `${zoneName}: risk threshold ${current?.riskThreshold.toFixed(2) ?? '-'} to ${riskValue.toFixed(2)}, density threshold ${current?.densityThreshold.toFixed(1) ?? '-'} to ${densityValue.toFixed(1)} per square metre.`,
      )
      onClose()
    } catch {
      setError('The change could not be saved. Nothing was altered.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={`Thresholds for ${zoneName}`}
      description="Applies to this zone only. Takes effect on the next tick, with no restart."
      confirmLabel={saving ? 'Saving...' : 'Save thresholds'}
      confirmDisabled={!valid || saving}
      onConfirm={() => void save()}
      onCancel={onClose}
      footnote="Saved changes are versioned and audit-logged."
    >
      <NumberField
        id="risk-threshold"
        label="Risk threshold"
        hint={`Between 0 and 1. An alert is raised when a cell's risk reaches this value. The default is ${DEFAULT_ALERT_THRESHOLD.toFixed(2)}, the boundary of the elevated band.`}
        value={risk}
        onChange={setRisk}
        min={0.01}
        max={1}
        step={0.01}
      />
      <NumberField
        id="density-threshold"
        label="Density threshold, people per square metre"
        hint={`The density a suggested route must not push a cell past. The default is ${DEFAULT_DENSITY_THRESHOLD_PER_SQM.toFixed(1)}, since stampede-level density on a 25 square metre cell is roughly 4 to 6 per square metre.`}
        value={density}
        onChange={setDensity}
        min={0.1}
        max={12}
        step={0.1}
      />

      {!valid ? (
        <p className="text-xs text-risk-critical">
          Risk must be above 0 and at most 1. Density must be above 0.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
