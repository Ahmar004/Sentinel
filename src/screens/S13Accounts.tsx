import { useCallback, useEffect, useState } from 'react'
import { RolesReference } from '@/components'
import type { User } from '@/domain/types'
import { getSentinelClient } from '@/store'
import { ROLE_LABEL } from '@/auth/roleLabels'
import CreateEditUser from '@/dialogs/CreateEditUser'
import DeactivateUser from '@/dialogs/DeactivateUser'

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; users: User[] }

/**
 * design.md S13 - account management, Administrator only.
 *
 * The roles panel is the same `C11` component `S17` renders, from the same
 * permission matrix routing enforces, so an administrator assigning a role
 * reads the same description of it that the system actually applies
 * (decision D20).
 */
export default function S13Accounts() {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [editing, setEditing] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })
  const [deactivating, setDeactivating] = useState<User | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getSentinelClient()
      .getUsers()
      .then((users) => {
        if (!cancelled) setLoad({ state: 'ready', users })
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const afterChange = useCallback((message: string) => {
    setToast(message)
    setReloadKey((k) => k + 1)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Accounts</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Who can sign in, and what their role lets them reach.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ open: true, user: null })}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            Create account
          </button>
        </div>
      </header>

      <div className="p-4">
        {load.state === 'loading' ? (
          <p className="text-sm text-ink-muted">Loading accounts.</p>
        ) : load.state === 'error' ? (
          <p className="text-sm text-ink-muted">Accounts could not be loaded. Nothing is listed rather than a stale set.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="bg-surface-raised text-xs text-ink-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pl-3 font-medium">Username</th>
                  <th scope="col" className="py-1.5 font-medium">Role</th>
                  <th scope="col" className="py-1.5 font-medium">Status</th>
                  <th scope="col" className="py-1.5 font-medium">Last sign in</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {load.users.map((user) => (
                  <tr key={user.userId} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 pl-3 font-mono text-xs">{user.username}</td>
                    <td className="py-1.5 text-xs">{ROLE_LABEL[user.role]}</td>
                    <td className="py-1.5 text-xs">
                      {user.active ? (
                        'Active'
                      ) : (
                        <span className="text-ink-muted">Deactivated, cannot sign in</span>
                      )}
                    </td>
                    <td className="py-1.5 font-mono text-xs">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing({ open: true, user })}
                        className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        Edit
                      </button>
                      {user.active ? (
                        <button
                          type="button"
                          onClick={() => setDeactivating(user)}
                          className="ml-3 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-2 text-xs text-ink-muted">
          A deactivated account cannot authenticate, and its historical audit entries remain intact.
        </p>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">What each role may do</h2>
          <RolesReference />
          <p className="mt-2 text-xs text-ink-muted">
            This is the same table the roles reference screen shows, rendered from the permission matrix routing
            enforces, so assigning a role here means exactly what this says it means.
          </p>
        </section>
      </div>

      {toast ? (
        <p role="status" className="sticky bottom-0 border-t border-border bg-surface-raised px-4 py-2 text-xs">
          {toast}
        </p>
      ) : null}

      <CreateEditUser
        key={editing.user?.userId ?? 'new'}
        open={editing.open}
        user={editing.user}
        onClose={() => setEditing({ open: false, user: null })}
        onSaved={afterChange}
      />
      <DeactivateUser user={deactivating} onClose={() => setDeactivating(null)} onDeactivated={afterChange} />
    </div>
  )
}
