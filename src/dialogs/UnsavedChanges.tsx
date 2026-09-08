import { Dialog } from '@/components'

export interface UnsavedChangesProps {
  open: boolean
  /** What the person was doing, so the dialog names it rather than saying
   * "this page" and leaving them to work out which edit is at stake. */
  what: string
  onDiscard: () => void
  onStay: () => void
}

/**
 * design.md D10 - leaving a step or tab with unsaved edits.
 *
 * The destructive action is discarding, so discarding is the button that
 * carries the warning styling and staying is the safe default the dialog
 * returns to on Escape.
 */
export default function UnsavedChanges({ open, what, onDiscard, onStay }: UnsavedChangesProps) {
  return (
    <Dialog
      open={open}
      title="Unsaved changes"
      description={`Your edits to ${what} have not been saved.`}
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={onDiscard}
      onCancel={onStay}
    >
      <p className="text-sm">
        Leaving now discards those edits. Nothing is written to the configuration and nothing is audit-logged, because
        nothing changed.
      </p>
    </Dialog>
  )
}
