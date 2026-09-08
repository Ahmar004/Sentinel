import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useCurrentRole } from '@/store'
import { landingRouteForRole } from '@/auth/permissions'

/**
 * S16 - Not permitted, design.md Section 5. Reached whenever a role hits a
 * route the permission matrix does not grant it (FR10.3). Never blank and
 * never a generic browser 404: it names the reason, matching the honesty
 * principle applied to access rather than to data.
 */
export default function S16NotPermitted() {
  const role = useCurrentRole()
  const homeRoute = role ? landingRouteForRole(role) : '/login'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <ShieldAlert className="size-10 text-risk-elevated" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Not permitted</h1>
      <p className="max-w-prose text-sm text-ink-muted">
        Your role does not have access to this screen. This is enforced by
        the same permission matrix that built your navigation, so nothing
        else on your account has been affected.
      </p>
      <Link to={homeRoute} className="mt-2 text-sm text-accent underline">
        Return to your dashboard
      </Link>
    </div>
  )
}
