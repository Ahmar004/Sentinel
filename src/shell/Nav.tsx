import { NavLink } from 'react-router-dom'
import {
  Map,
  LineChart,
  Plane,
  History,
  Lightbulb,
  BarChart3,
  PlayCircle,
  Settings,
  Users,
  ScrollText,
  HeartPulse,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { navEntriesForRole, type NavEntry } from '@/auth/permissions'
import type { Role } from '@/domain/constants'

const ICON_BY_NAV_ID: Record<string, LucideIcon> = {
  live: Map,
  timeline: LineChart,
  fleet: Plane,
  history: History,
  suggestions: Lightbulb,
  analytics: BarChart3,
  replay: PlayCircle,
  config: Settings,
  accounts: Users,
  audit: ScrollText,
  health: HeartPulse,
  roles: ShieldCheck,
}

function NavItem({ entry }: { entry: NavEntry }) {
  const Icon = ICON_BY_NAV_ID[entry.id] ?? Map
  return (
    <NavLink
      to={entry.route}
      className={({ isActive }) =>
        [
          'flex flex-col items-center gap-1 rounded px-2 py-1.5 text-xs',
          'md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2 md:text-sm',
          isActive ? 'bg-surface-raised text-accent' : 'text-ink-muted hover:text-ink',
        ].join(' ')
      }
    >
      <Icon className="size-5 md:size-4" aria-hidden="true" />
      <span>{entry.label}</span>
    </NavLink>
  )
}

/**
 * design.md 3.1: a 200px labelled rail on desktop, a bottom bar within
 * thumb reach on mobile, adapting at the single 768px breakpoint
 * (Tailwind's default `md:`). Both render the same role-filtered entry
 * list, so neither can drift from the permission matrix.
 */
export default function Nav({ role }: { role: Role }) {
  const entries = navEntriesForRole(role)

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 justify-around border-t border-border bg-surface-raised p-1 md:w-[200px] md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:p-3"
    >
      {entries.map((entry) => (
        <NavItem key={entry.id} entry={entry} />
      ))}
    </nav>
  )
}
