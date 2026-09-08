import { useState } from 'react'
import { Dialog } from '@/components'
import { SITE_EXTENT_M } from '@/domain/parameters'
import { useConfigStore } from '@/store'

export interface RegenerateGridProps {
  /** Null when closed; the proposed cell size in metres when open. */
  cellSizeM: number | null
  onClose: () => void
  onRegenerated: (message: string) => void
}

/**
 * design.md D11 - changing cell size regenerates the cell set (FR9.2).
 *
 * This is the most destructive action in configuration and the dialog says
 * exactly why: every cell identifier changes, so the zones defined against
 * the old identifiers no longer refer to anything, and the history
 * recorded against them cannot be replayed over the new grid. An
 * administrator who understands that before confirming will not be
 * surprised by it afterwards.
 */
export default function RegenerateGrid({ cellSizeM, onClose, onRegenerated }: RegenerateGridProps) {
  const site = useConfigStore((s) => s.site)
  const grid = useConfigStore((s) => s.grid)
  const zones = useConfigStore((s) => s.zones)
  const putGrid = useConfigStore((s) => s.putGrid)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (cellSizeM === null) return null

  const extent = site?.groundExtentM ?? SITE_EXTENT_M
  const cols = Math.floor(extent.width / cellSizeM)
  const rows = Math.floor(extent.height / cellSizeM)

  const submit = async () => {
    if (!site || !grid) return
    setSaving(true)
    setError(null)
    try {
      await putGrid(site.id, { cellSizeM, originLatLon: grid.originLatLon })
      onRegenerated(`Grid regenerated at ${cellSizeM} m cells, ${cols} by ${rows}.`)
      onClose()
    } catch {
      setError('The grid could not be regenerated. The existing grid is unchanged.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      title="Regenerate the cell grid"
      description={`Cell size changes from ${grid?.cellSizeM ?? '-'} m to ${cellSizeM} m.`}
      confirmLabel={saving ? 'Regenerating...' : 'Regenerate the grid'}
      confirmDisabled={saving}
      destructive
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="This change is audit-logged."
    >
      <p className="text-sm">
        The new grid is {cols} columns by {rows} rows, {(cols * rows).toLocaleString()} cells.
      </p>

      <div className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        <p>Changing cell size rebuilds every cell identifier in the site. Three things follow from that:</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
          <li>
            The {zones.length} configured {zones.length === 1 ? 'zone is' : 'zones are'} defined against the old
            identifiers and will be detached. They must be drawn again.
          </li>
          <li>Cell attributes marked against the old identifiers no longer apply and must be marked again.</li>
          <li>
            History already recorded against the old cells stays in the audit trail but cannot be replayed over the new
            grid, because the cells it refers to no longer exist.
          </li>
        </ul>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
