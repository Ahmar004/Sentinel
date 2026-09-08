import { RolesReference } from '@/components'

/**
 * design.md S17 - read-only, and the only operational-adjacent screen IT
 * can open.
 *
 * The table is rendered by `C11` from the same permission matrix the
 * navigation and the route guards derive from, so the reference cannot
 * drift from what is actually enforced. A roles page maintained by hand is
 * a roles page that eventually lies (decision D20).
 *
 * Nothing on this screen edits anything. Assigning a role to a person is
 * account management, which happens in `S13`, and IT cannot open it.
 */
export default function S17RolesReference() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Roles reference</h1>
        <p className="mt-1 text-sm text-ink-muted">
          What each role may do. Rendered from the same permission matrix the navigation and the route guards read, so
          this page cannot describe a permission the system does not enforce.
        </p>
      </header>

      <div className="p-4">
        <RolesReference />

        <section className="mt-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">What each role exists to do</h2>
          <p className="text-sm">
            <span className="font-medium">Coordinator.</span> Watches the live picture and decides what to do about it.
            Acknowledges alerts, and confirms or dismisses the ranked options the decision-support layer produces.
          </p>
          <p className="text-sm">
            <span className="font-medium">Administrator.</span> Configures the venue once per site: the plan, the grid,
            cell attributes, exits and their capacities, zones, thresholds and the fleet. Also manages accounts.
          </p>
          <p className="text-sm">
            <span className="font-medium">Drone operator.</span> Flies the fleet. Sees the whole live map, alert rail
            included, and may acknowledge an alert, because an operator who knows where an alert fired can reposition a
            drone toward it. Suggestions stay closed to the role: choosing a dispersion action is the coordinator's
            decision, not the pilot's.
          </p>
          <p className="text-sm">
            <span className="font-medium">IT.</span> Has no access to operational crowd data at all. The role exists for
            deployment, maintenance and the confidentiality, integrity and availability of the system, and the live
            crowd picture is not needed for any of that. Giving IT that picture would widen the exposure of crowd data
            for no operational reason (FR10.4).
          </p>
        </section>
      </div>
    </div>
  )
}
