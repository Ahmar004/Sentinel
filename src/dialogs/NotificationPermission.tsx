import { useState } from 'react'
import { Dialog } from '@/components'

export interface NotificationPermissionProps {
  open: boolean
  muted: boolean
  onMutedChange: (muted: boolean) => void
  onClose: () => void
}

/**
 * design.md D04 - explain before asking (FR5.5).
 *
 * A browser permission prompt with no context is usually refused, and a
 * refused notification permission cannot be asked for again. So the
 * explanation comes first and the browser prompt only follows a deliberate
 * press.
 *
 * The audible tone toggle lives here too, because both answer the same
 * question - how does this reach me when I am not looking at the screen -
 * and splitting them across two surfaces would mean a coordinator finds
 * one and not the other.
 */
export default function NotificationPermission({
  open,
  muted,
  onMutedChange,
  onClose,
}: NotificationPermissionProps) {
  const [state, setState] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )

  const request = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setState(result)
  }

  return (
    <Dialog
      open={open}
      title="Alert notifications"
      description="How an alert reaches you when this screen is not in front of you."
      cancelLabel="Close"
      onCancel={onClose}
    >
      <p className="text-sm">
        Browser notifications carry elevated and critical alerts when Sentinel is in a background tab or the app is
        installed and closed. They carry the zone, the cell and the score, and open the alert when tapped.
      </p>

      <div className="mt-3 rounded border border-border bg-surface-sunken p-2 text-xs">
        <p>
          Notifications are in-app, browser push and an audible tone. There is no SMS and no email, because every
          gateway for those requires payment details, and this project takes no dependency that does.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">Browser permission</p>
        <p className="mt-1 text-xs text-ink-muted">
          Current state: {state === 'unsupported' ? 'not supported by this browser' : state}
        </p>
        {state === 'default' ? (
          <button
            type="button"
            onClick={() => void request()}
            className="mt-2 rounded bg-accent px-3 py-1.5 text-sm font-medium text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            Allow notifications
          </button>
        ) : state === 'denied' ? (
          <p className="mt-2 text-xs text-ink-muted">
            Notifications are blocked for this site. A browser will not ask again, so this has to be changed in the
            browser's own site settings. Alerts still appear on screen and still sound, unless muted below.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!muted}
            onChange={(event) => onMutedChange(!event.target.checked)}
            className="size-4"
          />
          Play an audible tone for elevated and critical alerts
        </label>
        <p className="mt-1 text-xs text-ink-muted">
          Normal and watch band cells never sound. The watch band exists to be seen, not heard.
        </p>
      </div>
    </Dialog>
  )
}
