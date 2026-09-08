import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentRole } from '@/store'
import type { Role } from '@/domain/constants'

/**
 * FR10.3: a role hitting a route it cannot open lands on S16, never on the
 * screen itself and never on a blank page. `AppShell` already redirects an
 * unauthenticated session to `/login`, so by the time this runs `role` is
 * set; the `!role` branch only guards against this component being reused
 * outside that shell later.
 */
export default function RequireRole({
  roles,
  children,
}: {
  roles: readonly Role[]
  children: ReactNode
}) {
  const role = useCurrentRole()

  if (!role) {
    return <Navigate to="/login" replace />
  }
  if (!roles.includes(role)) {
    return <Navigate to="/403" replace />
  }
  return <>{children}</>
}
