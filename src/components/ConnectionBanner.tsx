import { AlertTriangle, Loader2, WifiOff } from 'lucide-react'
import { CONNECTION_STATE, type ConnectionState } from '@/domain/constants'
import StateChip from './StateChip'

export interface ConnectionBannerProps {
  state: ConnectionState
}

const COPY: Partial<Record<ConnectionState, string>> = {
  [CONNECTION_STATE.CONNECTING]: 'Connecting to the live feed. No values are shown until a snapshot arrives.',
  [CONNECTION_STATE.DEGRADED]:
    'Updates are arriving late. Cells are ageing normally and will show stale or gap if this continues.',
  [CONNECTION_STATE.DISCONNECTED]:
    'Live feed lost. Cells are ageing into gaps; actions that need the server are disabled until it returns.',
}

/**
 * design.md C08 / Section 10. Renders nothing when live, matching the
 * degraded/empty/error rule that a screen must never show a stale value
 * as current: the banner itself disappearing is how "live" is shown, with
 * no separate "all good" copy competing for attention.
 */
export default function ConnectionBanner({ state }: ConnectionBannerProps) {
  if (state === CONNECTION_STATE.LIVE) return null

  const Icon = state === CONNECTION_STATE.CONNECTING ? Loader2 : state === CONNECTION_STATE.DEGRADED ? AlertTriangle : WifiOff

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-border bg-surface-raised px-3 py-2 text-xs text-ink"
    >
      <Icon className={`size-4 shrink-0 ${state === CONNECTION_STATE.CONNECTING ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span className="flex-1">{COPY[state]}</span>
      <StateChip kind="connectionState" value={state} />
    </div>
  )
}
