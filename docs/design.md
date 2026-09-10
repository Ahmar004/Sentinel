# Sentinel - Screen and Flow Design

Version 1.0. Implements `srs.md`. Governs Step-5 (wireframes) and Step-6 (build).

This document lists every screen, tab, pop-up and flow the Sentinel web app has, and maps each one to the requirements it satisfies. It decides structure and behaviour, not visual styling; the wireframes in Step-5 give it form.

***

## 1. How to read this document

Screens carry an ID of the form `S01`. Dialogs and pop-ups carry `D01`. Flows carry `F01`. Shared components carry `C01`. Every SRS leaf requirement appears at least once in the traceability table in Section 12, and any requirement with no screen against it is a defect in this document.

Section 2 restates the constraints from `srs.md` that shape every screen, so no screen has to be checked against the SRS to know them.

***

## 2. Global constraints

Copied from `srs.md`. These bind every screen in this document.

- **The honesty invariant, SRS 2.3.** A cell carries an `observationState` of `OBSERVED`, `NOT_ENOUGH_DWELL`, `STALE` or `GAP`, and carries a `riskBand` of `NORMAL`, `WATCH`, `ELEVATED` or `CRITICAL` only when observed. No surface in this document renders a cell without a risk band as safe. No surface interpolates a gap. No surface shows a stale value without its age.
- **Eight visual treatments**, four observation states and four risk bands, each distinct. Distinguishable without relying on hue alone, using fill pattern and an explicit label as well as colour (NFR5).
- **Live means live.** Cell, zone and drone data arrive by push at 1 Hz. No screen polls.
- **Advisory only.** No screen actuates anything. The confirm step on a suggestion records a human decision and causes no outward action.
- **Two to four zones.** No screen offers creation beyond four.
- **Latency budget 2000 ms**, which is also the fresh boundary. Stale runs from 2 s to 10 s. Beyond 10 s a cell is a gap.
- **Two first-class layouts**, mobile portrait at 390 x 844 for the coordinator and drone operator, desktop at 1440 x 900 for the administrator and IT. Neither is derived from the other and there is no tablet layout. Keyboard first, then touch, then mouse. Enter submits and Esc cancels in every form and dialog.
- **No paid service.** Leaflet renders an uploaded site plan image. There is no tile provider and no API key anywhere.
- **No video on the live path.** Per-drone and combined views render the wind-map overlay over the drone's footprint cells. They are not video players.
- **Vocabulary.** Cell, zone, dwell, footprint, freshness, gap, observe, transit, convergence, counter-flow, risk score, exit occupancy. Imported from the constants module in SRS Appendix A, never hardcoded and never given synonyms.
- **Explanatory text.** A mandated explanation may be presented in an on-demand `InfoPopover` (`C14`) rather than as always-on prose, except the load-bearing honesty statements enumerated in the front-end honesty test, which stay visible. Where a small diagram (`C15`) carries the same point it replaces the paragraph.

***

## 3. Application shell and navigation

### 3.1 Shell regions

```
Desktop, 1440 x 900
+======+=================================================+
|      | TOP BAR                                          |
| NAV  |  site selector | LIVE | 1.2s | 14:03:12  | user  |
| RAIL +=================================================+
| 200  |                                     |           |
| with |                                     |  ALERT    |
| lab- |          MAIN REGION                |  RAIL     |
| els  |                                     |  360      |
|      |                                     |           |
+======+=================================================+

Mobile portrait, 390 x 844
+=========================+
| TOP BAR                 |
| site | LIVE 1.2s | user |
+=========================+
| ZONE STRIP, scrolls >   |
+=========================+
|                         |
|      MAIN REGION        |
|                         |
|                         |
+=========================+
| ALERT SHEET handle  (3) |
+=========================+
| NAV BOTTOM BAR          |
+=========================+
```

**Top bar** carries, left to right: the site selector, the connection state chip, the measured end-to-end latency, the site clock, and the user menu. The connection chip and latency are present on every screen because a coordinator must never have to ask whether what they are looking at is current (FR3.3, NFR1).

**Nav rail** on desktop is a 200px left rail carrying an icon and a label per entry. On mobile it is a bottom bar of icon-and-label targets within thumb reach, carrying only the entries the role can open. Its entries are derived from one session object and nothing else (FR10.3).

**Alert rail** appears on the live map and zone detail only. On mobile it becomes a bottom sheet with a count badge.

### 3.2 Navigation per role

Derived from the permission matrix in SRS 2.4. A role never sees a nav entry it cannot open.

| Nav entry | Coordinator | Administrator | Drone Operator | IT |
| - | - | - | - | - |
| Live map (`S02`) | Yes | Yes | Yes | No |
| Timeline (`S05`) | Yes | Yes | No | No |
| Fleet (`S06`) | Yes | Yes | Yes | No |
| History (`S08`) | Yes | Yes | No | No |
| Suggestions (`S18`) | Yes | Yes | No | No |
| Analytics (`S19`) | Yes | Yes | No | No |
| Replay (`S10`) | Yes | Yes | No | No |
| Configuration (`S12`) | No | Yes | No | No |
| Accounts (`S13`) | No | Yes | No | No |
| Audit log (`S14`) | No | Yes | No | Yes |
| System health (`S15`) | No | Yes | Yes | Yes |
| Roles reference (`S17`) | No | Yes | No | Yes |

The IT role's navigation contains system health, the audit log and the read-only roles reference `S17`, and nothing operational. This is deliberate and is stated on the IT landing surface, so that an examiner asking why IT cannot see the map gets the answer from the product: IT exists for deployment, maintenance and the confidentiality, integrity and availability of the system, and the live crowd picture is not needed for any of that (FR10.4).

The Drone Operator's navigation reaches the live map and the fleet. The role sees the whole of `S02`, alert rail included, and may acknowledge an alert, but not the screens behind it: `S03`, `S04`, `S05`, `S08`, `S09` and `S10` stay closed to it, and suggestions never render for it (SRS 2.4, decision D19).

Landing route after login, by role: Coordinator and Administrator to `S02`, Drone Operator to `S06`, IT to `S15`.

***

## 4. Screen inventory

| ID | Screen | Route | Roles | Primary requirements |
| - | - | - | - | - |
| `S01` | Login | `/login` | public | FR10.1 |
| `S02` | Live site map | `/live` | Coord, Admin, Operator | FR1, FR2, FR3, FR4, FR5, FR6 |
| `S03` | Zone detail | `/live/zones/:zoneId` | Coord, Admin | FR4.5, FR4.6, FR5 |
| `S04` | Alert detail | `/live/alerts/:alertId` | Coord, Admin | FR5.2, FR5.4, FR5.6 |
| `S05` | Risk timeline | `/timeline` | Coord, Admin | FR4.3, FR4.5, FR4.6 |
| `S06` | Drone fleet | `/fleet` | Coord, Admin, Operator | FR9.8, FR6.1 |
| `S07` | Per-drone view | `/fleet/:droneId` | Coord, Admin, Operator | FR1.2, FR2.1, FR2.3, FR3.1 |
| `S08` | History | `/history` | Coord, Admin | FR8.1, FR8.2, FR8.3 |
| `S09` | Event detail | `/history/:eventId` | Coord, Admin | FR8.6, FR8.7 |
| `S10` | Replay | `/replay` | Coord, Admin | FR8.4, FR8.5 |
| `S11` | Venue setup wizard | `/setup` | Admin | FR9.1 to FR9.8 |
| `S12` | Site configuration | `/config` | Admin | FR9.1 to FR9.9 |
| `S13` | Accounts | `/accounts` | Admin | FR10.2, FR10.5 |
| `S14` | Audit log | `/audit` | Admin, IT | FR7.8, FR9.9, FR10.6 |
| `S15` | System health | `/health` | Admin, Operator, IT | FR3.2, FR7.6, NFR6 |
| `S16` | Not permitted | `/403` | any | FR10.3 |
| `S17` | Roles reference | `/roles` | Admin, IT | FR10.2, FR10.4 |
| `S18` | Suggestions | `/suggestions` | Coord, Admin | FR7.1, FR7.4, FR7.5, FR7.6, FR8.6 |
| `S19` | Analytics | `/analytics` | Coord, Admin | FR11.1 to FR11.3 |

***

## 5. Screens in detail

### S01 - Login

A two-pane layout on desktop: a mosaic of openly-licensed photographs of very high crowd density (Hajj tawaf and the Masjid al-Haram, the Kumbh Mela, an aerial concert crowd, a festival) fills the left pane under a dark-blue wash, with a one-line description of the system, the `PipelineDiagram` and an on-screen image credit beneath it; the right pane carries the login card. On mobile the mosaic is dropped and a single banner image sits above the card. The images are bundled in `public/login/` and attributed in full in `CREDITS.md` at the repository root. Card contents: username, password, submit.

- A real `<form onSubmit>` with `event.preventDefault()`, `type="submit"` on the primary button. Enter submits.
- A failed login states that the credentials were not accepted and does not reveal which field was wrong (FR10.1).
- Four demo accounts are listed on the card during the proof of concept, one per role, so a defence audience can switch roles without being told the passwords aloud. This block is marked as demo scaffolding.
- On success, routes by role per Section 3.2.

**States:** idle, submitting, invalid credentials, account deactivated, server unreachable.

### S02 - Live site map

The product. Everything else supports it.

```
Desktop 1440 x 900
+======+==========================================+=========+
| NAV  | site | LIVE | 1.2s | 14:03:12    | user  |         |
|      +==========================================+ ALERT   |
| Live | ZONE STRIP                               | RAIL    |
| Time | A .31 82% | B .78 24% | C  -  0%         | 360     |
| Fleet+==========================================+         |
| Hist |                                          | open    |
| Repl |        LEAFLET SITE PLAN                 | alerts, |
| Conf |        grid, zones, overlay,             | newest  |
| Acct |        footprints, gaps                  | first   |
| Audit|                                          |         |
| Hlth +==========================================+         |
| 200  | LAYERS   LEGEND                    [ ? ] |         |
+======+==========================================+=========+

Mobile 390 x 844
+=============================+
| site | LIVE 1.2s |     user |
+=============================+
| A .31 82% | B .78 24% | C > |
+=============================+
|                             |
|     LEAFLET SITE PLAN       |
|     grid, zones, overlay,   |
|     footprints, gaps        |
|                             |
|                    [layers] |
|                    [legend] |
+=============================+
| ^  ALERTS  (3)              |
+=============================+
| Live  Time  Fleet  Hist  ...|
+=============================+
```

**Map layers**, each independently toggleable, all on by default except static attributes:

| Layer | Draws | Requirement |
| - | - | - |
| Site plan | The uploaded venue image, georeferenced | FR9.1, NFR8 |
| Cell grid | 5 m cell boundaries, hidden below a zoom threshold | FR9.2 |
| Density shading | Fill per cell from `densityPerSqM` | FR1.2, FR3.1 |
| Flow arrows | One arrow per cell, direction from `flow.dirDeg`, length from `speedMps` | FR2.2, FR3.1 |
| Risk band | Cell outline or fill by band | FR4.4 |
| Zone boundaries | Named outlines over cell groups | FR6.2 |
| Drone footprints | Current footprint polygon per drone, labelled with drone id and state | FR1.2, FR6.1 |
| Alert markers | Pin on the alerting cell, pulsing while open | FR5.1 |
| Static attributes | Exits, barriers, obstructions, non-walkable | FR9.3, FR9.4 |

**Cell rendering rules**, which are the heart of the screen:

- `OBSERVED` renders density shading, a flow arrow and its risk band.
- `NOT_ENOUGH_DWELL` renders density shading and a flow arrow where one exists, with a distinct hatch and no risk band. On tap the reason is named: "not enough dwell, 18 s of 30 s".
- `STALE` renders desaturated with a distinct hatch and a visible age badge. Never presented as a current value (FR3.4).
- `GAP` renders grey with a distinct hatch and no numbers at all (FR6.3).
- Where `flow` is `null`, no arrow is drawn. A zero-length or default-direction arrow is never drawn (FR3.5).

**Zone strip**, across the top of the map. It leads with `ZoneRiskPie` (`C13`): a pie of the configured zones, each slice angled by that zone's aggregate risk score and filled with its risk-band colour, an unobserved zone drawn as a distinct grey no-reading slice and never dropped, captioned as a share of current site risk with an `InfoPopover` explaining that the whole is the sum of the zone scores rather than a probability. Then one tile per zone showing its name, risk score, band, an estimated people count over its observed cells with that observed count beside it (FR1.5), and a coverage bar broken into observed, not-enough-dwell, stale and gap. Risk and coverage always appear together, never risk alone (FR4.5, FR4.6). The tile names the peak cell. Tapping a tile opens `S03`.

**Alert rail**, on the right. One card per open alert, newest first, each carrying zone, cell, score against threshold, time, band, and **the top three contributing features with their signed contributions**, readable without navigation (FR5.3). Actions per card: Acknowledge, and Suggestions which expands the ranked options inline (see `C05`). Watch-band zones appear in the rail as a trend line with no alert, which is what the watch band exists for.

**Legend**, a persistent collapsed strip that expands to a panel. It names all eight treatments with their pattern swatch and label, and carries one sentence stating that gaps are never guessed and stale values are never shown as current. The legend is a requirement surface, not decoration: it is where NFR5 and the honesty invariant become visible to a viewer who has never seen the system.

**Interactions:** tap a cell opens the cell inspector `D01`. Tap a footprint opens `S07` for that drone. Tap an alert marker selects its rail card. Pinch and scroll zoom. Keyboard as Section 11: arrows pan, `+` and `-` zoom, `A` focuses the alert rail, `L` toggles the legend, `Esc` closes any open drawer, and `Tab` reaches every interactive element in visual order.

**Drone Operator variant.** The operator sees every layer, the zone strip and the alert rail with its attribution and its Acknowledge action. Two things differ: the zone tile and the rail card are not links, because `S03` and `S04` are closed to the role, and the rail card's Suggestions action is absent because `C05` never renders for an operator. Nothing on the screen is a dead end, since FR5.3 already puts the top three contributing features on the card itself (decision D19).

**States:** connecting (skeletons, no value rendered as zero), connected and live, degraded (see `C08`), disconnected, no site configured (routes an Administrator to `S11`).

### S03 - Zone detail

One zone, opened from the zone strip.

- Header: zone name, current risk, band, peak cell, the estimated people count over the zone's observed cells with that observed count stated beside it (FR1.5), and the coverage breakdown as counts and a bar.
- Risk timeline `C03` for the zone over the last hour.
- Coverage timeline showing observed cell count over the same period, so a risk dip caused by losing coverage is not mistaken for a risk dip caused by the crowd thinning. This is FR4.6 expressed over time.
- Member cell list, sortable by risk, filterable by observation state.
- The zone's open and recent alerts.
- Its configured thresholds, read-only for a coordinator, with an edit link for an administrator that opens `D06`.

### S04 - Alert detail

Opened from a rail card or from history.

- Alert header: zone, cell, score, threshold, band, raised at, status, and who acknowledged it and when (FR5.6).
- **Full feature attribution** as a horizontal signed bar chart, every contributing feature with its contribution and its raw value, ordered by absolute contribution (FR5.2).
- A line stating the clear condition in plain words: "clears when risk stays below 0.65 for 30 seconds" (FR5.4).
- The cell's risk timeline `C03` spanning the sliding window before the alert and everything since.
- The map cropped to the alerting cell and its neighbourhood, with the same layers as `S02`.
- The alert's suggestions `C05`.
- When viewed from history, a note stating that the attribution shown is the one recorded when the alert fired and is never recomputed (FR8.7).

### S05 - Risk timeline

All zones charted together over a selectable period, Recharts.

- One line per zone, with the four band boundaries drawn as reference lines so a reader sees which band a zone was in at any moment.
- Alert markers on the time axis.
- **Coverage is charted underneath as a stacked area per zone**, because a zone risk line is meaningless without knowing how much of the zone was observed at that time.
- Period selector: last 15 minutes, last hour, last 24 hours, custom. Selecting a period beyond one hour shows the resolution notice from FR8.5.
- Selecting a point offers "replay from here", opening `S10`.

### S06 - Drone fleet

Two tabs.

**Tab: Fleet list.** One card per drone: id and label, state (observe or transit) with dwell elapsed, link status, battery, assigned area, footprint cell count, and cells currently contributed. Actions: open per-drone view, and for an administrator or operator, Assign, opening `D07`.

The fleet screen states the count of drones and the count of zones side by side, and carries one line explaining that drones are not assigned to zones because every measurement belongs to a cell. Four drones over three zones makes that visible; the line makes it explicit (FR9.8).

**Tab: Combined feeds.** Every drone's footprint rendered as a labelled small multiple, each showing the wind-map overlay over just that drone's footprint cells, with its state and dwell. A persistent line on this tab reads: "Views are placed by coordinates on the shared grid. Images are never stitched." This satisfies the proposal's named combined-feeds view while making the out-of-scope boundary explicit rather than leaving an examiner to wonder (SRS 2.6).

Where two footprints overlap, the overlapping cells are marked, and tapping one shows both contributing drones, which is FR6.1 made visible.

### S07 - Per-drone view

One drone. Not a video player, and it says so.

- Mini map cropped to the drone's footprint, carrying the wind-map overlay for its footprint cells only.
- State banner: `OBSERVE` or `TRANSIT`. In transit the banner reads: "In transit. Density only. Flow and risk are not produced from a moving camera." This is FR2.3 and the drone-state rule stated in the interface rather than implied by absent arrows.
- Dwell panel: per-cell dwell progress toward the 30 s gate, so a viewer watches not-enough-dwell cells fill in after arrival (FR4.2).
- Registration status: reference frame locked or searching, and inlier count (FR2.1). One line explains why this matters: each frame is matched to a saved reference frame so drone drift is never counted as crowd movement.
- Telemetry: pose, altitude, heading, battery, link.
- Estimated people in the footprint, summed over its observed cells only and labelled as such, which is where the density map's people count from FR1.1 becomes visible (FR1.5).
- Footprint cell table with density, flow and observation state.
- A line stating that the live path carries per-cell summaries only and no imagery (FR1.4).

### S08 - History

Searchable, filterable event stream. FR8 has no model behind it, so it is built to full depth.

- Filter bar: time range, zone, cell, risk band, alert status, suggestion status, actor, free text (FR8.3). Filters combine and each narrows independently. Active filters show as removable chips.
- Tabs scoping the stream: All, Alerts, Suggestions, Configuration changes.
- Result rows carry type, time, zone, cell, a one-line summary, and for suggestions the outcome verdict as a chip.
- A resolution notice appears when the selected range extends beyond the full-rate hour, naming the sample resolution (FR8.2).
- Row actions: open `S09`, or replay the surrounding period in `S10`.

**States:** loading, results, no results for these filters (with a clear-filters action), range exceeds retention.

### S09 - Event detail

One historical event, rendering by type.

- **Alert:** the `S04` layout, read-only, with the recorded attribution (FR8.7).
- **Suggestion:** the full option set as issued, including options rejected by safeguards with their reasons, which human confirmed or dismissed it and when, and the phrasing source.
- **Outcome:** for a confirmed suggestion, the risk trajectory of the affected cells across the 10 minute window as a chart, the risk at confirm time, the peak in the window, and the verdict of improved, unchanged or worsened, with the rule stated in plain words (FR8.6). While the window is open the verdict reads pending with a countdown.
- **Configuration change:** the field, its previous value, its new value, the actor and the timestamp (FR9.9).

This screen is where outcome tracking closes the loop, and it is the strongest evidence in the product that Sentinel is auditable.

### S10 - Replay

The map, driven from history rather than from the live stream.

- The full `S02` map with the same layers and the same eight cell treatments.
- Transport bar: play, pause, step, speed at 1x, 4x and 16x, and a scrub bar.
- Timeline track marking alerts, suggestions issued and confirmations, so a reviewer can jump between them.
- **A resolution chip states the sample rate of what is being replayed**, 1 Hz inside the last hour and 0.1 Hz beyond it, and the playhead steps in whole samples. Downsampled data is never smoothed to appear full rate (FR8.5).
- A persistent "replay" marker distinguishes this screen from `S02` at a glance, so nobody mistakes recorded data for live.

### S11 - Venue setup wizard

Administrator, first run for a site. Eight steps then review. Each step is a component reused by `S12`, so nothing is written twice.

| Step | Content | Requirement |
| - | - | - |
| 1. Site plan | Upload the plan image, set its ground extent and scale by drawing a known distance | FR9.1 |
| 2. Grid | Cell size and origin, with a live preview of the resulting grid and its cell count | FR9.2 |
| 3. Proposals | Setup-pass proposals for exits, barriers and obstructions, each individually accept or reject | FR9.3 |
| 4. Attributes | Paint cell attributes by hand: walkable, exit, barrier, obstruction | FR9.4 |
| 5. Exits | Group exit cells into named exits and set capacity in people per minute | FR9.5 |
| 6. Zones | Select cells into two to four named zones | FR9.6 |
| 7. Thresholds | Per-zone risk and density thresholds, defaulting to a risk threshold of 0.70 and a density threshold of 4.0 people per square metre | FR9.7 |
| 8. Drones | Register drones and assign each an initial area | FR9.8 |
| Review | Everything above as a summary, then Save | FR9.9 |

Step 3 can be skipped entirely and step 4 still completes the configuration. The wizard states this: manual annotation is the guaranteed path and the setup pass only pre-fills it (FR9.4). A demo run with no proposals present must therefore still reach a fully configured site.

Step 6 disables the add-zone control at four zones and states the validated limit inline (FR6.5).

Navigation: steps are non-linear once visited, progress is saved per step, and leaving with unsaved changes raises `D10`.

### S12 - Site configuration

Seven of the wizard's eight step components, reused as tabs for editing after setup: Plan, Grid, Attributes, Exits, Zones, Thresholds, Drones, plus a Demo tab visible only during the proof of concept. The Proposals step has no tab of its own, because the setup pass runs once per venue; its accept and reject controls appear inside the Attributes tab wherever unreviewed proposals remain (FR9.3).

Editing the grid warns that changing cell size regenerates the cell set and detaches existing zones, and requires confirmation through `D11`.

Every save writes the previous and new value to the audit log and shows a toast naming what changed (FR9.9).

### S13 - Accounts

Administrator only.

- User table: username, role, status, last login. Filter by role and status.
- Create and edit through `D08`.
- Deactivate through `D09`. A deactivated user cannot authenticate, and their historical audit entries remain intact, which the dialog states (FR10.5).
- A roles reference panel rendering the shared `C11` component, the same one `S17` renders in full, so the roles table has one source and cannot drift from the permission matrix the navigation is derived from (FR10.2).

### S14 - Audit log

Administrator and IT.

- Chronological entries: time, actor, action, target, previous value, new value.
- Filters: time range, actor, action type.
- Covers authentication events, failed logins, role changes, threshold changes, drone assignments, alert acknowledgements, and suggestion confirmations and dismissals (FR7.8, FR9.9, FR10.6).
- Entries are never editable and never downsampled, which the screen states.

### S15 - System health

Administrator, drone operator and IT. Three tabs.

- **Workers:** one row per perception worker with its drone, state, last emit, and queue depth.
- **Latency:** measured end-to-end latency against the 2000 ms budget as a chart with the budget drawn as a reference line, plus the current 95th percentile (FR3.2, NFR1).
- **Services:** message channel, database, risk engine, and the phrasing model with an explicit available or unavailable state. When the model is unavailable this tab states that suggestions continue with template phrasing, which is the fallback behaviour from FR7.6 surfaced rather than hidden (NFR6).

This is the IT role's landing screen, and it carries one line stating why that role has no operational navigation: IT exists for deployment, maintenance and the confidentiality, integrity and availability of the system, and the live crowd picture is not needed for any of that. An examiner asking why IT cannot see the map gets the answer from the product rather than from a document (FR10.4).

### S16 - Not permitted

Reached when a role opens a route it cannot access, which should be unreachable through navigation and exists because a URL can be typed. States the current role, that the resource requires a different one, and offers a link to that role's landing screen (FR10.3).

### S17 - Roles reference

Administrator and IT. Read-only, and the only operational-adjacent screen IT can open.

- The four roles and their capabilities, rendered by `C11` from the same permission matrix the navigation is derived from, so the reference cannot drift from what is enforced (FR10.2).
- One line per role stating what it exists to do, including the sentence explaining why IT has no access to crowd data (FR10.4).
- No editing anywhere on the screen. Assigning a role to a person is account management and happens in `S13`, which IT cannot open.

`S13` renders the same `C11` component as a panel, so the table has one source (decision D20).

### S18 - Suggestions

Coordinator and administrator. The whole life of every suggestion in one place, which no other screen shows (decision D22).

- Filter bar (`C09`): time range, zone, status, action, phrasing source and actor. Active filters show as removable chips.
- Rows group by their originating alert, so the three ranked options for one alert read as one decision rather than as three unrelated rows.
- Each row carries rank, action, status, phrasing source, the safeguard result, who confirmed or dismissed it and when, and the outcome verdict as a chip once the follow-up window has closed.
- Options rejected by a safeguard render with the failing check named and have nothing to confirm (FR7.4).
- An alert whose every candidate was rejected renders the no safe option state in words (FR7.5).
- A pending outcome shows its countdown rather than an empty verdict (FR8.6).
- Row actions: open the alert in `S04`, or the event in `S09`.

**States:** loading, results, no results for these filters with a clear-filters action.

Ranked options for a live alert continue to appear in the `S02` alert rail through `C05`, because a coordinator acting under time pressure must not have to navigate away from the map. `S18` is the review surface and `S02` is the action surface, and both render `C05`, so the two cannot describe the same option differently.

### S19 - Analytics

Coordinator and administrator. Session statistics over a selected range (FR11).

- Range selector, defaulting to the current session.
- Alerts per zone as a bar chart, with the same figures in a table beneath it, so the numbers are readable without interpreting the chart (NFR5). Each zone shows the share of the range it was observed for beside its count, and a zone nothing watched reads as no data rather than as zero alerts, for the same reason FR4.6 never shows zone risk without coverage.
- Coordinator response time from alert raised to acknowledged, as median and 95th percentile.
- Suggestion acknowledgement rate: issued, confirmed, dismissed and expired.
- Outcome verdict distribution across improved, unchanged and worsened, with pending counted separately rather than folded into unchanged.
- Export of the current range, generated in the browser and contacting no service (FR11.2, NFR8).

Every figure states the events it was computed from, and a kind with no events in the range reads as no data rather than as zero (FR11.3). An acknowledgement rate of 0 percent means every suggestion was ignored; no data means none was issued.

**States:** loading, results, no events in this range.

This screen reports what happened. It does not forecast, recommend staffing or plan capacity, all of which stay out of scope (SRS 2.6).

***

## 6. Dialogs and pop-ups

| ID | Name | Opened from | Requirement |
| - | - | - | - |
| `D01` | Cell inspector | Tapping a cell on any map | FR1.2, FR2.2, FR3.4, FR4.2, FR6.1, FR6.3 |
| `D02` | Confirm suggestion | Suggestion card | FR7.7 |
| `D03` | Dismiss suggestion | Suggestion card | FR7.8 |
| `D04` | Notification permission | First alert, or user menu | FR5.5 |
| `D05` | Alert toast | Any alert raised | FR5.1, FR5.5 |
| `D06` | Edit thresholds | `S03`, `S12` | FR9.7 |
| `D07` | Assign drone | `S06`, `S12` | FR9.8 |
| `D08` | Create or edit user | `S13` | FR10.5 |
| `D09` | Deactivate user | `S13` | FR10.5 |
| `D10` | Unsaved changes | Leaving `S11` or `S12` dirty | usability |
| `D11` | Regenerate grid | `S12` grid tab | FR9.2 |
| `D12` | Session expired | Token refresh failure | FR10.1, NFR7 |
| `D13` | Install app | PWA install eligibility | NFR2 |
| `D14` | Demo harness | Top bar, Administrator only | SRS Appendix B |

Every dialog is a real `<form onSubmit>` where it submits anything, Enter submits, Esc cancels, focus is trapped inside while open and returns to the trigger on close.

### D01 - Cell inspector

A side drawer, not a modal, so the map stays visible and the selected cell stays highlighted.

Contents by observation state, and this is the clearest single expression of the honesty invariant in the product:

| State | Drawer shows |
| - | - |
| `OBSERVED` | Cell id, zone, density in people per square metre, flow direction and speed, risk score and band, age, dwell, observing drones, the nine window features, and the cell risk timeline `C03` |
| `NOT_ENOUGH_DWELL` | The same, except risk reads "not enough dwell" with progress such as "18 s of 30 s", and no score is shown anywhere |
| `STALE` | Last density with a prominent age, no flow, risk reads "no current observation", and a line naming the last observing drone and when |
| `GAP` | Cell id, zone, static attributes, and "no observation" with the time since last seen or "never observed". No density, no flow, no risk, no chart |

Where two drones observe the cell, both are named (FR6.1).

### D02 - Confirm suggestion

The mandatory human step. A modal, because it is a decision that must not be made by a mis-tap.

- Restates the option in full: the action, the target exit, the route cells, the rationale, and every safeguard with its result.
- States plainly: "Sentinel does not control barriers, signage or gates. Confirming records your decision and notifies your team." This is the out-of-scope boundary from SRS 2.6 stated where a user could otherwise assume otherwise (FR7.7).
- Confirm is `type="submit"`; Cancel is `type="button"`.
- On confirm, the outcome tracking window opens and the suggestion card switches to showing its countdown.

### D03 - Dismiss suggestion

Records the dismissal with an optional reason. Written to the audit log (FR7.8).

### D04 - Notification permission

Explains what browser notifications are used for before requesting the permission, because a permission prompt with no context is usually refused. Offers the audible tone toggle in the same dialog. States that SMS and email are not offered (FR5.5).

### D05 - Alert toast

Transient, top right, one per alert. Carries band, zone, cell, score and the single highest contributing feature. Actions: view, which selects the rail card, and acknowledge. Critical alerts do not auto-dismiss. Accompanied by the audible tone for elevated and critical, respecting the mute setting.

### D06 - Edit thresholds

Per-zone risk and density thresholds. Shows the current value, the new value, and the count of cells currently between the two, so an administrator sees what lowering a threshold will do before saving (FR9.7).

### D07 - Assign drone

Pick a target area on a mini map, review the cells it will cover, confirm. States that on arrival the cells show not enough dwell for 30 seconds before scoring begins, and that the cells being vacated will become gaps (FR9.8, FR4.2, FR6.3).

### D08 - Create or edit user

Modal, opened from `S13`. Username, role from the four in the constants module, and a password field on create only.

- Role is a required choice with each option carrying a one-line summary of what that role can do, drawn from `C11`, so an administrator assigning a role sees its consequences at the point of decision.
- Editing an existing account never shows or reuses the stored password; a reset is a separate explicit action.
- On save, the audit entry records the previous and new value of every changed field (FR9.9, FR10.5).

**States:** create, edit, saving, username already taken, save failed.

### D09 - Deactivate user

Modal confirmation, opened from `S13`.

- Names the account and states plainly that it can no longer authenticate and that its historical audit entries remain intact and attributed to it (FR10.5).
- Deactivation is reversible from `S13`; the dialog says so, which is what stops it reading as a delete.
- Confirm is `type="submit"`, Cancel is `type="button"`, and the destructive action is not the focused default.

**States:** idle, submitting, failed, deactivating your own account (refused, with the reason).

### D10 - Unsaved changes

Modal, raised when leaving `S11` or `S12` with a dirty step or tab.

- Names which step or tab is unsaved and what would be lost.
- Three actions: save and leave, discard and leave, stay. Stay is the default and Esc chooses it.
- Purely a usability guard. It maps to no requirement, and it exists because the setup wizard holds enough work that losing it silently would be the sort of defect an examiner finds by accident.

### D11 - Regenerate grid

Modal confirmation, opened from the `S12` Grid tab when cell size or origin changes.

- States the consequence in counts, not in prose alone: the current cell count, the resulting cell count, and the number of zones, exits and cell attributes that will be detached because their cells no longer exist.
- Requires the administrator to re-enter the new cell size to confirm, because this is the one configuration change that discards existing work (FR9.2).
- On confirm, the change is versioned and audit-logged with previous and new values like any other (FR9.9).

**States:** idle, confirming, regenerating with progress, failed.

### D12 - Session expired

Modal, raised when a token refresh fails. Not dismissable, because everything behind it is stale by definition.

- States that the session ended and that the screen behind it is no longer live, which is the honesty invariant applied to authentication: a screen nobody is authenticated for must not keep presenting values as current (SRS 3.4).
- Offers sign in again, which returns to `S01` and, after a successful sign in, to the route the user was on if their role still permits it.
- The live subscription is closed before the dialog opens, so no push update can repaint the map underneath it (FR10.1, NFR7).

### D13 - Install app

A dismissable prompt, shown once when the browser reports the app is installable, and available from the user menu afterwards.

- States what installation gives an on-ground coordinator: a home-screen launch, a full-screen layout, and the browser notifications that carry alerts when the app is backgrounded.
- States equally plainly that installation does not make live data available offline. The shell is cached; cell, zone and drone data are never served from cache, and a client with no connection shows the map as unknown rather than as a held last frame (NFR2, NFR6).
- Declining is remembered and the prompt does not return on its own.

### D14 - Demo harness

Proof-of-concept scaffolding, Administrator only, marked as such in the dialog itself. Scenario selection across `CALM`, `CONVERGENCE`, `TRANSIT_GAP`, `SAFEGUARD_REJECT` and `MODEL_OFF`, play and pause, speed at 1x, 4x and 16x, and jump to next alert (SRS Appendix B).

***

## 7. Tabs

| Screen | Tabs |
| - | - |
| `S06` Drone fleet | Fleet list, Combined feeds |
| `S08` History | All, Alerts, Suggestions, Configuration changes |
| `S12` Site configuration | Plan, Grid, Attributes, Exits, Zones, Thresholds, Drones, Demo |
| `S15` System health | Workers, Latency, Services |
| `D01` Cell inspector | Current, Features, History |

***

## 8. Shared components

| ID | Component | Used by | Notes |
| - | - | - | - |
| `C01` | `SiteMap` | `S02`, `S04`, `S07`, `S10`, `S11`, `S12`, `D07` | Leaflet over Esri World Imagery, in web mercator with real coordinates. Layer set is a prop, so replay and setup reuse it without forking. |
| `C02` | `CellLayer` | `C01` | Renders the eight treatments. The single place cell appearance is decided, so the honesty invariant is enforced in one file. |
| `C03` | `RiskTimeline` | `S03`, `S04`, `S05`, `S09`, `D01` | Recharts. Draws band boundaries as reference lines. Renders gaps in the series as breaks, never as interpolated segments. |
| `C04` | `AttributionChart` | `S04`, `S09`, `D05` | Signed horizontal bars, ordered by absolute contribution. |
| `C05` | `SuggestionList` | `S02` rail, `S04`, `S09`, `S18` | Ranked cards with rationale, safeguards, phrasing source, confirm and dismiss. Renders rejected options and the no-safe-option state. |
| `C06` | `CoverageBar` | `S02` zone strip, `S03`, `S05` | Observed, not-enough-dwell, stale and gap as one stacked bar. Never rendered apart from a risk value. |
| `C07` | `Legend` | `S02`, `S07`, `S10`, `S11` | All eight treatments with pattern, colour and label. |
| `C08` | `ConnectionBanner` | shell | Live, degraded, disconnected. Named in Section 10. |
| `C09` | `FilterBar` | `S08`, `S14`, `S18` | Chips for active filters, each individually removable. |
| `C10` | `StateChip` | everywhere | One component renders every observation state, risk band, drone state, alert status and suggestion status, from the constants module. Nothing else renders these strings. |
| `C12` | `ZoneOverlay` | `S02`, `S10` | The zones the environment is divided into, as labelled outlines. Never filled: a tint would shift the density ramp underneath, and a filled rectangle would assert that all the ground inside belongs to the zone when a zone is a named set of cells. |
| `C11` | `RolesReference` | `S17`, `S13`, `D08` | The four roles and their capabilities, rendered from the same permission matrix the navigation is derived from. The single source for what a role may do. |
| `C13` | `ZoneRiskPie` | `S02` zone strip | A pie of the configured zones, each slice angled by the zone's aggregate risk score and coloured by its band. An unobserved zone is a grey no-reading slice, never omitted; when no zone is observed the pie carries no numbers. Every legend row pairs the score with the zone's observed percentage. |
| `C14` | `InfoPopover` | many | An Info trigger and a dismissable panel (Esc, outside click, focus-out) whose content mounts only while open. Where a mandated explanation is secondary it moves in here; the load-bearing honesty statements asserted in the front-end honesty test stay visible. |
| `C15` | `Diagrams` | see Section 5.x | Six themed inline-SVG figures - pipeline, precursors, cell-and-zone, drone state, safeguards, freshness - placed where they replace prose rather than decorate. |

`C02` and `C10` exist specifically so that no component can invent a cell appearance or a domain string on its own, and `C11` exists so that no screen can describe a permission the navigation does not actually enforce.

***

## 9. Flows

### F01 - Sign in and land

`S01`, submit, role resolved, land on the role's screen per Section 3.2. A wrong-role URL lands on `S16`. (FR10.1, FR10.3)

### F02 - Monitor the site

Coordinator opens `S02`. Zone strip shows three zones with risk and coverage. Cells tick at 1 Hz. One zone shows large grey areas because only four drones cover 2400 cells, and the legend explains it. Coordinator taps a grey cell; `D01` opens and says "no observation, never observed" with no numbers. (FR3.1, FR4.5, FR4.6, FR6.2, FR6.3)

### F03 - Investigate an alert

Risk in zone B crosses 0.70. `D05` toasts, the tone sounds, a card appears at the top of the alert rail carrying the top three contributing features, and a pulsing marker appears on cell `C-031-022`. The coordinator reads "flow convergence +0.19, density rate of change +0.14, stop-start pulses +0.09" without leaving the map, and taps the card to open `S04` for the full attribution. They acknowledge. (FR5.1, FR5.2, FR5.3, FR5.5, FR5.6)

### F04 - Act on a suggestion

From the rail card or `S04`, the coordinator expands Suggestions. Three ranked options render. Option 1 diverts north-east to Exit E2 with all five safeguards passed and a rationale naming the exit's occupancy against capacity. Option 3 is shown rejected, with `STALE_CELL_ON_ROUTE` failing and the cell named. The coordinator taps Confirm on option 1; `D02` restates the option, lists the safeguards, and states that Sentinel controls nothing. They confirm. The suggestion becomes confirmed, the audit entry is written, and the outcome window opens with a countdown. (FR7.1 to FR7.8)

**Variant, no safe option.** Every candidate is rejected. The list renders each rejection with its reason and an explicit statement that no safe option was found. There is nothing to confirm. (FR7.5)

**Variant, model unavailable.** Options render with template phrasing and a source badge reading template, and `S15` Services shows the model unavailable. Nothing else changes. (FR7.6, NFR6)

### F05 - Review the outcome

Ten minutes later the coordinator opens `S09` for that suggestion. The trajectory chart shows the affected cells' risk falling from 0.78 to a peak of 0.61 across the window, and the verdict reads improved with the rule stated. (FR8.6)

### F06 - Relocate a drone

Operator opens `S06`, selects drone-03, Assign, and picks a target area in `D07`, which lists the cells to be covered and warns that the vacated cells become gaps and the new cells show not enough dwell for 30 s. On confirm, `S02` shows the drone's state switch to transit, its arrows disappear while density continues, the vacated cells pass through stale into gap over 10 s, and on arrival the new footprint fills with not-enough-dwell hatching that resolves into risk bands after 30 s. This single flow demonstrates four architectural rules at once and is the most valuable 40 seconds of the defence demo. (FR2.3, FR4.2, FR6.3, FR9.8)

### F07 - Configure a venue

Administrator with no site configured lands on `S11`. Uploads the plan, sets the scale, defines a 5 m grid over 300 m by 200 m producing 2400 cells, reviews proposals, corrects them by hand, names two exits with capacities, selects three zones, sets thresholds, registers four drones, reviews and saves. Attempting a fifth zone finds the control disabled with the validated limit stated. (FR9.1 to FR9.8, FR6.5)

### F08 - Adjust a threshold

Administrator opens `S12` Thresholds or `S03`, opens `D06`, lowers zone B from 0.70 to 0.65, sees the count of cells currently between the two values, saves. The change takes effect on the next tick and appears in `S14` with its previous and new value. (FR9.7, FR9.9)

### F09 - Search history and replay

Coordinator opens `S08`, filters to zone B and yesterday's evening, and the resolution notice states 0.1 Hz because the range is beyond the full-rate hour. They open an alert in `S09`, see the attribution recorded at the time, then replay the surrounding period in `S10`, where the resolution chip reads 0.1 Hz and the playhead steps in 10 second increments. (FR8.2, FR8.3, FR8.4, FR8.5, FR8.7)

### F10 - Manage an account

Administrator opens `S13`, creates a drone operator through `D08`, then deactivates a former coordinator through `D09`, which states that the account can no longer authenticate and that its audit history remains. Both actions appear in `S14`. (FR10.5, FR10.6)

### F11 - Lose the connection

The WebSocket drops. `C08` turns the banner to disconnected. Cells continue ageing on the client, so within 10 s the entire map is gaps rather than a frozen last frame, and no risk band remains on screen. On reconnect a snapshot repaints the map and the banner returns to live. Nothing is ever shown as current that is not. (NFR6, SRS 3.4)

### F12 - Run a demo scenario

Administrator opens `D14`, selects `TRANSIT_GAP` at 4x, and F06 plays out on its own. Selecting `SAFEGUARD_REJECT` produces the F04 rejection variant on demand rather than by waiting. (SRS Appendix B)

***

## 10. Degraded, empty and error states

Every screen defines all four. A screen missing one is incomplete.

| Condition | Behaviour |
| - | - |
| Connecting | Skeletons, banner reads connecting. No numbers rendered as zero. |
| Live | Normal. |
| Degraded, updates arriving late | Banner names it. Cells age normally into stale and gap. |
| Disconnected | Banner names it. Cells age into gaps within 10 s. Actions requiring the server are disabled with the reason given. |
| Drone lost | Its footprint cells age into gaps like any others. `S06` marks its link offline. No special case in the map. |
| Risk engine unavailable | Density and flow continue. Risk reads unavailable across all surfaces, no band renders, and no alert is raised. Stated in the banner and in `S15`. |
| Phrasing model unavailable | Suggestions render from templates with a source badge. `S15` Services states it. |
| No site configured | Administrator routes to `S11`. Every other role sees an explanatory empty state naming who can configure it. |
| No results | Named per screen with a clear-filters action, never a blank region. |
| Request failed | The affected surface shows its error and the reason. No previously fetched value is left on screen presenting as live. |

***

## 11. Responsive behaviour and input

There are two layouts, both designed, neither reflowed from the other. There is no tablet layout.

**Mobile portrait, 390 x 844, the coordinator's and drone operator's device.** This is where the live map is actually read, on the ground, under time pressure, so it is designed first for the operational screens `S02` to `S10`. Navigation is a bottom bar within thumb reach. The alert rail is a bottom sheet with a count badge, dragged up over the map, so an alert is one gesture away without leaving the map. The zone strip is a horizontally scrolling row. `D01` and `D02` are bottom sheets rather than centred modals. `S11` presents one full-screen wizard step at a time.

**Desktop, 1440 x 900, the administrator's and IT's device.** This is where a venue is configured and where audit and health are read, so it is designed first for `S11` to `S17`. The nav rail is 200px with labels. The alert rail is persistent at 360px, and it and a cell inspector can be open together beside the map. Tables show every column without horizontal scrolling, and the wizard shows its step list beside the active step.

**Between the two**, layouts adapt at a single 768px breakpoint. Widths between the two reference sizes get the nearer layout stretched, which is acceptable because no target user is on one.

**Keyboard.** Every interactive element is reachable by `Tab` in visual order. On `S02`: arrows pan, `+` and `-` zoom, `A` focuses the alert rail, `L` toggles the legend, `Esc` closes drawers and dialogs. In every form and dialog, Enter submits and Esc cancels, implemented with a real `<form onSubmit>` calling `event.preventDefault()`, `type="submit"` on the primary button and `type="button"` on every other.

**Touch.** Targets at least 44px. The map's own gestures never conflict with the nav rail or sheet gestures.

**Colour.** Every one of the eight cell treatments is distinguishable by fill pattern and by its label as well as by hue, and the legend shows all three (NFR5).

***

## 12. Requirement to screen traceability

All sixty-four leaf requirements from `srs.md` Section 4. The same mapping fills the empty column in the SRS traceability matrix.

| Requirement | Screens and dialogs |
| - | - |
| FR1.1 | `S02`, `S07`, `D01` |
| FR1.2 | `S02`, `S06` combined feeds, `S07`, `D01` |
| FR1.3 | `D01` Features tab, `C03` |
| FR1.4 | `S07`, `S06` combined feeds |
| FR1.5 | `S02` zone strip, `S03` header, `S07` footprint count |
| FR2.1 | `S07` registration panel |
| FR2.2 | `S02` flow arrows, `D01` |
| FR2.3 | `S02`, `S07` transit banner, `D01` |
| FR2.4 | `D01` Features tab, `S04` attribution |
| FR3.1 | `S02`, `S07`, `S06` combined feeds, `S10` |
| FR3.2 | Top bar latency, `S15` Latency tab |
| FR3.3 | Top bar latency, `D01` age, `C07` |
| FR3.4 | `S02` stale treatment, `D01`, `C07` |
| FR3.5 | `S02`, `C02`, `C07` |
| FR4.1 | `D01` Features tab, `S04` |
| FR4.2 | `S02`, `S07` dwell panel, `D01`, `D07` |
| FR4.3 | `S02`, `S03`, `S05`, `D01` |
| FR4.4 | `C07`, `C10`, `S02`, `S03` |
| FR4.5 | `S02` zone strip, `S03` |
| FR4.6 | `S02` zone strip, `S03`, `S05`, `C06` |
| FR5.1 | `S02` rail and marker, `D05` |
| FR5.2 | `S04`, `S09`, `C04` |
| FR5.3 | `S02` rail card, `D05` |
| FR5.4 | `S02` rail, `S04` clear condition |
| FR5.5 | `D04`, `D05`, user menu mute |
| FR5.6 | `S02` rail, `S04`, `S08` |
| FR6.1 | `D01` observing drones, `S06` combined feeds overlap |
| FR6.2 | `S02` |
| FR6.3 | `S02` gap treatment, `D01`, `C07`, `D07` |
| FR6.4 | `C02`, `C03` series breaks, `C07` |
| FR6.5 | `S11` step 6, `S12` Zones tab |
| FR7.1 | `C05` in `S02` rail and `S04`, `S18` |
| FR7.2 | `C05` rationale |
| FR7.3 | `C05` safeguard list, `D02` |
| FR7.4 | `C05` rejected cards, `S18` |
| FR7.5 | `C05` no-safe-option state, `S18` |
| FR7.6 | `C05` source badge, `S15` Services, `S18` |
| FR7.7 | `D02` |
| FR7.8 | `D02`, `D03`, `S14` |
| FR8.1 | `S08`, `S09` |
| FR8.2 | `S08` resolution notice, `S10` resolution chip |
| FR8.3 | `S08` filter bar, `C09` |
| FR8.4 | `S10` |
| FR8.5 | `S10` resolution chip and stepped playhead |
| FR8.6 | `S09` outcome, `C05` countdown, `S18` verdict chip |
| FR8.7 | `S09`, `S04` from history |
| FR9.1 | `S11` step 1, `S12` Plan tab |
| FR9.2 | `S11` step 2, `S12` Grid tab, `D11` |
| FR9.3 | `S11` step 3, `S12` Attributes tab |
| FR9.4 | `S11` step 4, `S12` Attributes tab |
| FR9.5 | `S11` step 5, `S12` Exits tab |
| FR9.6 | `S11` step 6, `S12` Zones tab |
| FR9.7 | `S11` step 7, `S12` Thresholds tab, `D06`, `S03` |
| FR9.8 | `S11` step 8, `S12` Drones tab, `S06`, `D07` |
| FR9.9 | `S14`, save toasts in `S11` and `S12` |
| FR10.1 | `S01`, `D12` |
| FR10.2 | `S17`, `S13` roles panel, `C11` |
| FR10.3 | Nav rail, `S16` |
| FR10.4 | IT navigation set, IT landing note on `S15`, `S17` |
| FR10.5 | `S13`, `D08`, `D09` |
| FR10.6 | `S14` |
| FR11.1 | `S19` |
| FR11.2 | `S19` export |
| FR11.3 | `S19` no-data states |

Non-functional requirements: NFR1 top bar and `S15`; NFR2 Section 11 and `D13`; NFR3 the alert rail design in `S02`; NFR4 `S08`, `S09`, `S14`; NFR5 Section 11 and `C07`; NFR6 Section 10; NFR7 `S01`, `D12`, `S16`; NFR8 `C01` renders an uploaded image with no tile provider; NFR10 `C02` renders 2400 cells with only observed cells re-rendering per tick.

NFR9 is the one requirement with no surface in this document, and deliberately so. It fixes numeric accuracy targets for the density and risk models at Eval 1 and Eval 2, which is a model-evaluation obligation with nothing for the front-end to render. It is recorded here so that the absence reads as a decision rather than as the omission Section 1 calls a defect.

***

## 13. The proposal's eight named views

The proposal Section 14.7 names eight front-end views. Each is locatable in this design, and none is an orphan.

| Named view | Where it lives |
| - | - |
| Live site plan | `S02` |
| Per-drone view | `S07` |
| Combined feeds | `S06` Combined feeds tab |
| Risk timeline | `S05`, and `C03` inside `S03`, `S04`, `S09` and `D01` |
| Suggestions | `S18`, and `C05` in the `S02` alert rail and in `S04` |
| Event history | `S08`, `S09` |
| Replay | `S10` |
| System health | `S15` |

***

## 14. Boundaries this design deliberately does not cross

Restated from SRS 2.6, because the fastest way to lose the defence is a screen that implies a capability the project ruled out.

- No screen actuates a barrier, gate, sign or instruction. `D02` says so in words.
- No screen offers ticketing, capacity planning, scheduling, entrance design or resource allocation.
- No screen stitches imagery. `S06` Combined feeds says so in words.
- No screen offers a fifth zone. `S11` step 6 and `S12` Zones say so in words.
- No screen loads anything needing an API key, an account or payment details. Satellite imagery comes from Esri World Imagery, which asks for none of them.
- No screen plays video.
- No screen exports through a hosted service. `S19` generates its export in the browser.
- No screen forecasts. `S19` reports what happened and says so in words.
