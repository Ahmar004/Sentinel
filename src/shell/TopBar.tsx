import { useState } from 'react'
import { Moon, Sun, LogOut, User as UserIcon } from 'lucide-react'
import { useConfigStore, useConnectionState, useSessionStore } from '@/store'
import { useClock } from '@/hooks/useClock'
import { useTheme } from '@/hooks/useTheme'
import ConnectionChip from '@/components/ConnectionChip'

/**
 * Top bar, present on every screen - design.md 3.1: site selector,
 * connection chip, latency, site clock, user menu. Latency has no honest
 * value to show until a live client is wired up, so it reads "-" rather
 * than a fabricated number (CLAUDE.md "honesty over completeness").
 */
export default function TopBar() {
  const siteName = useConfigStore((s) => s.site?.name)
  const connectionState = useConnectionState()
  const clock = useClock()
  const { theme, toggleTheme } = useTheme()
  const user = useSessionStore((s) => s.user)
  const logout = useSessionStore((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{siteName ?? 'No site selected'}</span>
      </div>

      <div className="flex items-center gap-4">
        <ConnectionChip state={connectionState} />
        <span className="text-xs text-ink-muted" title="End-to-end latency">
          {'—'}
        </span>
        <span className="text-xs text-ink-muted" suppressHydrationWarning>
          {clock.toLocaleTimeString()}
        </span>

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
                onClick={toggleTheme}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-surface"
              >
                {theme === 'dark' ? (
                  <Sun className="size-4" aria-hidden="true" />
                ) : (
                  <Moon className="size-4" aria-hidden="true" />
                )}
                {theme === 'dark' ? 'Light theme' : 'Dark theme'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-surface"
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
