import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { landingRouteForRole } from '@/auth/permissions'

/**
 * S01 - Login, design.md Section 5, FR10.1. The one real screen built in
 * this step; every other route renders a placeholder for now.
 *
 * A real `<form onSubmit>` with `event.preventDefault()`: Enter submits
 * natively because the primary action is `type="submit"`, Escape clears
 * the fields, and every other button is `type="button"` so it can never
 * accidentally submit the form.
 */
export default function S01Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const login = useSessionStore((s) => s.login)
  const navigate = useNavigate()

  const resetForm = useCallback(() => {
    setUsername('')
    setPassword('')
    setFormError(null)
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await login({ username, password })
      const role = useSessionStore.getState().role
      navigate(role ? landingRouteForRole(role) : '/login', { replace: true })
    } catch {
      // FR10.1: an error must not disclose which field was wrong.
      setFormError('Incorrect username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      resetForm()
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-4 text-ink">
      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        onKeyDown={handleKeyDown}
        noValidate
        className="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
      >
        <h1 className="mb-1 text-lg font-semibold">Sentinel</h1>
        <p className="mb-6 text-sm text-ink-muted">
          Crowd control and Stampede early signs detection
        </p>

        <label htmlFor="username" className="mb-1 block text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mb-4 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        {formError && (
          <p role="alert" className="mb-4 text-sm text-risk-critical">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="mt-2 w-full text-sm text-ink-muted underline"
        >
          Clear
        </button>
      </form>
    </div>
  )
}
