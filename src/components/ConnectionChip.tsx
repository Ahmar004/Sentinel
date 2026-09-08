import { CONNECTION_STATE, type ConnectionState } from '@/domain/constants'

const LABEL: Record<ConnectionState, string> = {
  [CONNECTION_STATE.CONNECTING]: 'Connecting',
  [CONNECTION_STATE.LIVE]: 'Live',
  [CONNECTION_STATE.DEGRADED]: 'Degraded',
  [CONNECTION_STATE.DISCONNECTED]: 'Disconnected',
}

const DOT_TOKEN: Record<ConnectionState, string> = {
  [CONNECTION_STATE.CONNECTING]: 'var(--color-status-degraded)',
  [CONNECTION_STATE.LIVE]: 'var(--color-status-online)',
  [CONNECTION_STATE.DEGRADED]: 'var(--color-status-degraded)',
  [CONNECTION_STATE.DISCONNECTED]: 'var(--color-status-offline)',
}

/**
 * Present on every screen (design.md 3.1, NFR1): a coordinator must never
 * have to ask whether what they see is current. Not the full connection
 * banner (C08) - that owns the disconnected/degraded explanatory copy
 * shown over the map itself.
 */
export default function ConnectionChip({ state }: { state: ConnectionState }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
      <span
        aria-hidden="true"
        className="size-2 rounded-full"
        style={{ backgroundColor: DOT_TOKEN[state] }}
      />
      {LABEL[state]}
    </span>
  )
}
