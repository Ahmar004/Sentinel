import { Navigate, Outlet } from 'react-router-dom'
import Nav from './Nav'
import TopBar from './TopBar'
import { useCurrentRole } from '@/store'

/**
 * design.md 3.1. `flex-col-reverse` on mobile puts the nav (declared
 * first) visually last, as the bottom bar; `md:flex-row` at the single
 * 768px breakpoint turns it back into the left rail, first in visual
 * order, with no separate mobile/desktop component tree to keep in sync.
 *
 * Wraps every authenticated route. Reads the role itself from the one
 * session object rather than taking it as a prop, so no route has to
 * thread it through.
 */
export default function AppShell() {
  const role = useCurrentRole()
  if (!role) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-dvh flex-col-reverse bg-surface text-ink md:flex-row">
      <Nav role={role} />
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
