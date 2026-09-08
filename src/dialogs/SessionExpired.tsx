import { Dialog } from '@/components'

export interface SessionExpiredProps {
  open: boolean
  onSignInAgain: () => void
}

/**
 * design.md D12 - the session ended.
 *
 * Not dismissable, and it has no cancel path, because everything behind it
 * is stale by definition. This is the honesty invariant applied to
 * authentication: a screen nobody is authenticated for must not keep
 * presenting values as current.
 *
 * The live subscription is closed before this opens, so no push update can
 * repaint the map underneath it while the person reads.
 */
export default function SessionExpired({ open, onSignInAgain }: SessionExpiredProps) {
  return (
    <Dialog
      open={open}
      title="Session ended"
      description="You are no longer signed in."
      confirmLabel="Sign in again"
      cancelLabel="Sign in again"
      onConfirm={onSignInAgain}
      onCancel={onSignInAgain}
    >
      <p className="text-sm">
        The screen behind this is no longer live. The feed has been disconnected, so nothing on it is updating and
        nothing on it should be acted on.
      </p>
      <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        Values from before a session ends are not kept on screen as though they were current. Signing in again
        reconnects the feed and returns you to where you were, if your role still permits it.
      </p>
    </Dialog>
  )
}
