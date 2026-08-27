# Sentinel - Project Understanding

Source of truth: `docs/Proposal-doc_Version_FINAL.docx` (FYP Proposal, "Sentinel - Stampede Detection System").
Purpose of this file: a single, in-depth reference that every later step of `roadmap.md` builds on (CLAUDE.md, SRS, design, wireframes, front-end build).

***

## 1. Identity and immediate goal

| Item | Value |
| - | - |
| Project name | Sentinel |
| Subtitle | Crowd Control and Stampede Early Signs Detection System |
| Supervisor | Sir Saad Salman |
| Co-supervisor | Dr Ahmed Raza Shahid |
| Team | Ahmar Ali (23p-0686), Abdul Mahid (23i-0828), Ahmed Ijaz (23i-0644) |
| Primary case study | Hajj, the Mina / Jamarat Bridge corridor (2015 stampede) |

**One-line description.** Sentinel is a multi-drone, real-time crowd monitoring and early-warning system: it estimates crowd density and crowd movement from aerial footage, fuses both into a per-zone stampede risk score, places every measurement on one shared site map, and hands ground coordinators ranked, explained crowd-dispersion suggestions before a stampede starts.

**What we are building right now (roadmap context).** A proof-of-concept front-end only: a complete, working, clickable React UI with no backend and no real ML. It is presented at the proposal defence. Every screen must look and behave as if the full pipeline were live, driven by mock data. No functionality or backend logic is in scope for this repository at this stage.

***

## 2. The problem, in the project's own terms

A stampede is not a sudden event with no warning. It is preceded by measurable precursors: density rising, crowd streams converging or competing for the same space, and movement breaking into stop-start pulses (crowd turbulence) as people are pushed from behind while blocked in front. The failure is not that these signals are undetectable; it is that no system detects them, assembles them site-wide, and delivers them to the people who could act in time.

The proposal breaks the gap into three parts:

1. **Ground-based monitoring is reactive, not predictive.** CCTV operators and on-ground staff usually notice a problem while it is happening or after. By the time it is obvious at ground level, the window for pre-emptive action has closed.
2. **Coverage is fragmented.** Fixed cameras leave blind spots, and no practical number of them covers a venue with several entrances, approach routes and internal bottlenecks. Fixed cameras also cannot move to where the crowd is building.
3. **There is no multi-zone integration or per-zone risk analysis.** Existing deployed products (Baseer, Sawaher) are fixed-camera systems with no per-zone risk score, which makes reasoning about where to send people much harder.

Sentinel attacks all three at the monitoring layer: early detection instead of aftermath observation, coordinated aerial coverage of several zones, and multi-zone integration with per-zone risk plus dispersion suggestions.

***

## 3. Stakeholders and the roles they imply

The stakeholder table maps almost one-to-one onto the roles the UI must support (FR10, RBAC).

| Stakeholder | Relationship to Sentinel | UI implication |
| - | - | - |
| On-ground crowd management coordinator | Primary operator. Watches for early signs in a zone, receives dispersion suggestions and guidelines, physically guides attendees. | Needs the live map, alerts and suggestions. Non-technical, under time pressure. Mobile / PWA usage is realistic. |
| Event administration team | Supervises crowd management through the web app. | Needs the site-wide picture, history, auditability, and configuration (zones, thresholds, drone assignment). |
| Pilgrims, attendees, public | Protected by the system, never users of it. | No UI. They are the consequence, not an actor. |
| Drone operators | Operate the drones (sensing layer) that supply the footage. | Needs drone status, per-drone feed view, observe and transit state, system health. |
| IT team | Deployment and maintenance, upholds confidentiality, integrity and availability. | Needs system health, accounts, roles, logs. |

At minimum the front-end must distinguish a **coordinator**, an **administrator**, and (arguably) a **drone operator** and **IT** view. Settled in Step-2: all four are roles, with the permission matrix in `srs.md` Section 2.4.

***

## 4. What the system actually does: the four-tier pipeline

The proposal is strict that the tiers run in order and each depends on the previous one. This ordering is also the CCP argument ("interdependence between parts").

**Tier 1 - Perception (per drone, per frame)**
- Estimate crowd density per frame, producing a density map.
- Compute crowd movement (direction and speed) per region using optical flow.
- Render both together as a wind-map style overlay: shading for magnitude, arrows for direction, within a defined latency budget.

**Tier 2 - Risk (per cell, per sliding window)**
- Engineer precursor features over a sliding time window: density, spatial density gradient, rate of change, flow convergence, counter-flow, speed and velocity variance, stop-start pulses, exit occupancy.
- Classify into a normalised risk score from 0 to 1.
- Flag elevated-risk cells and zones at a threshold, and log the features that triggered the flag (feature attribution, so an alert is always explainable).

**Tier 3a - Fusion (site-wide)**
- Every worker writes into the same georeferenced cell grid, so fusion is a property of the data rather than an algorithm.
- Two to four zones are validated.
- Cells with no fresh observation stay grey gaps. They are never interpolated and never shown as last-known-good.

**Tier 3b - Decision support**
- A deterministic rule-based ranker produces the actual ranked dispersion options, using neighbouring-cell density and flow, the walkable-neighbour adjacency graph, and exit capacities set at venue setup.
- Safeguards reject a route if it passes through cells above the density threshold, if it would push a neighbouring cell over its own threshold, or if any cell on it is stale.
- A small local open-weight language model only phrases the ranked options in readable text. It decides nothing, and a plain-text template fallback exists for every suggestion so the system works with the model switched off.
- A human coordinator always confirms before anything is acted on.
- After a suggestion is issued, the risk trajectory of the affected cells is logged for a fixed follow-up window, so history shows whether the action was followed by a fall in risk (outcome tracking).

***

## 5. Domain model and vocabulary (the part the UI must get right)

These terms come straight from the proposal's architecture section and glossary. The front-end must use them consistently; getting them wrong makes the demo incoherent.

- **Cell** - a small fixed square of ground in a site-wide grid. It is the unit every measurement is stored against. This is the single most important design decision in the system: measurements belong to ground cells, not to drones, which is exactly what allows drones to move.
- **Zone** - a named group of cells, used for display, alerting and reporting. Zones are a presentation layer over the cell grid. Two to four zones are validated.
- **Cell store** - the time-series record, one entry per cell per timestamp. It is the single source of truth that both the risk engine and the dashboard read from.
- **Risk score** - a normalised 0 to 1 value expressing how close an area is to stampede conditions. Computed per cell, aggregated per zone.
- **Coverage gap** - an area with no recent observation from any drone. Shown explicitly as grey, never guessed.
- **Freshness** - how long ago a cell was last updated. Decides whether a value is trustworthy or must be shown as stale.
- **Dwell** - the length of continuous time a drone has observed the same ground.
- **Dwell gating** - a cell is scored only when its history covers the full sliding window; otherwise the system returns "not enough dwell" rather than a number. An unknown cell and a safe cell are not the same thing.
- **Observe state** - the drone is holding position. Density, flow, window features and risk are all produced.
- **Transit state** - the drone is flying to a new area. Only density is written; flow from a fast-moving camera is unreliable, so risk shows "not enough dwell".
- **Footprint** - the ground area a drone currently sees, found by projecting the image corners onto the ground from the drone pose. Purely geometric.
- **Wind-map overlay** - the combined density-plus-movement visualisation (shading for density, arrows for flow), named after a weather wind map.
- **Flow convergence** - streams moving into the same space; strongly negative divergence over a cell's 3x3 neighbourhood. A core precursor.
- **Counter-flow** - two dominant flow directions more than 90 degrees apart meeting at a boundary.
- **Stop-start pulses / crowd turbulence** - jerky, wave-like motion from being pushed while blocked. The third precursor.
- **Exit occupancy** - measured throughput through exit cells against the capacity configured at setup.

### Architectural rules that are also UI rules

The proposal states four rules the architecture enforces. Three of them are directly visible in the interface and must be honoured by the mock front-end:

1. **Dwell before risk** - show "not enough dwell", not a fabricated score.
2. **Drone state decides the output** - a transiting drone contributes density only; the UI must show why risk is missing.
3. **Gaps stay gaps** - grey, explicitly labelled, never interpolated, never "last known good".
4. Drift is removed before measurement (frame registration), so drone movement is never counted as crowd movement. This one is internal, but it explains why a per-drone view may show a reference frame or registration status.

**Design consequence: honesty over completeness.** Sentinel's credibility rests on never showing a number it cannot justify. Every unknown state (gap, stale, not enough dwell, transit) needs its own distinct, deliberate visual treatment in the front-end. A prettier map that hides these states would misrepresent the system.

***

## 6. Functional requirements (verbatim intent, plus front-end reading)

| ID | Requirement | Tier | What the PoC front-end must show |
| - | - | - | - |
| FR1 | Estimate crowd density per frame, producing a density map | 1 | Density overlay on the map and in the per-drone feed view |
| FR2 | Compute movement direction and speed vectors per region | 1 | Flow arrows / vector field |
| FR3 | Display density and movement as a wind-map overlay within a defined latency | 1 | The combined overlay, plus a visible latency or freshness indicator |
| FR4 | Compute per-zone risk score on a sliding window (density change, flow convergence, speed variability) | 2 | Risk value per cell and per zone, and a risk-over-time timeline |
| FR5 | Flag elevated-risk zones at threshold and log the triggering features | 2 | Alert objects that carry a feature-attribution breakdown, answering why it fired |
| FR6 | Fuse all zones onto a shared coordinate map, marking uncovered areas as gaps | 3a | One site map with grid, zones, footprints and grey gaps |
| FR7 | Generate ranked, explained suggestions via the decision-support agent on elevated risk | 3b | Ranked suggestion cards with rationale, safeguards and a confirm action |
| FR8 | Persistent, searchable event / alert / suggestion history | - | History and replay views with search and filters |
| FR9 | Admin configuration of zones, drone and camera assignment, and thresholds, with no code changes | - | A configuration area: site setup, cell grid, zones, exits and capacities, thresholds, drone assignment |
| FR10 | User authentication and role-based access control | - | Login, roles, permission-gated navigation, account management |

Note that FR8, FR9 and FR10 are pure application requirements with no ML behind them. They are therefore the parts of the PoC that can be made to feel most complete, and they carry a lot of the demo.

***

## 7. System architecture and data flow

```
Drones (sensing layer, PX4 + Gazebo SITL in scope; real hardware out of scope)
  -> one perception worker per drone (Celery task)
       density per frame (DM-Count)
       flow per region (Farneback, after frame registration with ORB + RANSAC)
       footprint projection: image corners -> ground, via drone pose
       emits a small per-cell summary roughly once per second (never streams video)
  -> Redis (message channel, Channels layer, live cell state)
  -> Django + DRF backend, cell store in PostgreSQL
       full-rate history for the recent window, downsampled beyond it
  -> Risk engine (Tier 2, XGBoost on window features, dwell gated, SHAP attribution)
  -> Fusion on the shared cell grid (Tier 3a)
  -> Rule-based ranker + safeguards (Tier 3b), phrased by a local model via Ollama
  -> Django Channels pushes live scores, alerts and suggestions over WebSockets
  -> React PWA dashboard (Leaflet map, Recharts timeline, Tailwind)
```

Two properties of this flow shape the UI strongly:

- **Push, not poll.** Live scores, alerts and suggestions arrive over WebSockets. The front-end is an event-driven live display, so the mock must simulate a stream (ticking updates, arriving alerts) rather than a static snapshot.
- **Roughly one update per second per drone, per cell.** The data granularity is a per-cell summary at about 1 Hz, not video. The dashboard is a map-and-metrics application, not a video wall, although a per-drone view with the overlay is part of the scope.

***

## 8. Tech stack

Everything is open source, openly licensed, or a free tier that needs no payment details. **No paid API and no paid cloud service anywhere.** That constraint is explicit in the proposal and should be treated as a hard rule for every later decision, including deployment (Step-8).

### 8.1 Front-end (the part this repository builds)

| Technology | Role |
| - | - |
| React, built as a PWA | The dashboard. Chosen over Django templates because the live map and the timeline scrubber need component-level state. |
| Vite | Build tool and dev server. |
| Tailwind CSS | Styling. |
| Leaflet | Draws the site plan image with the cell grid, zones, drone footprints, gaps and alerts layered on top. No tile provider, no API key. |
| Recharts | Risk-over-time charts and timelines. |

Named front-end views in the proposal: live site plan, per-drone view, combined feeds, risk timeline, suggestions, event history, replay, and system health.

### 8.2 Backend (mocked for the PoC, but the UI must match its shape)

Django, Django REST Framework, Django Channels (WebSockets), Celery (one worker per active drone feed), Redis (message channel, Channels store, live cell state), PostgreSQL (cell history, zones, alerts, suggestions, accounts). Django's built-in admin covers cells, zones, thresholds and drones for FR9, and built-in auth and roles cover FR10.

### 8.3 Perception (Tier 1)

Python, NumPy, PyTorch. DM-Count for density, trained on DroneCrowd. DM-Count is a density-regression model: it predicts a per-pixel density map whose values sum to the number of people in the frame, rather than drawing one bounding box per person the way an object detector does. That distinction is the reason for the choice. In aerial footage of a packed area each person covers only a few pixels and is partly hidden behind the people around them, so a detector fails to find many of them and undercounts the crowd. The undercount grows worse as crowd density rises, which means the detector is least reliable at exactly the densities where stampede risk appears. Density regression never has to tell one person from the next, so its accuracy holds as the crowd packs together. OpenCV for frame reading, feature matching, homography, Farneback optical flow and overlay rendering. Frame registration via ORB plus RANSAC removes hover drift so it is never counted as crowd movement. Footprint projection maps image corners onto ground cells. Farneback is chosen over a learned flow model on cost: it runs fast enough on CPU after downscaling, where RAFT needs roughly half a second per Full-HD frame on a datacentre GPU. A short exponential moving average smooths per-cell density before feature extraction. ONNX Runtime is an optional CPU inference optimisation if latency is tight.

### 8.4 Site setup, run once per venue

YOLO (AGPL-3.0) makes a setup-time pass over sample aerial frames to propose exits, barriers and obstructions, which are projected onto the grid as static cell attributes. It never runs in the live loop. The administrator then confirms or corrects those proposals and sets exit capacities. Manual annotation is the guaranteed path; YOLO only pre-fills it. **This is what makes FR9 substantial**, and it implies a real venue-setup flow in the UI: upload site plan, define grid, review proposed exits and barriers, correct them, set capacities.

### 8.5 Risk model (Tier 2)

pandas and scikit-learn for window features, splitting and metrics. XGBoost as the risk classifier over per-cell window features, with lag features carrying the time pattern so no separate sequence model ships. SHAP explains which features caused a flag, logged with the alert (this is what FR5 needs). A simple threshold model from published density bands is kept as a comparison baseline and a backup.

### 8.6 Fusion and decision support (Tiers 3a and 3b)

Coordinate-based fusion on the cell grid, no image stitching. A rule-based ranker in plain Python does the ranking. Safeguards reject unsafe or stale routes. A local open-weight model via Ollama (Phi-4-mini-instruct under MIT, or a Qwen model under Apache-2.0) phrases the options, with a grammar-constrained decoder forcing valid structured output. A template fallback keeps every suggestion working with the model off.

### 8.7 Data

DroneCrowd (112 aerial clips, 33,600 frames at 1920x1080, 4.8M head points, 20,800 tracks) is the main density training and validation set, and its head trajectories are the reference for validating flow. VisDrone adds aerial video for testing density across heights and angles and labels the classes used in the setup pass. DLR-ACD (33 large aerial images, 226,291 point annotations, 285 to 24,368 people per image) is the high-density stress test, stills only. Crowd-11 validates the movement side of the risk model. UMN MHA is a sanity check for the movement signal only. Elevated steep-angle CCTV footage substitutes for drone footage in the perception layer where drone footage is unavailable.

### 8.8 Simulation

PySocialForce (MIT) is the crowd engine and the main source of labelled risk-model training data, since no public dataset labels warning signs at the relevant density. Noise matched to the measured density error is injected before training. Gazebo Harmonic plus PX4 SITL provide several simultaneous drone views, the pose stream that projection needs, and transit cases.

### 8.9 Evaluation only (never in the real-time loop)

RAFT-Small (to quantify the accuracy cost of Farneback), P2PNet (offline head localisation to validate people-per-square-metre calibration), STANet and STNNet (the published DroneCrowd baseline, reported honestly as about 2.6 MAE and 8.3 MSE better than DM-Count, with DM-Count justified on cost and simplicity), YOLO with ByteTrack (pseudo-trajectories to cross-check the flow field), and LSTM (a documented ablation against XGBoost with lag features).

### 8.10 Tooling

Docker Compose brings the whole stack up together. Git, GitHub, pytest (including the model-off path), and Colab / Kaggle free GPU for training.

***

## 9. Scope

### In scope
- Real-time density estimation and movement analysis from aerial drone footage, validated on VisDrone and DroneCrowd.
- An early-signs risk model combining density and movement features, validated against Crowd-11 and UMN MHA.
- Separate per-zone display and a combined display of two to four zones on a single screen, with uncovered areas shown explicitly as gaps.
- A decision-support agent producing ranked, explained dispersion suggestions from the per-zone risk signal.
- A full-stack dashboard covering live monitoring, alerting, suggestions, drone and zone configuration, and event history.
- Validation through simulation (Gazebo and PX4 SITL), with elevated steep-angle CCTV footage as a perception-layer substitute where drone footage is unavailable.
- A Hajj and Mina 2015 case-study framing used to motivate and structure evaluation scenarios.

### Out of scope
- Any form of physical crowd control. Sentinel suggests; it does not control barriers, signage, or where people stand.
- Deployment, testing or validation during Hajj.
- Deployment on real drone hardware, and field testing.
- General-purpose crowd management: capacity planning, scheduling, entrance and exit design, ticketing, resource allocation.
- Stitching images or video across overlapping feeds. Fusion is by coordinates, for non-overlapping zones.
- Zone coordination without GPS or without communication.
- A dynamic, unlimited number of zones. A fixed, small number (two to four) is validated.
- Production-grade security hardening, penetration testing, or compliance certification.

**How this binds the front-end.** The UI must never imply an out-of-scope capability. No control of barriers or signage, no ticketing or capacity planning module, no stitched panoramic video, no "add unlimited zones" affordance that contradicts the two-to-four validation, and every suggestion must be advisory with an explicit human confirmation step.

***

## 10. Positioning and what makes Sentinel different

Surveyed in three tiers: national-scale deployments (Baseer and Sawaher by SDAIA, the Jamarat Smart Crowding Management System, the Grand Mosque QR density service), commercial vendors (IntelliSee, Vaidio, Visionplatform.ai, intuVision, Gorilla IVAR, generic YOLO builds), and academic work (STANet, FRVCC, Castellano et al., Ali and Shah's Jamarat flow segmentation).

Sentinel is the only entry in the comparison table marked yes across all seven axes: drone-based, early detection, density-plus-flow fusion, multi-zone map fusion, explainable decision support, open and reproducible, and real-time alerting. The proposal is careful and honest about the claim: each underlying technique is well established, and the contribution is the combination and its staged engineering, not a claim to match Baseer's scale.

**Demo consequence.** The defence audience will be looking for exactly those seven differentiators. The front-end should make the drone basis, the precursor-based early warning, the combined overlay, the multi-zone fused map with honest gaps, and the explainable ranked suggestions all immediately visible.

***

## 11. Non-functional characteristics that matter to the UI

- **Latency budget.** A fixed maximum end-to-end delay between capture and display constrains model and hardware choices throughout Tier 1. The UI should surface freshness and latency rather than hide them. The numeric budget is not stated in the proposal (see Section 14).
- **Trust and false alarms.** The CCP statement names the core conflict: a missed warning is a life-safety failure, a false alarm erodes coordinator trust. The interface has to help a coordinator judge an alert quickly, which is why feature attribution is logged with every flag.
- **Non-technical operator under time pressure.** Suggestions must be readable and actionable by someone who is not an engineer and has seconds, not minutes.
- **Auditability.** Authorities need history: what fired, why, what was suggested, whether it was confirmed, and what happened to risk afterwards.
- **PWA.** The dashboard is packaged as an installable progressive web app with two first-class layouts: mobile portrait at 390 x 844 for the on-ground coordinator and drone operator, and desktop at 1440 x 900 for the administrator and IT. Neither is a reflow of the other, and there is no tablet layout.
- **Roles.** Permissions are separated by role (FR10). The proposal's glossary names coordinator, administrator and IT, and its stakeholder table adds drone operators; all four are roles, with the permission matrix in SRS Section 2.4.
- **CIA principles.** The IT team's responsibility, though production-grade hardening is explicitly out of scope.

***

## 12. Timeline (context only, not this repository's work)

- **Eval 1 - Tier 1 complete:** density model trained and validated on DroneCrowd, flow module validated, wind-map overlay rendering, proof of concept executed.
- **Eval 2 - Tier 2 complete:** window feature engineering, risk model trained, validated on Crowd-11 and UMN, numeric success criteria (MAE, precision and recall) locked.
- **Eval 3 - Tier 3a complete and 3b started:** multi-zone georeferenced fusion across two to four simulated zones, gaps shown explicitly, backend and front-end fully wired for live multi-zone data.
- **Eval 4 - full system and buffer:** Tier 3b finalised with safeguards and outcome tracking, end-to-end validation on a Jamarat-style simulated scenario, dashboard and backend deployed to a hosted environment for the defence demo (software only), and the remaining time reserved for integration testing, latency tuning, bug fixes and rehearsal, with no new feature work.

***

## 13. What this means for the proof-of-concept front-end

Distilled implications, to be turned into requirements in Step-2 and screens in Step-3:

1. **The map is the product.** A Leaflet site plan carrying a cell grid, zone boundaries, drone footprints, the density-plus-flow wind-map overlay, alerts and grey gaps is the centre of gravity. Everything else supports it.
2. **Two fields per cell, not one.** A cell carries an observation state of observed, not-enough-dwell, stale or gap, and carries a risk band of normal, watch, elevated or critical only when it is observed. Each of the four observation states and each of the four risk bands needs its own distinct and unambiguous visual treatment. Splitting the two fields makes an unknown cell carrying a risk score unrepresentable rather than merely forbidden. This supersedes the earlier five-cell-states framing, which was written before the bands were fixed; see SRS Section 2.3 and decision D9.
3. **Live means live.** Mock data must tick: values update, alerts arrive, drones move between observe and transit, footprints shift. A frozen screenshot undersells the system.
4. **Every alert answers why.** Feature attribution is a first-class part of the alert UI, not a detail view nobody opens.
5. **Every suggestion is ranked, explained, safeguarded, and confirmed by a human.** The confirm step is a requirement, not a nicety.
6. **Outcome tracking closes the loop.** History should show what happened to risk after a suggestion was issued.
7. **Configuration is a real, substantial flow.** Site plan upload, grid definition, zone naming, exit and barrier review with capacities, thresholds and drone assignment (FR9) is a genuine multi-screen area, and it is fully buildable without any ML.
8. **Roles gate the interface.** Coordinator, administrator, drone operator and IT see different things (FR10).
9. **Two to four zones.** The demo should show that number, matching the validated scope.
10. **Vocabulary discipline.** Cell, zone, dwell, footprint, freshness, gap, observe, transit, convergence, counter-flow, risk score. Using the proposal's own terms in the UI is what makes the demo read as one coherent system.

***

## 14. Observations, gaps and assumptions

Recorded here so they were settled deliberately in Step-2 rather than guessed at during the build. Items 1, 2, 6, 7 and 8 were open questions and are now **closed by the SRS**, `srs.md` in the repository root. Every fixed number lives in SRS Section 2.7, and the reasoning behind each decision in SRS Appendix C. Items 3, 4 and 5 were observations about the proposal document rather than open questions, and stand as written.

1. **The latency budget is never given a number.** FR3 says "within defined latency" and the glossary defines the term, but no value appears. **Resolved:** 2000 ms end to end, capture to display, which is also the freshness boundary. SRS Section 2.7, decision D1.
2. **Risk thresholds are unspecified.** The risk score is 0 to 1 and there is an elevated threshold, but no bands are stated. **Resolved:** four bands with boundaries at 0.40, 0.70 and 0.85 (normal, watch, elevated, critical); 0.70 is the default alert threshold and is configurable per zone under FR9. SRS Section 2.7, decision D2.
3. **Section 9 and Section 14 of the proposal disagree on model choices.** The Eval 1 and Eval 2 plans list P2PNet, RAFT and LSTM as pipeline components, while Section 14 places all three in evaluation only and ships DM-Count, Farneback and XGBoost. Section 14 is the later and more detailed statement, so it is treated as authoritative here. Carried into SRS Section 1.3.
4. **The suggestion-phrasing model is named inconsistently.** Section 14.6 says Phi-4-mini-instruct or Qwen3-4B, while the glossary says Qwen2.5 3B Instruct. Immaterial to the front-end.
5. **Section numbering in the document is off.** The table of contents lists "13. Tools and Technologies", but the body has System Architecture at 13 and Tools at 14, and there is a Section 16 Appendix not listed in the contents. Worth fixing in the document, irrelevant to the build.
6. **The exact role list is not fixed.** FR10 says role-based access control and the glossary names coordinator, administrator and IT, while the stakeholder table also includes drone operators. **Resolved:** four roles, coordinator, administrator, drone operator and IT, with the permission matrix in SRS Section 2.4. Decision D3.
7. **The alert delivery channel is unstated.** Whether alerts are in-app only, or also push, SMS or audible, is not specified. **Resolved:** in-app always, browser push when the installed app is backgrounded and the user has opted in, and an audible tone for elevated and critical. SMS, email and radio are excluded because every gateway for them requires payment details. SRS FR5.5, decision D4.
8. **The number of drones is not fixed**, only the number of zones (two to four). A drone is not permanently tied to a zone, since measurements belong to cells and drones move, so the UI must not assume a one-drone-per-zone mapping. **Resolved:** the specification leaves the count unbounded and the demo fixes four drones over three zones, deliberately non-matching so that the cell-based architecture is visible on screen. SRS Section 2.7, decision D5.

### 14.1 Further decisions taken in Step-2

The proposal states these concepts without numbers, so the SRS fixed them: 5 m cells over a 300 m by 200 m reference site (D6), a 30 s sliding window and dwell gate (D7), freshness boundaries at 2 s and 10 s (D8), observation state and risk band as two orthogonal fields (D9), a 10 minute outcome follow-up window (D10), up to three ranked suggestions including rejected ones (D11), one hour of full-rate history and 30 days downsampled (D12), zone risk as the maximum of its observed cells always shown with coverage (D13), and alert clear hysteresis of 0.05 held for 30 s (D14). Full reasoning for each is in SRS Appendix C.

### 14.2 Decisions taken in Step-4

The Step-4 mapping check found three points where `srs.md` and `design.md` could not both be right, and each was settled rather than left to the build.

1. **The Drone Operator sees the whole live map, alert rail included, and may acknowledge an alert.** SRS Section 2.4 had denied the role any view of alerts while `design.md` gave it the screen that carries them. An operator who knows where an alert fired can reposition a drone toward it, so the access was granted rather than the screen cut. Suggestions and their confirmation stay closed to the role. SRS decision D19.
2. **The roles reference is its own screen, `S17`, shared with the accounts screen.** FR10.4 gives IT a read-only view of who may do what, but the accounts screen is administrator-only, so the reference could not live there alone. SRS decision D20.
3. **The estimated people count is surfaced, over observed cells only.** FR1.1 defines a density map whose values sum to a people count, and nothing in the interface had shown that sum. Restricting it to observed cells is what keeps it honest, since a figure spanning unobserved cells would be interpolation expressed as a number. Recorded as SRS FR1.5, decision D21.
