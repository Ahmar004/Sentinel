import { useState } from 'react'
import { Dialog } from '@/components'
import { ROLE, type Role } from '@/domain/constants'
import type { User } from '@/domain/types'
import { getSentinelClient } from '@/store'
import { ROLE_LABEL } from '@/auth/roleLabels'

export interface CreateEditUserProps {
  open: boolean
  /** Null creates a new account; a user edits that one. */
  user: User | null
  onClose: () => void
  onSaved: (message: string) => void
}

/**
 * design.md D08 - create or edit an account (FR10.2, FR10.5).
 *
 * Role is chosen from the four the system supports and nothing else, so an
 * administrator cannot invent a fifth role that no screen would know how
 * to gate. The role picker states what each role can reach, because
 * assigning one is the single most consequential thing on this screen.
 */
export default function CreateEditUser({ open, user, onClose, onSaved }: CreateEditUserProps) {
  const editing = user !== null
  const [username, setUsername] = useState(user?.username ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? ROLE.COORDINATOR)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = username.trim().length > 0 && (editing || password.length > 0)

  const submit = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      await getSentinelClient().saveUser({
        userId: user?.userId,
        username: username.trim(),
        role,
        password: password || undefined,
      })
      onSaved(
        editing
          ? `${username.trim()} updated, role ${ROLE_LABEL[role]}.`
          : `${username.trim()} created as ${ROLE_LABEL[role]}.`,
      )
      onClose()
    } catch {
      setError('The account could not be saved. Nothing was changed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={editing ? `Edit ${user.username}` : 'Create an account'}
      description="Role decides which screens this person can open at all."
      confirmLabel={saving ? 'Saving...' : editing ? 'Save changes' : 'Create account'}
      confirmDisabled={!valid || saving}
      onConfirm={() => void submit()}
      onCancel={onClose}
      footnote="Account changes are audit-logged."
    >
      <div className="mb-4">
        <label htmlFor="user-username" className="mb-1 block text-sm font-medium">
          Username
        </label>
        <input
          id="user-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="user-role" className="mb-1 block text-sm font-medium">
          Role
        </label>
        <select
          id="user-role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {Object.values(ROLE).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          The system supports exactly these four roles. Each sees a different set of screens, derived from one
          permission matrix, so a role cannot be given a screen the matrix does not grant.
        </p>
      </div>

      <div className="mb-2">
        <label htmlFor="user-password" className="mb-1 block text-sm font-medium">
          {editing ? 'New password, leave blank to keep the current one' : 'Password'}
        </label>
        <input
          id="user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {!valid ? (
        <p className="text-xs text-ink-muted">
          A username is required{editing ? '' : ', and a new account needs a password'}.
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
