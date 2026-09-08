Our FYP team members had a discussion, and we finalized that our system of front-end must have atleast these pages plus everything that spec (srs), design.md, understanding.md and @docs\Proposal-doc_Version_FINAL docx file demands. This file is just for inspiration and double checking that we deliver the expected pages, just make sure that these pages are delivered with respect to the spec (srs), design.md, understanding.md and @docs\Proposal-doc_Version_FINAL docx file, making them as the source of guidance and truth.

1. Login
A simple, centered authentication screen — email/username and password fields, a Sentinel logo/wordmark, and a subtle background treatment (perhaps a dimmed, static version of the site map) to establish visual identity before the coordinator ever sees live data. Role is determined server-side on login (coordinator vs. viewer) and drives what the rest of the app allows the user to do — viewers see everything but can't acknowledge alerts or edit configuration.

2. Main Dashboard
The default landing screen after login. A large central site map panel showing all configured zone polygons drawn over the venue layout, each shaded by its current aggregate risk level, with drone icons plotted at their live coordinates and colored/labeled by which zone (if any) they currently fall inside. A right-hand alert feed lists active alerts in priority order. A bottom strip shows quick per-zone risk summaries. This is the coordinator's primary situational-awareness screen and should read clearly at a glance — the panel's first real impression of the product.

3. Individual Drone View
A tabbed screen listing every registered drone (not zones), switchable via tabs or a sidebar list, each showing that specific drone's live feed with density/flow overlay, its live telemetry (position, altitude, heading, battery, signal), and — new in this structure — which zone it currently belongs to, updating live if the drone crosses a polygon boundary. This screen is explicitly drone-centric now, decoupled from any single zone, reflecting that a drone's zone membership is computed, not fixed.

4. Combined Feeds View
A grid layout showing multiple drone feeds simultaneously, each panel labeled with the drone's ID and its current zone assignment. Since zone membership can now change dynamically, this view should visually flag when a drone's assignment has just changed (a brief highlight or badge, e.g. "Just entered Zone: Gate N"), making the polygon-based reassignment concept visible without needing to explain it verbally.

5. Zone Management
A dedicated screen for defining and editing zones, separate from drone management per your decoupling decision. Built around an embedded map (Google Maps or similar), where an administrator draws a polygon directly over the venue layout to define a zone's boundary, names it, and sets its risk thresholds. Existing zones are listed alongside the map with edit/delete controls, and selecting one highlights its polygon on the map for editing.

6. Drone Management
A separate screen (split from Zone Management, per the decoupling) for registering and monitoring drones independently of any zone — add a new drone (triggering the connection flow, whether real simulated telemetry or a scripted agent), view its live status, and see its current position plotted on a small reference map without needing to assign it to a zone manually, since zone membership is derived automatically from its live coordinates against existing zone polygons.

7. Suggestions Screen
Lists the full lifecycle of AI-generated suggestions — zone, timestamp, the suggestion text (e.g., "Divert Gate N toward Gate W"), its current status (pending/acknowledged/dismissed), and, once enough time has passed, the tracked outcome (risk score before vs. after). This remains the clearest showcase of the decision-support agent layer and should stay visually distinct and prominent rather than folded into the alert feed.

8. Event History
A filterable, chronological log combining alerts, suggestions, and coordinator actions across all zones and drones — filterable by zone, drone, severity, and time range. Serves as the audit trail and is relatively cheap to build since it's largely a table view over the same underlying mock/event data used elsewhere.

9. System Health
An operational overview listing every drone's connection status, battery, signal strength, and last-updated timestamp, plus zone-level indicators showing whether each zone currently has active sensor coverage at all — directly surfacing your "unmonitored, not stale" design principle when a drone disconnects or drifts outside all defined zones.

10. Analytics / Reporting
A lower-priority but still worthwhile screen summarizing session-level statistics — alerts per zone, average coordinator response time, suggestion acknowledgement rate — with an export option. Lowest build priority of the ten, included for completeness rather than as a demo centerpiece.