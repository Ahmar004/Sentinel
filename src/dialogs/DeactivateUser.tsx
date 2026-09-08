import { useState } from 'react'
import { Dialog } from '@/components'
import type { User } from '@/domain/types'
import { getSentinelClient } from '@/store'

export interface DeactivateUserProps {
  user: User | null
  onClose: () => void
  onDeactivated: (message: string) => void
}

/**
 * design.md D09 - deactivate an account (FR10.5).
 *
 * Deactivation, never deletion. The dialog says so, because the two are
 * easy to conflate and only one of them is safe: a deleted account takes
 * its audit trail with it, and the whole point of the audit log is that
 * what somebody did remains findable after they stop working here.
 */
export default function DeactivateUser({ user, onClose, onDeactivated }: DeactivateUserProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().deactivateUser(user.userId)
      onDeactivated(`${user.username} deactivated. Their history is unchanged.`)
      onClose()
    } catch {
      setError('The account could not be deactivated. Nothing was changed.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <Dialog
      open
      title={`Deactivate ${user.username}`}
      description="This account will no longer be able to sign in."
      confirmLabel={saving ? 'Deactivating...' : 'Deactivate account'}
      confirmDisabled={saving}
      destructive
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Deactivation is audit-logged."
    >
      <p className="text-sm">
        {user.username} will be signed out and refused at the login screen from now on.
      </p>
      <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        Their historical audit entries remain intact. The account is deactivated, not deleted, because removing it would
        take the record of what they did with it, and that record is the reason the audit log exists.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-xs text-risk-critical">
          {error}
        </p>
      ) : null}
    </Dialog>
  )
}
