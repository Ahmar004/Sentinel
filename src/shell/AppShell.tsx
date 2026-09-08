import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import Nav from './Nav'
import TopBar from './TopBar'
import { getSentinelClient, useAlerts, useCurrentRole, useSessionStore } from '@/store'
import AlertToast from '@/dialogs/AlertToast'
import InstallApp from '@/dialogs/InstallApp'
import NotificationPermission from '@/dialogs/NotificationPermission'
import SessionExpired from '@/dialogs/SessionExpired'

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
  const status = useSessionStore((s) => s.status)
  const logout = useSessionStore((s) => s.logout)
  const alerts = useAlerts()
  const navigate = useNavigate()

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [muted, setMuted] = useState(false)

  if (!role) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-dvh flex-col-reverse bg-surface text-ink md:flex-row">
      <Nav role={role} />
      <div className="flex min-h-0 flex-1 flex-col">
        <TopBar
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenInstall={() => setInstallOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* D05 sits at the shell so an alert reaches a coordinator on
          whatever screen they happen to be on, not only the live map. */}
      <AlertToast
        alerts={alerts}
        onView={(alertId) => navigate(`/live/alerts/${alertId}`)}
        onAcknowledge={(alertId) => void getSentinelClient().acknowledgeAlert(alertId)}
      />

      <NotificationPermission
        open={notificationsOpen}
        muted={muted}
        onMutedChange={setMuted}
        onClose={() => setNotificationsOpen(false)}
      />

      <InstallApp
        open={installOpen}
        onInstall={() => setInstallOpen(false)}
        onDismiss={() => setInstallOpen(false)}
      />

      {/* D12. Not dismissable: everything behind it is stale by
          definition, so the only way out is signing in again. */}
      <SessionExpired
        open={status === 'error'}
        onSignInAgain={() => {
          logout()
          navigate('/login', { replace: true })
        }}
      />
    </div>
  )
}
