import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store'
import { landingRouteForRole } from '@/auth/permissions'
import { PipelineDiagram } from '@/components/diagrams'
import { DEACTIVATED_ACCOUNT, DEMO_ACCOUNTS, DEMO_PASSWORD } from './demoAccounts'

/**
 * Openly-licensed photographs of very high crowd density, bundled in the
 * repo (not hotlinked) and credited on screen and in CREDITS.md. They
 * establish what Sentinel is for before any live data is shown. Desktop
 * gets the mosaic; mobile gets the first image alone.
 */
const LOGIN_IMAGES = [
  { src: '/login/01-hajj-tawaf.jpg', alt: 'Pilgrims performing tawaf around the Kaaba during Hajj' },
  { src: '/login/02-hajj-mecca.jpg', alt: 'Crowds of pilgrims at the Masjid al-Haram in Mecca' },
  { src: '/login/03-kumbh-mela.jpg', alt: 'Crowds near Shastri Bridge at the Kumbh Mela, Prayagraj' },
  { src: '/login/04-concert-aerial.jpg', alt: 'Aerial view of a stadium concert crowd at Modena Park' },
  { src: '/login/05-festival.jpg', alt: 'Festival crowd at the Donauinselfest in Vienna' },
] as const

/**
 * S01 - Login, design.md Section 5, FR10.1.
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
    <div className="min-h-dvh bg-surface text-ink md:grid md:grid-cols-[3fr_2fr]">
      {/* Image pane - desktop only. Mobile gets a single banner above the card. */}
      <aside className="relative hidden overflow-hidden md:block">
        <div className="grid h-full grid-cols-2 grid-rows-[2fr_1fr_1fr] gap-0.5">
          <img src={LOGIN_IMAGES[0].src} alt="" className="col-span-2 size-full object-cover" />
          <img src={LOGIN_IMAGES[1].src} alt="" className="size-full object-cover" loading="lazy" />
          <img src={LOGIN_IMAGES[2].src} alt="" className="size-full object-cover" loading="lazy" />
          <img src={LOGIN_IMAGES[3].src} alt="" className="size-full object-cover" loading="lazy" />
          <img src={LOGIN_IMAGES[4].src} alt="" className="size-full object-cover" loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-surface/20" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="mb-2 max-w-xl text-sm text-ink">
            Sentinel watches crowd density and movement across a venue, fuses every drone&apos;s reading onto one map,
            and warns coordinators of Stampede precursors before a crush begins.
          </p>
          <PipelineDiagram className="max-w-xl opacity-90" />
          <p className="mt-2 text-xs text-ink-muted">
            Images: Wikimedia Commons, Creative Commons and public domain. Full credits in CREDITS.md.
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col items-center justify-center p-4">
        <img
          src={LOGIN_IMAGES[0].src}
          alt={LOGIN_IMAGES[0].alt}
          className="mb-4 h-40 w-full max-w-sm rounded-lg object-cover md:hidden"
        />
        <form
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
          onKeyDown={handleKeyDown}
          noValidate
          className="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
        >
          <h1 className="mb-1 text-2xl font-semibold">Sentinel</h1>
          <p className="mb-6 text-sm text-ink-muted">Crowd control and Stampede early signs detection</p>

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
          <button type="button" onClick={resetForm} className="mt-2 w-full text-sm text-ink-muted underline">
            Clear
          </button>

          {/* Proof-of-concept scaffolding, marked as such in the same way the
              demo harness is. Each role sees a genuinely different screen set
              (FR10), so being able to switch roles in one click is what makes
              that visible at the defence rather than merely claimed. Nothing
              here survives the arrival of a real backend. */}
          <div className="mt-6 border-t border-border pt-4">
            <h2 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Demo accounts</h2>
            <p className="mt-1 mb-2 text-xs text-ink-muted">
              Proof of concept only. Every account uses the password{' '}
              <code className="font-mono">{DEMO_PASSWORD}</code>.
            </p>
            <ul className="flex flex-col gap-1">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.username}>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(account.username)
                      setPassword(DEMO_PASSWORD)
                      setFormError(null)
                    }}
                    className="flex w-full items-baseline justify-between gap-2 rounded border border-border px-2 py-1 text-left text-xs hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="font-mono">{account.username}</span>
                    <span className="text-ink-muted">{account.role}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              {DEACTIVATED_ACCOUNT.username} is deactivated and cannot sign in, which is how FR10.5 is demonstrated.
            </p>
          </div>
        </form>

        <p className="mt-4 max-w-sm text-xs text-ink-muted md:hidden">
          Image: Wikimedia Commons, Creative Commons and public domain. Full credits in CREDITS.md.
        </p>
      </div>
    </div>
  )
}
