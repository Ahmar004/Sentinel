import { Navigate } from 'react-router-dom'
import { useCurrentRole } from '@/store'
import { landingRouteForRole } from '@/auth/permissions'

/** design.md 3.2: lands each role on its own home screen after login. */
export default function LandingRedirect() {
  const role = useCurrentRole()
  return <Navigate to={role ? landingRouteForRole(role) : '/login'} replace />
}
