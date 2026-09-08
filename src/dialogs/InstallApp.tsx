import { Dialog } from '@/components'

export interface InstallAppProps {
  open: boolean
  onInstall: () => void
  onDismiss: () => void
}

/**
 * design.md D13 - the install prompt.
 *
 * States what installing gives an on-ground coordinator, and states just
 * as plainly what it does not give: offline live data. The app shell is
 * cached so it opens instantly, but cell, zone and drone values are never
 * served from cache, because a held last frame presented as current is the
 * exact failure this system is built to avoid (NFR2, NFR6).
 */
export default function InstallApp({ open, onInstall, onDismiss }: InstallAppProps) {
  return (
    <Dialog
      open={open}
      title="Install Sentinel"
      description="Run it from the home screen rather than a browser tab."
      confirmLabel="Install"
      cancelLabel="Not now"
      onConfirm={onInstall}
      onCancel={onDismiss}
    >
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
        <li>Launches from the home screen, full screen, with no browser chrome taking vertical space.</li>
        <li>Receives alert notifications while the app is in the background or closed.</li>
        <li>Opens instantly, because the interface itself is cached on the device.</li>
      </ul>

      <p className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        Installing does not make live data available offline. The interface is cached; cell, zone and drone values never
        are. With no connection the map reads as unknown rather than showing the last frame it saw, because a held frame
        presented as current is exactly the mistake this system exists to prevent.
      </p>

      <p className="mt-2 text-xs text-ink-muted">Declining is remembered. This prompt will not return on its own.</p>
    </Dialog>
  )
}
