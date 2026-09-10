import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useSessionStore } from '@/store'
import { landingRouteForRole } from '@/auth/permissions'
import { DEACTIVATED_ACCOUNT, DEMO_ACCOUNTS, DEMO_PASSWORD } from './demoAccounts'

/**
 * Two real-world crowd-disaster case studies, shown below the fold on the
 * login screen. Each card - image and caption together - links to news
 * coverage of the event. Files are bundled in `public/login/` and the
 * sources are recorded in CREDITS.md.
 */
const CASE_STUDIES = [
  {
    src: '/login/mina-hajj-2015.jpg',
    alt: 'Aerial view of dense pilgrim crowds moving through the Mina valley during Hajj',
    caption: 'Stampede at Mina during Hajj in 2015',
    href: 'https://www.nytimes.com/interactive/2015/09/24/world/middleeast/mecca-mina-stampede-hajj-maps.html',
  },
  {
    src: '/login/kumbh-mela.avif',
    alt: 'Dense crowds of devotees at the Maha Kumbh Mela',
    caption: 'Stampede at the Maha Kumbh Mela in 2025',
    href: 'https://www.business-standard.com/india-news/mahakumbh-stampede-india-deadliest-incidents-religious-festival-tragedy-125012900819_1.html',
  },
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
    <div className="min-h-dvh bg-surface text-ink">
      <section className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
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

        <a
          href="#case-studies"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-ink-muted shadow-sm hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          Slide below to see Sentinel&apos;s case studies
        </a>
      </section>

      <section id="case-studies" className="mx-auto max-w-5xl scroll-mt-4 px-4 pb-12">
        <h2 className="mb-1 text-lg font-semibold">Case studies</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Crowd disasters Sentinel is built to give warning of. Each links to news coverage of the event.
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:flex-wrap">
          {CASE_STUDIES.map((study) => (
            <a
              key={study.href}
              href={study.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg border border-border bg-surface-raised transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:min-w-[320px] md:flex-1"
            >
              <img src={study.src} alt={study.alt} className="h-56 w-full object-cover" loading="lazy" />
              <p className="p-3 text-sm font-medium group-hover:underline">{study.caption}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
