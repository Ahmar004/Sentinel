# Sentinel - Software Requirements Specification

Version 1.0. Status: approved for Step-3 of `roadmap.md`.

***

## 1. Introduction

### 1.1 Purpose

This document specifies the complete Sentinel system: a multi-drone, real-time crowd monitoring and Stampede early-warning system covering perception, risk scoring, site-wide fusion, decision support, history, configuration and access control.

The repository that holds this document implements only the front-end, driven by mock data, for the FYP proposal defence. The specification is nevertheless written for the whole system, because the front-end is built against it. Every requirement here is expressed so that a backend can satisfy it later without the front-end changing: the mock data layer and the real API implement the same contract, defined in Section 3.

### 1.2 Scope

In scope, from the proposal Section 12.1: real-time density estimation and movement analysis from aerial footage; an early-signs risk model combining density and movement features; separate and combined display of two to four zones with uncovered areas shown explicitly as gaps; a decision-support agent producing ranked, explained dispersion suggestions; a full-stack dashboard covering live monitoring, alerting, suggestions, drone and zone configuration and event history; validation through simulation.

Out of scope, from the proposal Section 12.2, and binding on this specification: any physical crowd control, including barriers, signage and where people stand; deployment during Hajj; deployment on real drone hardware; general-purpose crowd management such as capacity planning, scheduling, entrance and exit design, ticketing or resource allocation; image or video stitching across feeds; zone coordination without GPS or communication; an unlimited number of zones; production-grade security hardening, penetration testing or compliance certification.

No requirement in this document may imply a capability listed as out of scope.

### 1.3 Document hierarchy

`docs/Proposal-doc_Version_FINAL.docx` is authoritative. Then `docs/understanding.md`, then this SRS (`srs.md` in the repository root), then `design.md`, then the wireframes, then code. Where two disagree, the higher one wins and the lower one is corrected in the same change.

Within the proposal, Section 14 (Tools and Technologies) beats Section 9 (Deliverables and Timeline) where they disagree on model choices. The shipped pipeline is DM-Count, Farneback and XGBoost. P2PNet, RAFT and LSTM are evaluation only and appear in no requirement here.

### 1.4 Definitions

Section 2.2 is the normative glossary. Every term it defines carries exactly that meaning throughout this document. Appendix A lists the enum identifiers the code must export from its constants module.

### 1.5 References

The proposal document and its reference list, Sections 15 and 16. `docs/understanding.md`. This SRS adds no external references of its own.

***

## 2. Overall Description

### 2.1 Product perspective

Sentinel is a strict four-tier pipeline. Each tier depends on the one before it, which is the interdependence the CCP statement rests on.

```
Tier 1  Perception     per drone, per frame
        density map, flow field, footprint projection
        emits a per-cell summary at 1 Hz, never video
                |
Tier 2  Risk           per cell, per sliding window
        window features, dwell gating, risk score, attribution
                |
Tier 3a Fusion         site-wide
        every worker writes the same georeferenced cell grid
        uncovered cells stay gaps
                |
Tier 3b Decision       on elevated risk
        rule-based ranker, safeguards, phrasing, human confirm
        outcome tracking after confirmation
```

Requirements FR8 (history), FR9 (configuration) and FR10 (access control) sit beside the pipeline rather than inside it. They have no model behind them and are specified to full depth.

### 2.2 Domain model

The single most important design decision in Sentinel is that every measurement is stored against a ground **cell** and a time, never against a drone. This is what allows drones to move: a drone flying to a new area simply writes to different cells, and two drones seeing the same cell write to the same record. Fusion is therefore a property of the data rather than an algorithm, and no image stitching is involved anywhere.

| Term | Meaning |
| - | - |
| Cell | A fixed square of ground in a site-wide grid. The unit every measurement is stored against. |
| Zone | A named group of cells, used for display, alerting and reporting. A presentation layer over the grid. |
| Cell store | The time-series record, one entry per cell per timestamp. The single source of truth both the risk engine and the dashboard read from. |
| Risk score | A normalised value from 0 to 1 expressing how close an area is to Stampede conditions. Computed per cell, aggregated per zone. |
| Coverage gap | An area with no recent observation from any drone. |
| Freshness | How long ago a cell was last updated, and whether that value is still trustworthy. |
| Dwell | The length of continuous time a drone has observed the same ground. |
| Dwell gating | A cell is scored only when its history covers the full sliding window; otherwise the answer is "not enough dwell", not a number. |
| Observe state | The drone is holding position. Density, flow, window features and risk are all produced. |
| Transit state | The drone is flying to a new area. Only density is written, because flow from a fast-moving camera is unreliable. |
| Footprint | The ground area a drone currently sees, found by projecting the image corners onto the ground from the drone pose. Purely geometric. |
| Wind-map overlay | Density shading and flow arrows drawn together, named after a weather wind map. |
| Flow convergence | Streams moving into the same space; strongly negative divergence of the flow field over a cell's 3x3 neighbourhood. A core precursor. |
| Counter-flow | Two dominant flow directions more than 90 degrees apart meeting at a boundary. |
| Stop-start pulses | Jerky, wave-like motion from being pushed while blocked. The third precursor. |
| Exit occupancy | Measured throughput through exit cells against the capacity set at venue setup. |

### 2.3 The honesty invariant

This rule is normative and the rest of the document is measured against it. Sentinel's credibility rests on never showing a number it cannot justify, because an unknown cell and a safe cell are not the same thing.

A cell carries two independent fields. `observationState` says whether the cell is known. `riskBand` exists only when it is.

| observationState | riskBand | densityPerSqM | flow | Meaning |
| - | - | - | - | - |
| `OBSERVED` | one of four bands | number | vector | Fresh observation, full window of dwell behind it. |
| `NOT_ENOUGH_DWELL` | `null` | number | vector or `null` | Being observed, but its history does not yet cover the full window. |
| `STALE` | `null` | last value, with age | `null` | Last observation is older than the latency budget. |
| `GAP` | `null` | `null` | `null` | No observation, or none inside the gap horizon. |

Three consequences follow, and each is restated as a requirement in Section 4:

1. A cell without a `riskBand` is never rendered as safe. Each of the three unknown states gets its own deliberate visual treatment, distinct from every risk band and from each other.
2. `STALE` retains its last density only when presented together with its age. It is never shown as a current value.
3. `GAP` is never interpolated, never extrapolated, never filled from a neighbour, and never shown as last-known-good.

Structuring the data this way makes the mistake unrepresentable rather than merely forbidden: there is no field combination that expresses an unknown cell carrying a risk score.

### 2.4 Roles and permissions

Four roles, matching the proposal's stakeholder table. Every role-dependent decision in the front-end derives from one session object, never from an ad hoc check inside a component.

| Capability | Coordinator | Administrator | Drone Operator | IT |
| - | - | - | - | - |
| View live site map and overlay | Yes | Yes | Yes | No |
| View alerts and attribution | Yes | Yes | Yes | No |
| Acknowledge an alert | Yes | Yes | Yes | No |
| View suggestions | Yes | Yes | No | No |
| Confirm or dismiss a suggestion | Yes | Yes | No | No |
| View history and replay | Yes | Yes | No | No |
| View reporting and analytics | Yes | Yes | No | No |
| View per-drone view and telemetry | Yes | Yes | Yes | No |
| Assign a drone to an area | No | Yes | Yes | No |
| Venue setup, grid, zones, exits | No | Yes | No | No |
| Edit thresholds | No | Yes | No | No |
| View the roles reference | No | Yes | No | Yes |
| Manage accounts and roles | No | Yes | No | No |
| View system health | No | Yes | Yes | Yes |
| View audit log | No | Yes | No | Yes |

The Drone Operator sees alerts and their attribution and may acknowledge one, because an operator who knows where an alert fired can reposition a drone toward it, which is the operator's actual job. Suggestions remain closed to the role: choosing a dispersion action is the coordinator's decision, not the person flying the aircraft.

IT deliberately has no access to operational crowd data. The IT role exists for deployment, maintenance and the confidentiality, integrity and availability of the system, and giving it the live crowd picture would widen the exposure of that data for no operational reason.

### 2.5 Operating environment

The dashboard is a React progressive web app, installable, with two first-class layouts. Mobile portrait at 390 x 844 is the device the coordinator and the drone operator carry on the ground under time pressure. Desktop at 1440 x 900 is where the administrator configures a venue and where the administrator and IT read the audit log and system health. Neither layout is derived from the other, and there is no tablet reference layout.

The application shell and static assets are cached for offline start. Live data is never served from cache. A client with no live connection shows a disconnected banner and presents the map as unknown rather than holding the last frame on screen as though it were current, which would violate Section 2.3.

### 2.6 Constraints

- No paid API and no paid cloud service anywhere, including map tiles. Leaflet renders an uploaded site-plan image, so there is no tile provider and no API key.
- Two to four zones. The interface must reflect this limit rather than offering unlimited zone creation.
- Advisory only. Sentinel suggests; it never actuates. Nothing in the system controls barriers, signage, gates, or where people stand.
- Coordinate fusion only. No stitched panoramic video across feeds.
- The live path carries small per-cell summaries, never video.

### 2.7 Fixed system parameters

Every number the system depends on, in one place, so nothing is defined twice. These are values this SRS fixes; the proposal states the concepts but not the numbers. Appendix C records why each was chosen.

| Parameter | Value | Notes |
| - | - | - |
| Cell size | 5 m by 5 m, 25 square metres | Fine enough to resolve a bottleneck, coarse enough for a meaningful density estimate. |
| Reference site extent | 300 m by 200 m | The demo venue. Not a system limit. |
| Grid | 60 columns by 40 rows, 2400 cells | Derived from the two rows above. |
| Cell identifier | `C-<col>-<row>`, zero padded to three digits | Example `C-042-017`. |
| Per-cell summary rate | 1 Hz per drone | From the proposal Section 13. |
| End-to-end latency budget | 2000 ms, capture to display | Also the freshness boundary. |
| Sliding window | 30 s, 30 samples | Governs window features and the dwell gate. |
| Lag features | t-5 s, t-10 s, t-20 s | Carry the time pattern, so no sequence model ships. |
| Dwell gate | 30 s of continuous observation | Equal to the window by definition. |
| Fresh | age below 2000 ms | Equal to the latency budget. |
| Stale | age from 2000 ms to 10 s | Presented only with its age. |
| Gap horizon | age above 10 s, or never observed | Reverts to grey. |
| Risk band NORMAL | 0.00 to below 0.40 | No action. |
| Risk band WATCH | 0.40 to below 0.70 | Visible, raises no alert. |
| Risk band ELEVATED | 0.70 to below 0.85 | Raises an alert, triggers suggestions. |
| Risk band CRITICAL | 0.85 to 1.00 | Raises an alert, escalated presentation. |
| Default alert threshold | 0.70 | Per zone, administrator-configurable under FR9. |
| Alert clear hysteresis | threshold minus 0.05, held for 30 s | Suppresses flapping around the boundary. |
| Zones | 2 to 4, demo uses 3 | Validated scope. |
| Drones | unbounded in the specification, demo uses 4 | Never tied to the zone count. |
| Ranked suggestions per alert | up to 3 | Includes options rejected by safeguards. |
| Outcome follow-up window | 10 minutes | Verdict threshold plus or minus 0.10 peak risk. |
| Cell history, full rate | most recent 1 hour at 1 Hz | Supports smooth replay of a recent incident. |
| Cell history, downsampled | 1 hour to 30 days, 1 sample per 10 s | Audit trail at a twentieth of the volume. |
| Audit records | 30 days, never downsampled | Alerts, suggestions, confirmations, outcomes, config changes. |

***

## 3. External Interface Requirements

Section 3 is simultaneously the backend's obligation and the front-end's mock target. The mock data layer implements these exact shapes, so replacing it with a live backend is a change of client implementation and base URL, not a rewrite of any view.

### 3.1 REST API

Versioned under `/api/v1`. All responses are JSON. All timestamps are ISO 8601 with milliseconds in UTC.

| Group | Method and path | Purpose | Roles |
| - | - | - | - |
| Auth | `POST /auth/login` | Exchange credentials for a token pair | all |
| Auth | `POST /auth/refresh` | Refresh an access token | all |
| Auth | `POST /auth/logout` | Invalidate the session | all |
| Auth | `GET /auth/me` | Current user, role and permissions | all |
| Setup | `GET /sites`, `GET /sites/{siteId}` | Site list and detail | all except IT |
| Setup | `POST /sites`, `PATCH /sites/{siteId}` | Create and edit a site | Administrator |
| Setup | `PUT /sites/{siteId}/plan` | Upload the site plan image and its ground extent | Administrator |
| Setup | `GET`, `PUT /sites/{siteId}/grid` | Cell size and origin; regenerates the cell set | Administrator |
| Setup | `GET`, `POST`, `PATCH`, `DELETE /sites/{siteId}/zones` | Zones as named cell groups, 2 to 4 | Administrator |
| Setup | `GET`, `PATCH /sites/{siteId}/cells/{cellId}/attributes` | Static attributes: walkable, exit, barrier, obstruction | Administrator |
| Setup | `GET /sites/{siteId}/setup/proposals` | Setup-pass proposals awaiting review | Administrator |
| Setup | `POST /sites/{siteId}/setup/proposals/{id}/accept`, `/reject` | Confirm or correct a proposal | Administrator |
| Setup | `GET`, `PUT /sites/{siteId}/exits` | Exit cells and their capacities | Administrator |
| Setup | `GET`, `PUT /sites/{siteId}/thresholds` | Per-zone risk and density thresholds | Administrator |
| Live | `GET /sites/{siteId}/state` | Full cell and zone snapshot for first paint | Coordinator, Administrator, Drone Operator |
| Live | `GET /sites/{siteId}/zones/{zoneId}/state` | One zone's current state | Coordinator, Administrator |
| Live | `GET /sites/{siteId}/zones/history` | Zone risk and coverage time series, `from`, `to`, `step`, optional `zoneId` | Coordinator, Administrator |
| Live | `GET /cells/{cellId}/history` | Time series for one cell, `from` and `to` | Coordinator, Administrator |
| Drones | `GET /sites/{siteId}/drones` | Fleet with state, footprint and link status | Coordinator, Administrator, Drone Operator |
| Drones | `GET /drones/{droneId}`, `/drones/{droneId}/telemetry` | One drone and its telemetry | Coordinator, Administrator, Drone Operator |
| Drones | `PATCH /drones/{droneId}/assignment` | Send a drone to a new area | Administrator, Drone Operator |
| Alerts | `GET /alerts` | Filter by site, zone, cell, band, status, actor, time range, free text | Coordinator, Administrator |
| Alerts | `GET /alerts/{alertId}` | One alert with its attribution | Coordinator, Administrator |
| Alerts | `POST /alerts/{alertId}/acknowledge` | Record acknowledgement | Coordinator, Administrator |
| Suggestions | `GET /alerts/{alertId}/suggestions` | Ranked options for an alert | Coordinator, Administrator |
| Suggestions | `GET /suggestions` | Filter across alerts by site, zone, status, action, phrasing source, actor and time range | Coordinator, Administrator |
| Suggestions | `GET /suggestions/{suggestionId}` | One option with safeguards and rationale | Coordinator, Administrator |
| Suggestions | `POST /suggestions/{suggestionId}/confirm`, `/dismiss` | Human decision | Coordinator, Administrator |
| Suggestions | `GET /suggestions/{suggestionId}/outcome` | Outcome verdict and trajectory | Coordinator, Administrator |
| History | `GET /history/events` | Unified searchable event stream | Coordinator, Administrator |
| History | `GET /sites/{siteId}/replay` | Frames for a period, `from`, `to`, `step` | Coordinator, Administrator |
| Analytics | `GET /sites/{siteId}/analytics` | Summary statistics for a time range (FR11) | Coordinator, Administrator |
| Health | `GET /health`, `/health/workers`, `/health/latency` | System health surfaces | Administrator, Drone Operator, IT |
| Accounts | `GET`, `POST`, `PATCH`, `DELETE /users` | Account management | Administrator |
| Accounts | `GET /roles` | Role definitions and capabilities | Administrator, IT |
| Accounts | `GET /audit-log` | Privileged action log | Administrator, IT |

### 3.2 WebSocket

One channel per site: `/ws/v1/sites/{siteId}/live/`. Server pushes; the client never polls.

Server to client message types:

| Type | Payload | Rate |
| - | - | - |
| `snapshot` | Full cell and zone state on connect | once per connection |
| `cell.batch` | Array of cell updates for one tick | 1 Hz |
| `zone.update` | Zone risk, coverage and member counts | 1 Hz |
| `drone.update` | Drone state, pose, footprint cells, link | 1 Hz |
| `alert.raised`, `alert.updated`, `alert.cleared` | Alert object | on event |
| `suggestion.created`, `suggestion.updated` | Suggestion option set | on event |
| `outcome.updated` | Outcome trajectory and verdict | on event |
| `health.update` | Worker, queue and latency health | every 5 s |

Client to server: `subscribe` with a channel list, `unsubscribe`, `ping`.

Cell updates are batched into one `cell.batch` per tick, not one message per cell. Roughly 400 cells are under observation at any moment, and emitting 400 frames per second would be an obvious engineering error.

### 3.3 Payload schemas

Field names and types are normative. The mock layer produces these; the backend must produce these.

**Cell update**, an element of `cell.batch`:

```json
{
  "cellId": "C-042-017",
  "ts": "2026-08-27T10:14:03.120Z",
  "observationState": "OBSERVED",
  "densityPerSqM": 3.42,
  "flow": { "dirDeg": 217, "speedMps": 0.61 },
  "risk": { "score": 0.68, "band": "WATCH" },
  "ageMs": 940,
  "dwellMs": 41200,
  "observedBy": ["drone-01"]
}
```

`risk` is `null` whenever `observationState` is not `OBSERVED`. `flow` is `null` while the observing drone is in transit. `densityPerSqM` is `null` for `GAP`.

**Zone update:**

```json
{
  "zoneId": "zone-b",
  "ts": "2026-08-27T10:14:03.120Z",
  "risk": { "score": 0.78, "band": "ELEVATED" },
  "coverage": { "observed": 96, "notEnoughDwell": 12, "stale": 4, "gap": 288, "total": 400 },
  "peakCellId": "C-031-022"
}
```

Zone risk is never sent without `coverage`. A zone that is mostly unseen must not read as a calm zone.

`GET /sites/{siteId}/zones/history` returns an array of these same objects ordered by `ts`, one series per zone. Risk and coverage therefore travel together through history exactly as they do live, which is what the coverage timeline on `S03` and the stacked coverage area on `S05` are drawn from.

**Drone update:**

```json
{
  "droneId": "drone-03",
  "ts": "2026-08-27T10:14:03.120Z",
  "state": "TRANSIT",
  "link": "ONLINE",
  "pose": { "lat": 21.4225, "lon": 39.8262, "altM": 62.0, "headingDeg": 148 },
  "footprintCells": ["C-030-018", "C-031-018"],
  "batteryPct": 71,
  "registration": { "referenceFrameLocked": true, "inliers": 214 }
}
```

**Alert:**

```json
{
  "alertId": "alert-0117",
  "raisedAt": "2026-08-27T10:14:03.120Z",
  "siteId": "site-01",
  "zoneId": "zone-b",
  "cellId": "C-031-022",
  "score": 0.78,
  "threshold": 0.70,
  "band": "ELEVATED",
  "status": "OPEN",
  "attribution": [
    { "feature": "flowConvergence",     "contribution":  0.19, "value": -0.42 },
    { "feature": "densityRateOfChange", "contribution":  0.14, "value":  0.31 },
    { "feature": "stopStartPulses",     "contribution":  0.09, "value":  0.22 },
    { "feature": "speedVariance",       "contribution": -0.03, "value":  0.08 }
  ],
  "acknowledgedBy": null,
  "acknowledgedAt": null
}
```

`attribution` is ordered by absolute contribution, descending, and is recorded at the moment the alert fired. It is never recomputed on read.

**Suggestion option:**

```json
{
  "suggestionId": "sug-0117-1",
  "alertId": "alert-0117",
  "rank": 1,
  "status": "PROPOSED",
  "action": "DIVERT",
  "targetExitId": "exit-e2",
  "routeCells": ["C-031-022", "C-032-021", "C-033-020"],
  "text": "Divert the crowd north-east from the bridge mouth toward Exit E2.",
  "textSource": "MODEL",
  "rationale": "Exit E2 is running at 41 percent of its 900 per minute capacity and the cells on the route are all below the density threshold.",
  "safeguards": [
    { "check": "OVER_THRESHOLD_CELL",        "passed": true },
    { "check": "WOULD_PUSH_NEIGHBOUR_OVER",  "passed": true },
    { "check": "STALE_CELL_ON_ROUTE",        "passed": true },
    { "check": "UNKNOWN_CELL_ON_ROUTE",      "passed": true },
    { "check": "EXIT_OVER_CAPACITY",         "passed": true }
  ],
  "confirmedBy": null,
  "confirmedAt": null,
  "dismissedBy": null,
  "dismissedAt": null
}
```

A rejected option carries `status: "REJECTED"`, at least one safeguard with `passed: false` and a `reason` on that safeguard. It is still returned, because showing that a route was rejected because a cell on it is stale demonstrates the safeguards far better than hiding it.

`dismissedBy` and `dismissedAt` mirror `confirmedBy` and `confirmedAt` because FR7.8 requires a dismissal to be audit-logged with its actor exactly as a confirmation is, and `S09` and `S18` both state who dismissed an option. Elements returned by `querySuggestions` additionally carry `outcomeVerdict`, which is the verdict of the option's outcome or `null` while its window is still open, so a list renders its verdict chips without one outcome request per row.

`textSource` is `MODEL` or `TEMPLATE`, so the interface can state which produced the wording. The interface labels this field the phrasing source, and `design.md` uses that term throughout.

**Outcome:**

```json
{
  "suggestionId": "sug-0117-1",
  "confirmedAt": "2026-08-27T10:15:40.000Z",
  "windowEndsAt": "2026-08-27T10:25:40.000Z",
  "affectedCells": ["C-031-022", "C-032-021", "C-033-020"],
  "riskAtConfirm": 0.78,
  "peakRiskInWindow": 0.61,
  "trajectory": [
    { "ts": "2026-08-27T10:15:40.000Z", "risk": 0.78 },
    { "ts": "2026-08-27T10:16:40.000Z", "risk": 0.74 }
  ],
  "verdict": "IMPROVED"
}
```

`verdict` is `PENDING` until the window closes.

**Analytics summary:**

```json
{
  "siteId": "site-01",
  "from": "2026-08-27T00:00:00.000Z",
  "to": "2026-08-27T23:59:59.999Z",
  "alertsByZone": [
    { "zoneId": "zone-a", "count": 0, "observedShareOfRange": 0.94 },
    { "zoneId": "zone-b", "count": 3, "observedShareOfRange": 0.71 },
    { "zoneId": "zone-c", "count": null, "observedShareOfRange": 0.00 }
  ],
  "responseTime": { "raised": 4, "acknowledged": 3, "medianMs": 13000, "p95Ms": 41000 },
  "acknowledgementRate": { "issued": 7, "confirmed": 3, "dismissed": 2, "expired": 2 },
  "verdicts": { "IMPROVED": 2, "UNCHANGED": 1, "WORSENED": 0, "PENDING": 0 }
}
```

`responseTime` is `null` only when no alert was raised in the range. When alerts were raised but none acknowledged it carries its `raised` count with `acknowledged` at zero and both percentiles `null`, because an alert nobody answered is a finding about the coordinator and an alert that never fired is not. `acknowledgementRate` is `null` when no suggestion was issued. A count of zero and an absence of data are different facts, and FR11.3 requires the interface to tell them apart. `alertsByZone` lists every zone in the site, and each entry carries `observedShareOfRange`, the fraction of the range during which the zone had any observed cell. A `count` of zero is a measured result only when that share is above zero; a zone nothing watched carries a `count` of `null`, as `zone-c` does above. Without the share, a zone that raised no alert because it was never observed would read exactly like one that raised none because it was calm, which is the coverage gap presented as a calm cell that Section 2.3 exists to prevent. `verdicts` is `null` when no suggestion in the range was confirmed, and its counts otherwise cover confirmed suggestions only, so a zero against `WORSENED` means that no confirmed suggestion worsened the cells it affected, not that nothing was confirmed.

### 3.4 Error model

One envelope for every failure:

```json
{
  "error": {
    "code": "ZONE_LIMIT_REACHED",
    "message": "A site supports between two and four zones.",
    "field": "zones",
    "requestId": "req-8f21c0"
  }
}
```

A failed request never leaves a previously fetched value on screen presenting as live. The affected surface shows its error state, and any cell whose age has passed the gap horizon while the connection was down becomes `GAP`, not a retained value.

### 3.5 The SentinelClient contract

Both the mock and the real implementation satisfy one interface. Views and hooks consume the interface only, never a fixture and never a raw fetch.

```ts
interface SentinelClient {
  // request and response, mirroring Section 3.1
  login(credentials: Credentials): Promise<Session>
  getSiteState(siteId: string): Promise<SiteState>
  getCellHistory(cellId: string, range: TimeRange): Promise<CellSample[]>
  getZoneHistory(siteId: string, range: TimeRange, stepMs?: number): Promise<ZoneSample[]>
  getDrones(siteId: string): Promise<Drone[]>
  assignDrone(droneId: string, target: AreaTarget): Promise<Drone>
  queryAlerts(query: AlertQuery): Promise<Page<Alert>>
  acknowledgeAlert(alertId: string): Promise<Alert>
  getSuggestions(alertId: string): Promise<SuggestionOption[]>
  confirmSuggestion(suggestionId: string): Promise<SuggestionOption>
  dismissSuggestion(suggestionId: string): Promise<SuggestionOption>
  getOutcome(suggestionId: string): Promise<Outcome>
  querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionOption>>
  queryHistory(query: HistoryQuery): Promise<Page<HistoryEvent>>
  getReplayFrames(siteId: string, range: TimeRange, stepMs: number): Promise<ReplayFrame[]>
  getHealth(): Promise<SystemHealth>
  getAnalytics(siteId: string, range: TimeRange): Promise<AnalyticsSummary>
  // configuration, FR9
  putSitePlan(siteId: string, plan: SitePlanInput): Promise<Site>
  putGrid(siteId: string, grid: GridConfig): Promise<Grid>
  getSetupProposals(siteId: string): Promise<SetupProposal[]>
  resolveSetupProposal(id: string, decision: ProposalDecision): Promise<SetupProposal>
  patchCellAttributes(siteId: string, cellId: string, attrs: CellAttributes): Promise<Cell>
  putExits(siteId: string, exits: ExitInput[]): Promise<Exit[]>
  saveZone(siteId: string, zone: ZoneInput): Promise<Zone>
  deleteZone(siteId: string, zoneId: string): Promise<void>
  putThresholds(siteId: string, thresholds: ThresholdSet): Promise<ThresholdSet>
  // accounts and audit, FR10
  getUsers(): Promise<User[]>
  saveUser(user: UserInput): Promise<User>
  deactivateUser(userId: string): Promise<User>
  getRoles(): Promise<RoleDefinition[]>
  queryAuditLog(query: AuditQuery): Promise<Page<AuditEntry>>
  // push, mirroring Section 3.2
  subscribe(channel: LiveChannel, handler: (msg: LiveMessage) => void): Unsubscribe
  connectionState(): ConnectionState
}
```

This interface is complete rather than illustrative: every screen and dialog in `design.md` is served by a method listed here, and a surface needing data this contract does not expose is a defect in one of the two documents.

`MockSentinelClient` is backed by a deterministic simulator ticking at 1 Hz. `HttpSentinelClient` wraps `fetch` and a `WebSocket`. One provider at the application root selects which is in use. No component knows which it received.

***

## 4. System Features

FR1 to FR10 are reproduced verbatim from the proposal Section 6 and are not restated, reworded or extended. Their children make explicit what each parent already implies, and each child carries an acceptance criterion so that Step-4's mapping check and Step-7's testing are mechanical.

### FR1 - Estimate crowd density per frame, producing a density map (Tier 1)

Owner: Tier 1. Visible to: Coordinator, Administrator, Drone Operator.

**FR1.1** Per processed frame, the perception worker shall produce a density map whose values sum to the estimated number of people in the frame.
*Acceptance:* on a labelled frame containing N annotated heads, the summed density map falls within the model's validated mean absolute error of N.

**FR1.2** The worker shall convert the per-frame density map into people per square metre per ground cell, using the footprint projection, and shall emit values only for cells inside the footprint.
*Acceptance:* for a footprint covering 96 cells, the emitted summary carries 96 values of `densityPerSqM` and no value for any cell outside the footprint.

**FR1.3** Per-cell density shall be smoothed by a short exponential moving average before feature extraction.
*Acceptance:* a single-frame doubling of density in one cell moves the smoothed series by no more than the configured EMA weight.

**FR1.4** The live path shall carry per-cell summaries only. No imagery or video is transmitted on it.
*Acceptance:* a `cell.batch` payload for one tick contains only scalar and vector fields, and no image data of any kind.

**FR1.5** The interface shall present an estimated people count for an area as the sum of `densityPerSqM` multiplied by the cell area across that area's observed cells only, labelled as an estimate over observed cells.
*Acceptance:* a zone with 96 of its 400 cells observed displays a people count derived from those 96 cells together with the observed count, and never a figure presented as covering the whole zone.

Tier 1 produces the sum FR1.1 defines; this requirement is where a reader actually sees it. Restricting the count to observed cells keeps it inside the honesty invariant of Section 2.3, because a count that silently spanned unobserved cells would be the interpolation FR6.4 forbids, expressed as a number instead of a colour.

### FR2 - Compute movement direction and speed vectors per region (Tier 1)

Owner: Tier 1. Visible to: Coordinator, Administrator, Drone Operator.

**FR2.1** Each frame shall be registered against a saved reference frame before flow is computed, so that drone drift is never counted as crowd movement.
*Acceptance:* with a static scene and a drifting camera, emitted per-cell `speedMps` stays below the configured noise floor.

**FR2.2** Dense optical flow shall be reduced to one mean flow vector per covered cell, expressed in the ground frame as a direction in degrees and a speed in metres per second.
*Acceptance:* every observed cell's `flow` carries `dirDeg` in 0 to 359 and `speedMps` at or above zero, and two drones at different altitudes observing the same cell report comparable values.

**FR2.3** Flow shall be produced only while the observing drone is in the observe state.
*Acceptance:* while a drone is in transit, every cell in its footprint carries a density value and `flow` of `null`.

**FR2.4** The ground-frame flow field shall be available to Tier 2 for neighbourhood operations.
*Acceptance:* convergence for a cell is computed from the ground-frame vectors of its eight neighbours.

### FR3 - Display density and movement as a wind-map overlay within a defined latency (Tier 1)

Owner: Tier 1 and the dashboard. Visible to: Coordinator, Administrator, Drone Operator.

**FR3.1** The dashboard shall render density shading and flow arrows together as one wind-map overlay on the site plan.
*Acceptance:* for an observed cell, shading reflects `densityPerSqM` and an arrow points along `flow.dirDeg` with length scaled to `flow.speedMps`.

**FR3.2** End-to-end latency from capture to display shall not exceed 2000 ms.
*Acceptance:* measured 95th percentile latency over a five minute run is at or below 2000 ms.

**FR3.3** The interface shall display measured end-to-end latency and per-cell age rather than concealing them.
*Acceptance:* the latency indicator is visible on the live view without opening a panel, and a cell's age is readable on selection.

**FR3.4** A cell whose age exceeds the latency budget shall be presented as stale, together with its age.
*Acceptance:* a cell last updated 4 s ago renders in the stale treatment and shows "4 s old"; it never renders in a risk band.

**FR3.5** Where flow is `null`, no arrow shall be drawn. A zero-length or default-direction arrow is not permitted.
*Acceptance:* cells covered by a transiting drone show shading and no arrow.

### FR4 - Compute per-zone risk score on a sliding window (Tier 2)

Owner: Tier 2. Visible to: Coordinator, Administrator.

**FR4.1** Window features shall be computed per cell over a 30 s window: density, spatial density gradient, rate of change, flow convergence, counter-flow, mean speed, speed variance, stop-start pulses and exit occupancy, together with lag features at 5 s, 10 s and 20 s.
*Acceptance:* a feature vector for one cell contains every named feature, and the lag entries reference samples at the stated offsets.

**FR4.2** A cell shall be scored only when its history covers the full 30 s window of continuous observation. Otherwise it shall report not enough dwell and no score.
*Acceptance:* a cell first observed 12 s ago carries `observationState` of `NOT_ENOUGH_DWELL`, `risk` of `null`, and a density value.

**FR4.3** The risk classifier shall produce a normalised score from 0 to 1 per gated cell per tick.
*Acceptance:* every observed cell in a `cell.batch` carries `risk.score` within 0 to 1 inclusive.

**FR4.4** Each score shall be assigned a band using the boundaries in Section 2.7.
*Acceptance:* a score of 0.70 is `ELEVATED` and a score of 0.699 is `WATCH`.

**FR4.5** Zone risk shall be the maximum score across the zone's observed cells, and the zone shall report which cell that was.
*Acceptance:* a zone containing cells at 0.31, 0.55 and 0.78 reports 0.78 and names the cell holding it.

Maximum rather than mean, because a zone is only as safe as its worst cell, and averaging a single dangerous cell against a hundred calm ones is exactly how a real warning gets hidden.

**FR4.6** Zone risk shall never be presented without zone coverage: the counts of observed, not-enough-dwell, stale and gap cells within it.
*Acceptance:* a zone with 96 of 400 cells observed displays both its risk and that coverage; no surface shows the zone risk alone.

This follows directly from Section 2.3. A zone reading as calm while three quarters of it is unseen would be the same failure as an interpolated cell, one level up.

### FR5 - Flag elevated-risk zones at threshold; log the triggering features (Tier 2)

Owner: Tier 2. Visible to: Coordinator, Administrator.

**FR5.1** An alert shall be raised when a cell's risk score crosses its zone's configured threshold in the upward direction.
*Acceptance:* given a cell whose risk rises from 0.55 to 0.78 with the zone threshold at 0.70, exactly one alert is created, carrying the cell id, zone id, score, threshold and timestamp.

**FR5.2** Each alert shall persist ranked feature attribution: the contributing features with signed contributions, ordered by absolute contribution.
*Acceptance:* the stored alert's `attribution` array is non-empty and ordered descending by absolute contribution.

**FR5.3** Attribution shall be presented on the alert surface itself, not only inside a detail view.
*Acceptance:* the three highest-contributing features are readable in the alert list item with no navigation.

This is what lets a coordinator judge an alert in seconds, which is the interface's answer to the conflict the CCP statement names between missed warnings and eroded trust.

**FR5.4** An alert shall clear only when its cell's risk falls below the threshold minus 0.05 and stays below for 30 s.
*Acceptance:* a score oscillating repeatedly across 0.70 produces one alert, not a series of them.

**FR5.5** Alerts shall be delivered in-app always, by browser push notification when the client is backgrounded and the user has opted in, and with an audible tone for elevated and critical bands.
*Acceptance:* with the installed app backgrounded and notification permission granted, an elevated alert produces a system notification carrying the zone and the top contributing feature.

SMS, email and radio are excluded. Every gateway for them requires payment details, which the proposal's rule against paid services forbids.

**FR5.6** Each alert shall carry a status of open, acknowledged or cleared, and shall record who acknowledged it and when.
*Acceptance:* acknowledging an alert stores the actor and timestamp and writes an audit entry.

### FR6 - Fuse all zones onto a shared coordinate map; mark uncovered areas as gaps (Tier 3a)

Owner: Tier 3a. Visible to: Coordinator, Administrator, Drone Operator.

**FR6.1** All perception workers shall write into the same georeferenced cell grid. Two drones observing the same cell write to the same record.
*Acceptance:* with two overlapping footprints, the cell store holds one entry per cell per tick, and `observedBy` names both drones.

**FR6.2** The site view shall present all zones on one shared coordinate map with the grid, zone boundaries and drone footprints drawn in the same frame.
*Acceptance:* three zones and four footprints render on one site plan with no separate coordinate systems.

**FR6.3** A cell with no observation newer than the gap horizon shall be presented as a gap, carrying no density, no flow and no risk.
*Acceptance:* after a drone leaves an area, every cell it vacated reads as a gap within 10 s, shows no numeric value on any surface, and is visually distinct from every risk band and from the stale treatment.

**FR6.4** The system shall not interpolate, extrapolate or forward-fill any cell value.
*Acceptance:* no code path produces a cell value that was not written by a perception worker for that specific cell.

**FR6.5** A site shall hold between two and four zones, and the interface shall not offer creation beyond that limit.
*Acceptance:* with four zones configured, the add-zone control is disabled and states the validated limit; the API returns `ZONE_LIMIT_REACHED`.

### FR7 - Generate ranked, explained suggestions via the decision-support agent on elevated risk (Tier 3b)

Owner: Tier 3b. Visible to: Coordinator, Administrator.

**FR7.1** When an alert reaches the elevated band, the ranker shall produce up to three ranked dispersion options.
*Acceptance:* an elevated alert yields between zero and three options, each with a distinct rank starting at 1.

**FR7.2** Ranking shall use the density and flow of the cells around the risky cell, the walkable-neighbour adjacency graph, and the exit capacities set at venue setup.
*Acceptance:* an option's rationale names the exit and its measured occupancy against the configured capacity.

**FR7.3** Safeguards shall reject an option if its route passes through a cell above the density threshold, if it would push a neighbouring cell over that cell's own threshold, or if any cell on the route is stale. Cells with no recent data count as unknown and are never proposed as safe.
*Acceptance:* a route containing one stale cell is returned with status rejected and the `STALE_CELL_ON_ROUTE` safeguard failing with a reason naming the cell.

**FR7.4** Rejected options shall be shown with the failing safeguard named, not hidden.
*Acceptance:* the suggestion surface lists rejected options with their rejection reason in plain language.

**FR7.5** If every candidate is rejected, the system shall state that no safe option was found and shall emit no option.
*Acceptance:* with all candidates rejected, the surface shows an explicit statement and no confirmable action.

The system inventing an option because it feels obliged to offer one is the failure mode this requirement exists to prevent.

**FR7.6** A local model shall phrase the ranked options and shall decide nothing. Every suggestion shall also have a plain-text template version, and the interface shall state which was used.
*Acceptance:* with the model disabled, every suggestion renders complete template text with `textSource` of `TEMPLATE`, and the full test suite passes.

**FR7.7** No suggestion shall take effect without explicit confirmation by a Coordinator or Administrator, and confirmation shall cause no outward actuation of any kind.
*Acceptance:* confirming records the actor, timestamp and option id, and triggers no control of barriers, signage, gates or any external system.

**FR7.8** Confirmation and dismissal shall be written to the audit log.
*Acceptance:* both actions produce an audit entry naming the actor, action, suggestion, alert and timestamp.

### FR8 - Persistent, searchable event, alert and suggestion history

Owner: application layer, no model behind it. Visible to: Coordinator, Administrator.

**FR8.1** Cell samples, alerts, suggestions, confirmations, dismissals and outcomes shall be persisted.
*Acceptance:* every object created during a run is retrievable after a restart.

**FR8.2** Retention shall follow Section 2.7: full rate for one hour, one sample per 10 s to 30 days, with audit records never downsampled.
*Acceptance:* a cell sample 90 minutes old is retrievable at 10 s resolution; an alert 29 days old is retrievable in full.

**FR8.3** History shall be searchable and filterable by time range, zone, cell, risk band, alert status, suggestion status, actor and free text.
*Acceptance:* each filter narrows results independently and filters combine.

**FR8.4** Any retained period shall be replayable over the map with play, pause, speed control and a scrub bar.
*Acceptance:* selecting a past ten minute period replays cell states, alerts and drone footprints over the site plan.

**FR8.5** Replay shall state its sample resolution and shall not smooth downsampled data to appear full rate.
*Acceptance:* replaying a period older than one hour shows a 0.1 Hz resolution indicator and steps in 10 s increments.

**FR8.6** For each confirmed suggestion, the risk trajectory of the affected cells shall be recorded across a 10 minute follow-up window and a verdict derived: improved if peak risk fell by at least 0.10, worsened if it rose by at least 0.10, otherwise unchanged.
*Acceptance:* a confirmed suggestion shows a pending verdict during the window and a settled verdict with its trajectory afterwards.

**FR8.7** An alert viewed in history shall show the attribution recorded at the time it fired, never a recomputed one.
*Acceptance:* the attribution rendered in history is byte-identical to the attribution stored with the alert.

### FR9 - Admin configuration of zones, drone and camera assignment, and thresholds, with no code changes

Owner: application layer, no model behind it. Visible to: Administrator, plus drone assignment for the Drone Operator.

**FR9.1** An administrator shall upload a site plan image and set its ground extent and scale.
*Acceptance:* after upload, a known distance on the plan measures correctly in metres on the map.

**FR9.2** An administrator shall define the grid by cell size and origin, producing the cell set.
*Acceptance:* a 5 m cell size over a 300 m by 200 m extent produces 2400 cells with identifiers in the `C-<col>-<row>` form.

**FR9.3** Setup-pass proposals for exits, barriers and obstructions shall be presented for review.
*Acceptance:* proposals render on the grid, each individually selectable, with its proposed attribute named.

**FR9.4** An administrator shall confirm, correct, add or remove any static cell attribute, and manual annotation shall work with no proposals present at all.
*Acceptance:* with the proposal list empty, an administrator can still mark any cell as exit, barrier, obstruction or non-walkable and save.

Manual annotation is the guaranteed path; the setup pass only pre-fills it. The system must be fully configurable without it.

**FR9.5** Each exit shall carry a capacity in people per minute.
*Acceptance:* the stored exit holds a positive capacity, and exit occupancy is computed against it.

**FR9.6** An administrator shall define between two and four zones as named groups of cells.
*Acceptance:* a zone is created by selecting cells, is given a name, and every cell belongs to at most one zone.

**FR9.7** Per-zone risk and density thresholds shall be editable through the interface with no code change or restart.
*Acceptance:* changing a zone threshold from 0.70 to 0.65 takes effect on the next tick and is reflected in subsequent alerts.

**FR9.8** Drones shall be registered and assigned to an area. A drone shall not be bound to a zone.
*Acceptance:* a drone can be assigned to an area spanning two zones, and reassigned without any zone changing.

**FR9.9** Every configuration change shall be versioned and audit-logged with actor and timestamp.
*Acceptance:* the audit log shows the previous and new value for each changed field.

### FR10 - User authentication and role-based access control

Owner: application layer, no model behind it. Visible to: all roles, differently.

**FR10.1** Users shall authenticate with a username and password and receive a session with refresh.
*Acceptance:* valid credentials return a session; invalid credentials return an error that does not disclose which field was wrong.

**FR10.2** The system shall support exactly four roles: coordinator, administrator, drone operator and IT.
*Acceptance:* `GET /roles` returns those four and no others.

**FR10.3** Permissions shall be enforced on the server, and the interface shall not render navigation to a screen the current role cannot access.
*Acceptance:* a coordinator sees no venue setup navigation, and a direct request to a setup endpoint is refused.

**FR10.4** The IT role shall have no access to operational crowd data.
*Acceptance:* an IT session receives an error from every live state, alert, suggestion, history and analytics endpoint, and its navigation contains only the health, roles reference and audit surfaces.

**FR10.5** Administrators shall create, edit, deactivate and assign roles to accounts.
*Acceptance:* a deactivated account cannot authenticate, and its historical audit entries remain intact.

**FR10.6** Authentication events and every privileged action shall be audit-logged, viewable by administrator and IT.
*Acceptance:* login, logout, failed login, role change, threshold change, drone assignment, alert acknowledgement, and suggestion confirmation and dismissal all appear in the log.

### FR11 - Reporting and analytics over recorded events

Owner: application layer, no model behind it. Visible to: coordinator and administrator.

This requirement is new in Step-6 and is not derived from the proposal. It was added because the team's `required-pages.md` asks for a reporting surface that neither this document nor `design.md` provided. Appendix C decision D23 records that reasoning, so the addition reads as a decision rather than as scope that appeared unannounced.

**FR11.1** The system shall summarise a selected time range, reporting alerts per zone, coordinator response time from alert raised to acknowledged, suggestion acknowledgement rate, and the distribution of outcome verdicts.
*Acceptance:* a range containing the closed incident `SG-0771` reports one confirmed suggestion and one verdict of improved.

**FR11.2** The system shall export the current summary as a file generated in the browser.
*Acceptance:* the export completes with no request to any server, and its figures match those on screen for the same range.

**FR11.3** Every figure shall be computed from recorded events only. A range holding no events of a kind shall report no data for that kind, never zero.
*Acceptance:* a range containing no issued suggestions reports no acknowledgement rate, and does not report 0 percent.

FR11.3 is the honesty invariant of Section 2.3 applied to reporting. An acknowledgement rate of 0 percent means every suggestion was ignored, which is a finding about the coordinator. No data means none was issued, which is a finding about the crowd. A report that renders the second as the first misleads exactly as badly as a map that renders a coverage gap as a calm cell.

***

## 5. Data Model

Entities, sized so the mock layer and a future ORM describe the same thing.

| Entity | Key fields | Relationships |
| - | - | - |
| `Site` | id, name, planImageUrl, groundExtentM, createdAt | has one Grid, 2 to 4 Zones, many Drones |
| `Grid` | siteId, cellSizeM, originLatLon, cols, rows | has many Cells |
| `Cell` | cellId, gridId, col, row, centreLatLon, walkable, isExit, isBarrier, isObstruction | belongs to at most one Zone |
| `CellSample` | cellId, ts, observationState, densityPerSqM, flowDirDeg, flowSpeedMps, riskScore, riskBand, dwellMs, observedBy | the cell store; the single source of truth |
| `Zone` | zoneId, siteId, name, cellIds, riskThreshold, densityThreshold | groups Cells |
| `ZoneSample` | zoneId, ts, riskScore, riskBand, coverage counts, peakCellId | derived from CellSample |
| `Drone` | droneId, siteId, label, state, link, assignedAreaId | writes CellSamples |
| `Area` | areaId, siteId, label, cellIds | a drone's assignment target; spans zones freely and never becomes a zone |
| `DroneTelemetry` | droneId, ts, pose, footprintCells, batteryPct, registrationStatus | |
| `Exit` | exitId, siteId, cellIds, capacityPerMin, label | referenced by SuggestionOption |
| `ThresholdSet` | siteId, zoneId, riskThreshold, densityThreshold, version, changedBy, changedAt | versioned under FR9.9 |
| `Alert` | alertId, siteId, zoneId, cellId, raisedAt, score, threshold, band, status, acknowledgedBy, acknowledgedAt | has many FeatureAttributions and SuggestionOptions |
| `FeatureAttribution` | alertId, feature, contribution, value, rank | recorded once, never recomputed |
| `SuggestionOption` | suggestionId, alertId, rank, status, action, targetExitId, routeCells, text, textSource, rationale | has many SafeguardChecks, may have one Outcome |
| `SafeguardCheck` | suggestionId, check, passed, reason | stored for rejected options too |
| `Outcome` | suggestionId, confirmedAt, windowEndsAt, affectedCells, riskAtConfirm, peakRiskInWindow, trajectory, verdict | |
| `SetupProposal` | proposalId, siteId, cellIds, proposedAttribute, confidence, status | reviewed under FR9.3 |
| `User` | userId, username, passwordHash, role, active, createdAt, lastLoginAt | |
| `Role` | role, capabilities | the matrix in Section 2.4 |
| `AuditEntry` | entryId, ts, actorId, action, targetType, targetId, previousValue, newValue | never downsampled |

Two properties carry weight beyond their field lists. `CellSample` is the single source of truth that both the risk engine and the dashboard read from, which is what makes fusion a property of the data. `SafeguardCheck` is stored per option including for rejected ones, because the rejection reason is a requirement of the interface under FR7.4, not a log line.

***

## 6. Non-Functional Requirements

**NFR1 Latency.** End-to-end capture to display shall not exceed 2000 ms at the 95th percentile. Measured latency is surfaced in the interface rather than hidden, and a cell whose age passes the budget is downgraded to stale.

**NFR2 Responsive and installable.** The dashboard is an installable progressive web app with two first-class layouts, mobile portrait at 390 x 844 and desktop at 1440 x 900, each designed rather than reflowed from the other. The application shell is cached; live data is never served from cache.

**NFR3 Operator usability.** A coordinator shall be able to read an alert's reason and act on the top-ranked suggestion within 10 seconds of it appearing. Suggestion and alert text shall be readable and actionable by a non-technical operator.

**NFR4 Auditability.** Every alert, suggestion, confirmation, dismissal, outcome and configuration change shall be reconstructable for 30 days, including who acted and when.

**NFR5 Accessibility.** Every observation state and every risk band shall be distinguishable without relying on hue alone, using fill pattern and an explicit label in addition to colour. Contrast meets WCAG 2.1 AA. Interaction is designed keyboard-first, then touch, then mouse; in every form and dialog Enter submits and Esc cancels.

The accessibility requirement follows from Section 2.3 rather than from convention. If a colour-blind operator cannot tell a gap from a normal cell, the system is misrepresenting itself to that operator exactly as badly as if it had interpolated the value.

**NFR6 Graceful degradation.** Defined behaviour is required for four failures: lost WebSocket (disconnected banner, map presented as unknown, no retained frame shown as current); lost drone (its footprint cells age into gaps normally); lost risk engine (cells continue to show density and flow, risk reads as unavailable, and no alert is raised); language model unavailable (template phrasing, indicated as such).

**NFR7 Security.** Passwords are hashed, permission checks are enforced on the server, and transport is HTTPS and WSS. The system upholds confidentiality, integrity and availability at the level appropriate to a proof of concept. Production-grade hardening, penetration testing and compliance certification are out of scope per the proposal Section 12.2.

**NFR8 Licensing and cost.** Every dependency shall be open source, openly licensed, or a free tier requiring no payment details. No map tile provider and no API key. This applies to deployment as well as development.

**NFR9 Model accuracy.** Numeric targets for density mean absolute error and for risk precision and recall are locked at Eval 1 and Eval 2 respectively, per the proposal Section 9. This SRS records that they are set there and deliberately does not invent values for them.

**NFR10 Capacity.** The system shall sustain 2400 cells, 4 drones and roughly 400 observed cells per tick at 1 Hz without dropped frames on the mobile reference device, a mid-range Android phone at 390 x 844. Mobile is the capacity reference because it is the weakest hardware and the coordinator's actual device, so a target met there is met on desktop as well.

***

## 7. Traceability Matrix

The screens column is filled from `design.md`, which is what makes Step-4's verification mechanical rather than a judgement call. Leaf-level mapping for all sixty-four requirements is in `design.md` Section 12.

| Proposal FR | SRS leaf requirements | Tier | Primary roles | design.md screens |
| - | - | - | - | - |
| FR1 | FR1.1 to FR1.5 | 1 | Coordinator, Drone Operator | `S02` live map and zone strip count, `S03` zone count, `S06` combined feeds, `S07` per-drone and footprint count, `D01` cell inspector |
| FR2 | FR2.1 to FR2.4 | 1 | Coordinator, Drone Operator | `S02` flow arrows, `S07` transit banner and registration, `D01`, `S04` |
| FR3 | FR3.1 to FR3.5 | 1 | Coordinator, Drone Operator | `S02`, `S07`, `S10` replay, top bar latency, `S15` Latency tab, `C07` legend |
| FR4 | FR4.1 to FR4.6 | 2 | Coordinator, Administrator | `S02` zone strip, `S03` zone detail, `S05` timeline, `S07` dwell panel, `D01` |
| FR5 | FR5.1 to FR5.6 | 2 | Coordinator, Administrator, Drone Operator | `S02` alert rail, `S04` alert detail, `S08` history, `D04`, `D05` toast |
| FR6 | FR6.1 to FR6.5 | 3a | Coordinator, Administrator | `S02`, `S06` combined feeds, `S11` step 6, `S12` Zones tab, `D01`, `C02` |
| FR7 | FR7.1 to FR7.8 | 3b | Coordinator, Administrator | `C05` in `S02` rail and `S04`, `D02` confirm, `D03` dismiss, `S15` Services |
| FR8 | FR8.1 to FR8.7 | none | Coordinator, Administrator | `S08` history, `S09` event detail and outcome, `S10` replay, `C09` |
| FR9 | FR9.1 to FR9.9 | none | Administrator, Drone Operator | `S11` setup wizard, `S12` configuration tabs, `S06`, `S14`, `D06`, `D07`, `D11` |
| FR10 | FR10.1 to FR10.6 | none | all | `S01` login, nav rail, `S13` accounts, `S14` audit log, `S16`, `S17` roles reference, `D08`, `D09`, `D12` |
| FR11 | FR11.1 to FR11.3 | none | Coordinator, Administrator | `S19` analytics |

Sixty-four leaf requirements in total.

***

## Appendix A - Normative glossary and constants

The glossary is Section 2.2 and is normative. The identifiers below are the exact values the constants module must export. No domain enum literal may be hardcoded in a component.

```
OBSERVATION_STATE   OBSERVED | NOT_ENOUGH_DWELL | STALE | GAP
RISK_BAND           NORMAL | WATCH | ELEVATED | CRITICAL
DRONE_STATE         OBSERVE | TRANSIT
DRONE_LINK          ONLINE | DEGRADED | OFFLINE
ALERT_STATUS        OPEN | ACKNOWLEDGED | CLEARED
SUGGESTION_STATUS   PROPOSED | CONFIRMED | DISMISSED | REJECTED | EXPIRED
SUGGESTION_ACTION   DIVERT | HOLD_AND_METER | OPEN_ALTERNATE_ROUTE | SLOW_INFLOW
SAFEGUARD_CHECK     OVER_THRESHOLD_CELL | WOULD_PUSH_NEIGHBOUR_OVER
                    | STALE_CELL_ON_ROUTE | UNKNOWN_CELL_ON_ROUTE
                    | EXIT_OVER_CAPACITY
TEXT_SOURCE         MODEL | TEMPLATE
OUTCOME_VERDICT     PENDING | IMPROVED | UNCHANGED | WORSENED
ROLE                COORDINATOR | ADMINISTRATOR | DRONE_OPERATOR | IT
RISK_FEATURE        density | densityGradient | densityRateOfChange
                    | flowConvergence | counterFlow | speedMean
                    | speedVariance | stopStartPulses | exitOccupancy
CONNECTION_STATE    CONNECTING | LIVE | DEGRADED | DISCONNECTED
```

`DRONE_LINK` is connectivity, kept separate from `DRONE_STATE`, which is the flight and measurement state the proposal defines. A drone that is offline has not entered a third measurement state; it has simply stopped writing, and its cells age into gaps like any others.

***

## Appendix B - Proof-of-concept demo harness

This appendix is scaffolding for the proposal defence, not a product requirement. Nothing in it survives the arrival of a real backend, and no requirement in Section 4 depends on it.

The mock client is a deterministic simulator. Without directable scenarios, demonstrating a coverage gap or a safeguard rejection would depend on waiting for one to occur by chance.

| Scenario | What it shows |
| - | - |
| `CALM` | Steady state. All observed cells in normal and watch bands. |
| `CONVERGENCE` | Two streams meeting at a zone boundary, driving flow convergence and counter-flow up until an elevated alert fires with those features at the top of its attribution. |
| `TRANSIT_GAP` | A drone leaves an area. Its cells pass through stale into gap, and on arrival at the new area they show not enough dwell for 30 s before scoring begins. |
| `SAFEGUARD_REJECT` | An alert whose best-ranked route contains a stale cell, so the option is returned rejected with its reason. |
| `MODEL_OFF` | Every suggestion rendered from template text, with the source indicated. |

Controls: play and pause, speed at 1x, 4x and 16x, jump to next alert, and scenario selection. Visible to the Administrator role only, and never presented as part of the product.

***

## Appendix C - Decisions register

Decisions taken during Step-2 that the proposal does not make. Recorded with their reasoning so that a question at the defence has an answer in the document rather than in someone's memory. The first five close the open questions logged in `docs/understanding.md` Section 14.

| # | Decision | Reasoning |
| - | - | - |
| D1 | Latency budget is 2000 ms | The perception worker emits at 1 Hz, so capture to emit is about 1 s, leaving roughly 1 s for risk scoring, the Redis hop, the Channels push and the render. Tight enough that it genuinely constrains the choice of Farneback over RAFT, and achievable without a GPU per drone. |
| D2 | Risk bands at 0.40, 0.70 and 0.85 | Four bands. The watch band gives a coordinator a heads-up that raises no alert, which is the interface's answer to the CCP tension between missed warnings and false alarms. Elevated at 0.70 is the alert threshold and the trigger for suggestions; critical escalates presentation only. |
| D3 | Four roles | Maps one to one onto the proposal's stakeholder table. Each has a genuinely different screen set, so FR10 is visibly real rather than a login form with one dashboard behind it. |
| D4 | Alerts in-app, plus web push, plus audible | All three are free browser capabilities needing no third-party service. SMS, email and radio are excluded because every gateway for them requires payment details, which the proposal forbids. |
| D5 | Four drones over three zones | A deliberately non-matching count makes visible on screen that measurements belong to cells and not to drones. One zone gets two drones, one gets one, and one is temporarily uncovered during a transit, so gaps and transit state both appear naturally. |
| D6 | 5 m cells over a 300 m by 200 m site | A 25 square metre cell holds roughly 100 to 150 people at stampede-level density: fine enough to resolve a bottleneck, coarse enough that a density estimate over it is meaningful. Of 2400 cells only about 400 are observed at once, so the map honestly shows mostly gaps. |
| D7 | 30 s sliding window and dwell gate | Thirty samples at 1 Hz is enough for the rate-of-change, velocity-variance and stop-start-pulse features to be statistically meaningful. It also makes not enough dwell visibly common right after a drone arrives, which is the honesty the design depends on. |
| D8 | Fresh below 2 s, stale to 10 s, gap beyond | The fresh boundary is the latency budget itself, so a cell is trustworthy exactly when the system met its own promise and there is nothing arbitrary to defend. Beyond 10 s a crowd measurement is close to fiction, so the cell reverts to a gap. |
| D9 | Observation state and risk band as two orthogonal fields | Makes an unknown cell carrying a risk score unrepresentable rather than merely forbidden. Supersedes the earlier five-cell-states framing, which was written before the bands were fixed. |
| D10 | Outcome follow-up window of 10 minutes | Long enough for a redirection to take effect in the risk trajectory, short enough that the outcome is still plausibly attributable to the suggestion. A window of 30 minutes would never complete during a live demo. |
| D11 | Up to three ranked suggestions | Enough for a genuine choice with a clear first preference, few enough to read under time pressure. Rejected options are included, because showing a rejection reason demonstrates the safeguards better than hiding it. |
| D12 | One hour full rate, 30 days at 10 s | Full-rate history for the last hour is what replay of a recent incident needs. Beyond that, a twentieth of the volume still carries the audit trail. Audit records themselves are never downsampled. |
| D13 | Zone risk is the maximum of its observed cells, always shown with coverage | A zone is only as safe as its worst cell; averaging one dangerous cell against a hundred calm ones is how a real warning gets hidden. Coverage travels with the risk so a mostly-unseen zone cannot read as calm. |
| D14 | Alert clear hysteresis of 0.05 held for 30 s | Without it, a score oscillating around the threshold produces a burst of alerts, which is the fastest way to lose the coordinator trust the CCP statement warns about. |
| D15 | Concrete interface contracts in Section 3 | The mock layer implements the same named endpoints, message types and field shapes a backend will, so connecting the real backend later is a change of client implementation, not a rewrite of the views. |
| D16 | IEEE 830 adapted structure, FR1 to FR10 decomposed, acceptance criteria throughout | The skeleton is familiar to an FYP panel. Keeping the proposal's FR numbering as parents means no requirement is invented, and acceptance criteria make Step-4 and Step-7 mechanical. |
| D17 | One `SentinelClient` interface with mock and HTTP implementations | The simulator must drive the demo, deciding when a drone transits and when an alert fires, so it lives in application code where scenario and speed controls can reach it, while every component still goes through the contract a real backend satisfies. |
| D18 | Demo harness specified, in a marked appendix | Without directable scenarios the defence demo waits for the right moment by chance. Marking it as scaffolding keeps it from reading as a claimed product feature. |

Decisions D19 to D21 were taken in Step-4, when the mapping check found three points where `design.md` and this document could not both be right.

| # | Decision | Reasoning |
| - | - | - |
| D19 | The Drone Operator sees the complete live map, alert rail included, and may acknowledge an alert | An operator who knows where an alert fired can reposition a drone toward it, which is the operator's job. FR5.3 puts attribution on the rail card itself, so the card is self-sufficient and the operator needs no navigation away from `S02` to read it. Suggestions and their confirmation stay closed to the role, because choosing a dispersion action is the coordinator's decision, not the pilot's. |
| D20 | The roles reference is its own screen, `S17`, shared with the accounts screen | FR10.4 gives IT a read-only view of who may do what, but `S13` is Administrator-only, so the reference cannot live there alone. One shared component rendered by both screens means the roles table has a single source and cannot drift from the permission matrix that the navigation is derived from. |
| D21 | The estimated people count is surfaced, over observed cells only | FR1.1 defines a density map whose values sum to a people count, and until now nothing in the interface showed that sum, leaving the counting requirement evidenced only by shading. Restricting the count to observed cells is what keeps it honest: a figure spanning unobserved cells would be interpolation expressed as a number. Recorded as FR1.5. |

Decisions D22 and D23 were taken in Step-6, when mapping the team's `required-pages.md` against `design.md` found two agreed pages with no screen behind them.

| # | Decision | Reasoning |
| - | - | - |
| D22 | A dedicated suggestions screen, `S18`, serving existing requirements | `design.md` had distributed the decision-support tier across the `S02` alert rail, `S04`, the `S08` Suggestions tab and `S09`, so no single surface showed a suggestion's whole life from proposal to outcome. That tier is the part of the pipeline an examiner is least likely to have seen before, so it earns a surface of its own. `S18` renders the same `C05` and `C09` components the other screens use, so the lifecycle gains one home without anything being written twice, and it adds no capability: every requirement it serves is already in FR7 and FR8. |
| D23 | An analytics screen, `S19`, recorded as new requirement FR11 | `required-pages.md` item 10 asks for session statistics with export, and had no home in this document or in `design.md`. It is recorded as new scope rather than read into an existing requirement, because inventing a requirement and then presenting it as one that was always there is precisely the drift this register exists to prevent. Export is generated in the browser, because every hosted export service requires payment details, which NFR8 forbids. `S19` reports what happened and does not forecast, recommend staffing or plan capacity, all of which stay out of scope under Section 2.6. |
