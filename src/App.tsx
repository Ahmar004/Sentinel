import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '@/shell/AppShell'
import RequireRole from '@/routes/RequireRole'
import LandingRedirect from '@/routes/LandingRedirect'
import { ROUTE_DEFS } from '@/routes/routeConfig'
import S01Login from '@/screens/S01Login'
import S16NotPermitted from '@/screens/S16NotPermitted'

/**
 * All 19 screens, S01 to S19 (design.md Section 4). S01 and S16 sit
 * outside the authenticated shell: a login page has no nav to render, and
 * "not permitted" must render for a role the shell itself might reject.
 * Every other screen is role-gated by `RequireRole`, reading from the one
 * permission-derived list in `routeConfig.tsx`.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<S01Login />} />
        <Route path="/403" element={<S16NotPermitted />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<LandingRedirect />} />
          {ROUTE_DEFS.map(({ screenId, path, roles, element }) => (
            <Route
              key={screenId}
              path={path}
              element={<RequireRole roles={roles}>{element}</RequireRole>}
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
