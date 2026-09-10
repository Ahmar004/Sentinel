import { useEffect, useState } from 'react'
import { Bell, Download, Moon, Sun, LogOut, User as UserIcon } from 'lucide-react'
import { getSentinelClient, useConfigStore, useConnectionState, useSessionStore } from '@/store'
import { LATENCY_BUDGET_MS } from '@/domain/parameters'
import { useClock } from '@/hooks/useClock'
import { HEALTH_POLL_MS, useTicker } from '@/hooks/useTicker'
import { useTheme } from '@/hooks/useTheme'
import ConnectionChip from '@/components/ConnectionChip'

/**
 * Top bar, present on every screen - design.md 3.1: site selector,
 * connection chip, latency, site clock, user menu. Latency has no honest
 * value to show until a live client is wired up, so it reads "-" rather
 * than a fabricated number (CLAUDE.md "honesty over completeness").
 */
export interface TopBarProps {
  onOpenNotifications?: () => void
  onOpenInstall?: () => void
}

export default function TopBar({ onOpenNotifications, onOpenInstall }: TopBarProps) {
  const siteName = useConfigStore((s) => s.site?.name)
  const connectionState = useConnectionState()
  const clock = useClock()
  const { theme, toggleTheme } = useTheme()
  const user = useSessionStore((s) => s.user)
  const logout = useSessionStore((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const healthTick = useTicker(HEALTH_POLL_MS)

  // The measured figure, refreshed at the rate health is actually pushed
  // rather than on the site clock. CLAUDE.md requires the coordinator to be
  // able to see whether what they are looking at is current without asking,
  // so this is never a placeholder.
  useEffect(() => {
    let cancelled = false
    getSentinelClient()
      .getHealth()
      .then((health) => {
        if (!cancelled) setLatencyMs(health.latency.measuredMs)
      })
      .catch(() => {
        if (!cancelled) setLatencyMs(null)
      })
    return () => {
      cancelled = true
    }
  }, [healthTick])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold">{siteName ?? 'No site selected'}</span>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionChip state={connectionState} />
        <span
          className={`text-xs tabular-nums ${
            latencyMs !== null && latencyMs > LATENCY_BUDGET_MS ? 'text-risk-elevated' : 'text-ink-muted'
          }`}
          title={`End-to-end latency, against a ${LATENCY_BUDGET_MS} ms budget`}
        >
          {latencyMs === null ? 'latency unknown' : `${(latencyMs / 1000).toFixed(1)} s`}
        </span>
        <span className="text-xs text-ink-muted" suppressHydrationWarning>
          {clock.toLocaleTimeString()}
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          className="rounded border border-border p-1.5 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {theme === 'dark' ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs"
          >
            <UserIcon className="size-4" aria-hidden="true" />
            {user?.username ?? 'Guest'}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-1 w-44 rounded border border-border bg-surface-raised p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onOpenNotifications?.()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface"
              >
                <Bell className="size-4" aria-hidden="true" />
                Alert notifications
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onOpenInstall?.()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface"
              >
                <Download className="size-4" aria-hidden="true" />
                Install Sentinel
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
