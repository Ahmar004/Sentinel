# Sentinel - Wireframes

Version 1.0. Implements `design.md`, which implements `srs.md`. This is Step-5 of `roadmap.md`.

The wireframes themselves are static HTML files in `wireframes/`. Open `wireframes/index.html`
in any browser; every file also opens on its own by double-click. Nothing is fetched, no font
or script is loaded from a network, and no build step is involved, which is the same
no-paid-service constraint the product itself is built under.

This document is the written half. It holds the conventions the frames obey, the canonical
dataset every frame transcribes, the frame register, and the traceability from frame back to
requirement. Step-6 builds from both halves together.

***

## 1. What is greybox and what is not

Everything in these wireframes is grey: layout, typography, controls, charts. One thing is not.

The four observation states and the four risk bands render in their real colour, fill pattern
and label. Those eight treatments are the requirement itself (NFR5), and the honesty invariant
cannot be reviewed if the states it distinguishes are greyed out along with everything else.
A reviewer should be able to argue about the eight treatments and about nothing else.

`wireframes/W00-conventions.html` is the visual contract. Every other frame inherits from it.

## 2. Three channels for three dimensions

`design.md` said the risk band draws as "cell outline or fill", while density shading also
fills. Both cannot own the fill. The wireframes resolve this by giving each independent fact
its own independent visual channel:

| Channel | Carries | Encoding | Survives greyscale by |
| - | - | - | - |
| Fill lightness | `densityPerSqM` | Five-step monochrome ramp, dark equals dense | lightness |
| Fill pattern | `observationState` | Solid, diagonal hatch, cross-hatch, dense crosshatch | pattern |
| Outline | `riskBand` | Colour plus weight plus line style, drawn only when `OBSERVED` | weight and style |

Because the channels are independent, a cell reads as "dense, observed, and only in the watch
band" in one glance rather than forcing a layer toggle. A viewer who cannot distinguish the
hues still separates all eight, because pattern and outline weight carry the distinction on
their own, and every cell also carries a text label (NFR5).

| Treatment | Fill | Pattern | Outline | Also carries |
| - | - | - | - | - |
| `OBSERVED` + `NORMAL` | density ramp | solid | 1px solid green | risk score |
| `OBSERVED` + `WATCH` | density ramp | solid | 2px dashed amber | risk score |
| `OBSERVED` + `ELEVATED` | density ramp | solid | 3px solid orange | risk score |
| `OBSERVED` + `CRITICAL` | density ramp | solid | 4px double red, inner ring | risk score |
| `NOT_ENOUGH_DWELL` | density ramp | 45 degree hatch | none | "18 s of 30 s", never a score |
| `STALE` | desaturated | cross-hatch | none | a mandatory age badge |
| `GAP` | flat grey | dense crosshatch | none | nothing. No density, no flow, no risk |

A flow arrow is drawn only where `flow` is not null, with direction from `flow.dirDeg` and
length from `flow.speedMps`. A zero-length arrow and a default-direction arrow are never drawn,
because either would invent a measurement (FR3.5).

## 3. Two viewports, both designed

There is no tablet layout. `design.md` Section 11, `srs.md` Section 2.5 and `CLAUDE.md` were
corrected in the same change that produced these wireframes.

| Viewport | Size | Whose device | Designed first for |
| - | - | - | - |
| Mobile portrait | 390 x 844 | Coordinator and Drone Operator, on the ground, under time pressure | `S02` to `S10` |
| Desktop | 1440 x 900 | Administrator and IT | `S11` to `S17` |

Neither is a reflow of the other. On mobile, navigation is a bottom bar within thumb reach, the
alert rail is a bottom sheet with a count badge, and the setup wizard shows one full-screen step
at a time. On desktop, the nav rail is 200px with labels, the alert rail is persistent at 360px
and can be open beside a cell inspector, and the wizard shows its step list beside the active
step. Layouts adapt at a single 768px breakpoint.

Mobile is also the capacity reference for NFR10, because it is the weakest hardware and the
coordinator's actual device, so a target met there is met on desktop as well.

## 4. Frame anatomy

Every frame file carries, outside the wireframe itself, a header strip naming its frame ID, its
`design.md` ID, its viewport, the role viewing it, its state and its batch. The wireframe sits
in a `.device` box at exactly 390 x 844 or 1440 x 900.

Numbered blue markers sit on the wireframe and match numbered notes in the right margin. Every
note names the requirement it satisfies. A wireframe that cannot name its requirement is
decoration, so the notes carry the argument for the design and not merely a label for it.

The only interactive behaviour in the whole set is tab switching, so that a tabbed surface can
be reviewed without one file per panel. There is no routing, no data and no timers. Step-5 is a
design review, not a build.

Map grids are drawn from a fixed two-character-per-cell map string rather than hundreds of
hand-written elements, so every frame showing the same moment draws exactly the same cells.
Character one is the state or band, character two the density bucket:

```
o normal   w watch   e elevated   c critical
d not-enough-dwell   s stale   g gap   x off-grid
```

***

## 5. The canonical dataset

Every frame transcribes this. Numbers agree across `S02`, `S03`, `S04`, `S09` and `D01`, so the
set reads as one coherent moment rather than as fifty unrelated pictures. Step-6 seeds the mock
data layer from this table.

### Site and grid

| Field | Value |
| - | - |
| Site | Mina - Jamarat Bridge, central deck section |
| Extent | 300 m by 200 m |
| Cell size | 5 m by 5 m, 25 square metres |
| Grid | 60 columns by 40 rows, 2400 cells |
| Plan image | `jamarat-plan.svg`, drawn at one unit per ground metre, uploaded by `s.iqbal` |
| Scale | Set by drawing a known 50 m distance across the south stand |
| Clock | 14:03:12 |
| Latency | 1.2 s measured, 1.7 s at the 95th percentile, against a 2000 ms budget |

### Zones

| Zone | Risk | Band | Observed | Dwell | Stale | Gap | People | Peak cell |
| - | - | - | - | - | - | - | - | - |
| A West Deck Approach | 0.31 | `NORMAL` | 656 | 32 | 24 | 88 | ~1,480 | `C-012-034` at 0.31 |
| B Jamrat al-Aqaba | 0.78 | `ELEVATED` | 192 | 72 | 56 | 480 | ~410 | `C-031-022` at 0.78 |
| C Jamrat al-Wusta | - | `NOT_ENOUGH_DWELL` | 0 | 372 | 0 | 228 | no estimate | none |

Zone C carries a dash and not a zero. Every cell in it is still filling its 30 s dwell window,
so the zone has no score at all. Rendering it as 0.00 would claim the Wusta basin is safe.

### Exits, drones and users

| Exit | Cells | Capacity | Current |
| - | - | - | - |
| E1 Exit W1 to tunnels | 8 | 1200 people/min | 780 |
| E2 Exit E2 to camps | 6 | 900 people/min | 240 |

| Drone | Label | State | Dwell | Link | Battery | Registration |
| - | - | - | - | - | - | - |
| D-01 | Aqaba basin high | `OBSERVE` | 4m12s | `ONLINE` | 78% | locked, 412 inliers |
| D-02 | West deck | `OBSERVE` | 9m03s | `ONLINE` | 64% | locked, 380 inliers |
| D-03 | Roving | `TRANSIT` | - | `ONLINE` | 91% | searching, 0 inliers |
| D-04 | East deck | `OBSERVE` | 2m41s | `DEGRADED` | 43% | locked, 291 inliers |

D-02 and D-04 both observe cells `C-020-030` to `C-022-030`, which is where fusion by
coordinates becomes visible (FR6.1).

| User | Role | Status |
| - | - | - |
| `a.rahman` | `COORDINATOR` | active |
| `s.iqbal` | `ADMINISTRATOR` | active |
| `m.tariq` | `DRONE_OPERATOR` | active |
| `n.hassan` | `IT` | active |
| `k.javed` | `COORDINATOR` | deactivated |

### The open alert

`A-1042`, cell `C-031-022`, zone B Jamrat al-Aqaba, score 0.78 against a threshold of 0.70,
`ELEVATED`, `ACKNOWLEDGED`, raised 14:02:51, acknowledged by `a.rahman` at 14:03:04.
Clears when risk stays below 0.65 for 30 seconds.

| Feature | Contribution | Raw value |
| - | - | - |
| `flowConvergence` | +0.19 | 0.71 |
| `densityRateOfChange` | +0.14 | 0.42 /m2/s |
| `stopStartPulses` | +0.09 | 0.33 |
| `exitOccupancy` | +0.06 | 0.27 |
| `counterFlow` | +0.05 | 118 degrees |
| `speedVariance` | +0.03 | 0.61 |
| `density` | +0.02 | 3.9 /m2 |
| `densityGradient` | -0.02 | 0.14 |
| `speedMean` | -0.04 | 0.38 m/s |

### The three ranked suggestions for A-1042

| Rank | Action | Status | Source | Safeguards |
| - | - | - | - | - |
| 1 | `DIVERT` to Exit E2 | `PROPOSED` | `MODEL` | all five passed |
| 2 | `HOLD_AND_METER` at the north approach | `PROPOSED` | `MODEL` | all five passed, neighbour `C-030-019` rises to 0.61, below its 0.70 threshold |
| 3 | `OPEN_ALTERNATE_ROUTE` west toward E1 | `REJECTED` | `MODEL` | `STALE_CELL_ON_ROUTE` failed, cell `C-024-026` last observed 7 s ago |

A rejected option is rendered with its reason and has nothing to confirm.

### The closed historical incident

`SG-0771` from alert `A-1039`, yesterday 19:42:10. `DIVERT`, `CONFIRMED` by `a.rahman` at
19:42:38. Affected cells `C-031-022`, `C-032-022`, `C-033-021`. Outcome window 19:42:38 to
19:52:38, verdict `IMPROVED`: risk at confirm time 0.78, peak in window 0.61, change -0.17.
The rule stated in the interface reads: improved when peak risk in the window falls more than
0.10 below the risk at confirm time.

### Configuration

Every zone defaults to a risk threshold of 0.70 and a density threshold of 4.0 /m2.
Attributes: walkable 2104 cells, exit 14, barrier 118, obstruction 164. The setup pass returned
9 proposals, of which 6 were accepted, 2 rejected and 1 left unreviewed.

Services: message channel, database and risk engine online; the phrasing model unavailable
since 13:51, with suggestions continuing from `TEMPLATE` phrasing.

***

## 6. Frame register

Frames are grouped by the batch they were reviewed in. Each row names the `design.md` ID it
draws and the viewports it covers.

**Status.** This register is the full plan for Step-5. Fourteen frames are built; the rest are
outstanding. `wireframes/index.html` is the live status: a solid card is a built frame and a
dashed card is one still to be drawn. The register below is not trimmed to what exists, because
a plan that quietly shrinks to match progress stops being useful for judging whether Step-5 is
finished.

### Batch 1 - foundations

These set every convention the remaining frames inherit, so they were reviewed most strictly.

| Frame file | design.md | Viewports |
| - | - | - |
| `W00-conventions.html` | Section 2, C02, C07, C10 | reference |
| `S02-live-map-mobile.html` | S02 | mobile |
| `S02-live-map-desktop.html` | S02 | desktop |
| `S02-live-map-disconnected.html` | S02, Section 10, F11 | both |
| `S02-live-map-operator.html` | S02, Section 3.2 | both |
| `S02-live-map-connecting.html` | S02, Section 10 | both |
| `D01-cell-inspector-desktop.html` | D01 | desktop |
| `D01-cell-inspector-mobile.html` | D01 | mobile |

### Batch 2 - alerts and suggestions

| Frame file | design.md | Viewports |
| - | - | - |
| `S03-zone-detail-desktop.html` | S03 | desktop |
| `S03-zone-detail-mobile.html` | S03 | mobile |
| `S04-alert-detail-desktop.html` | S04 | desktop |
| `S04-alert-detail-mobile.html` | S04 | mobile |
| `C05-suggestions.html` | C05, F04 | both |
| `D02-confirm-suggestion.html` | D02 | both |
| `D03-dismiss-suggestion.html` | D03 | both |
| `D05-alert-toast.html` | D05 | both |

### Batch 3 - timeline, history and replay

| Frame file | design.md | Viewports |
| - | - | - |
| `S05-risk-timeline-desktop.html` | S05 | desktop |
| `S05-risk-timeline-mobile.html` | S05 | mobile |
| `S08-history-desktop.html` | S08 | desktop |
| `S08-history-mobile.html` | S08 | mobile |
| `S08-history-empty.html` | S08, Section 10 | both |
| `S09-event-detail-desktop.html` | S09, all four event types | desktop |
| `S09-event-detail-mobile.html` | S09, all four event types | mobile |
| `S10-replay-desktop.html` | S10 | desktop |
| `S10-replay-mobile.html` | S10 | mobile |

### Batch 4 - fleet and per-drone

| Frame file | design.md | Viewports |
| - | - | - |
| `S06-fleet-desktop.html` | S06, both tabs | desktop |
| `S06-fleet-mobile.html` | S06, both tabs | mobile |
| `S07-per-drone-desktop.html` | S07, observe and transit | desktop |
| `S07-per-drone-mobile.html` | S07, observe and transit | mobile |
| `D07-assign-drone.html` | D07, F06 | both |

### Batch 5 - venue setup and configuration

| Frame file | design.md | Viewports |
| - | - | - |
| `S11-setup-step1-plan-*.html` | S11 step 1 | desktop, mobile |
| `S11-setup-step2-grid-*.html` | S11 step 2 | desktop, mobile |
| `S11-setup-step3-proposals-*.html` | S11 step 3 | desktop, mobile |
| `S11-setup-step4-attributes-*.html` | S11 step 4 | desktop, mobile |
| `S11-setup-step5-exits-*.html` | S11 step 5 | desktop, mobile |
| `S11-setup-step6-zones-*.html` | S11 step 6 | desktop, mobile |
| `S11-setup-step7-thresholds-*.html` | S11 step 7 | desktop, mobile |
| `S11-setup-step8-drones-*.html` | S11 step 8 | desktop, mobile |
| `S11-setup-review-*.html` | S11 review, D10 | desktop, mobile |
| `S12-config-desktop.html` | S12, all eight tabs | desktop |
| `S12-config-mobile.html` | S12, all eight tabs | mobile |
| `D06-edit-thresholds.html` | D06 | both |
| `D10-unsaved-changes.html` | D10 | both |
| `D11-regenerate-grid.html` | D11 | both |

### Batch 6 - authentication, administration and system

| Frame file | design.md | Viewports |
| - | - | - |
| `S01-login.html` | S01 | both |
| `S13-accounts.html` | S13, C11 | both |
| `S14-audit-log.html` | S14 | both |
| `S15-system-health.html` | S15, all three tabs | both |
| `S16-not-permitted.html` | S16 | both |
| `S17-roles-reference.html` | S17, C11 | both |
| `D04-notification-permission.html` | D04 | both |
| `D08-create-edit-user.html` | D08 | both |
| `D09-deactivate-user.html` | D09 | both |
| `D12-session-expired.html` | D12 | both |
| `D13-install-app.html` | D13 | both |
| `D14-demo-harness.html` | D14 | both |

***

## 7. Shared components and where they are drawn

`design.md` Section 8 names eleven shared components. Each is drawn somewhere in this set, and
the frame listed is the one Step-6 should build the component from.

| Component | Drawn in |
| - | - |
| `C01` `SiteMap` | `S02-live-map-desktop.html` |
| `C02` `CellLayer` | `W00-conventions.html` |
| `C03` `RiskTimeline` | `S05-risk-timeline-desktop.html`, `S03-zone-detail-desktop.html` |
| `C04` `AttributionChart` | `S04-alert-detail-desktop.html` |
| `C05` `SuggestionList` | `C05-suggestions.html`, all four states |
| `C06` `CoverageBar` | `W00-conventions.html` section 7, `S02` zone strip |
| `C07` `Legend` | `W00-conventions.html`, `S02-live-map-desktop.html` |
| `C08` `ConnectionBanner` | `S02-live-map-connecting.html`, `S02-live-map-disconnected.html` |
| `C09` `FilterBar` | `S08-history-desktop.html`, `S14-audit-log.html` |
| `C10` `StateChip` | `W00-conventions.html` section 9 |
| `C11` `RolesReference` | `S17-roles-reference.html`, panel form in `S13-accounts.html` |

`C02` and `C10` exist specifically so that no component can invent a cell appearance or a
domain string on its own, and `C11` exists so that no screen can describe a permission the
navigation does not actually enforce. The wireframes honour this: the eight treatments are
defined once in `_assets/wireframe.css` and every frame draws them from there.

***

## 8. What these wireframes deliberately do not show

Restated from `design.md` Section 14, because the fastest way to lose the defence is a
wireframe that implies a capability the project ruled out.

- No frame actuates a barrier, gate, sign or instruction. `D02-confirm-suggestion.html` says so
  in words, inside the dialog, at the moment a user could otherwise assume otherwise.
- No frame offers ticketing, capacity planning, scheduling, entrance design or resource
  allocation. Exit capacity appears only as the denominator for exit occupancy.
- No frame stitches imagery, and no frame is a video player. `S06` Combined feeds carries the
  line stating that views are placed by coordinates on the shared grid and images are never
  stitched.
- No frame offers a fifth zone. `S11` step 6 and the `S12` Zones tab both show the add control
  disabled at four with the validated limit stated inline.
- No frame loads a map tile or anything needing an API key. Leaflet renders the uploaded site
  plan image, which in these wireframes is `_assets/site-plan.svg`.
- No frame renders an unknown cell as a safe cell, interpolates a gap, or presents a stale value
  as current.

***

## 9. Requirement to frame traceability

Every leaf requirement in `srs.md` Section 4 has at least one frame against it. `design.md`
Section 12 maps requirements to screens; this table maps them onward to the frames that draw
those screens.

| Requirement | Frames |
| - | - |
| FR1.1 | `S02-live-map-*`, `S07-per-drone-*`, `D01-cell-inspector-*` |
| FR1.2 | `S02-live-map-*`, `S06-fleet-*`, `S07-per-drone-*`, `D01-cell-inspector-*` |
| FR1.3 | `D01-cell-inspector-desktop` Features tab |
| FR1.4 | `S07-per-drone-*`, `S06-fleet-*` Combined feeds |
| FR1.5 | `S02-live-map-*` zone strip, `S03-zone-detail-*`, `S07-per-drone-*` |
| FR2.1 | `S07-per-drone-*` registration panel |
| FR2.2 | `S02-live-map-*` flow arrows, `W00-conventions`, `D01-cell-inspector-*` |
| FR2.3 | `S07-per-drone-*` transit banner, `S06-fleet-*`, `D07-assign-drone` |
| FR2.4 | `D01-cell-inspector-desktop` Features tab, `S04-alert-detail-*` |
| FR3.1 | `S02-live-map-*`, `S07-per-drone-*`, `S10-replay-*` |
| FR3.2 | `S15-system-health` Latency tab, top bar on every frame |
| FR3.3 | top bar on every frame, `D01-cell-inspector-*` age |
| FR3.4 | `W00-conventions`, `S02-live-map-*` stale treatment, `D01-cell-inspector-*` |
| FR3.5 | `W00-conventions` section 6, `S02-live-map-*` |
| FR4.1 | `D01-cell-inspector-desktop` Features tab, `S04-alert-detail-*` |
| FR4.2 | `S07-per-drone-*` dwell panel, `D01-cell-inspector-*`, `D07-assign-drone` |
| FR4.3 | `S05-risk-timeline-*`, `S03-zone-detail-*`, `D01-cell-inspector-*` |
| FR4.4 | `W00-conventions` section 4, `S02-live-map-*` |
| FR4.5 | `S02-live-map-*` zone strip, `S03-zone-detail-*` |
| FR4.6 | `S02-live-map-*` zone strip, `S03-zone-detail-*` coverage timeline, `S05-risk-timeline-*` |
| FR5.1 | `S02-live-map-*` rail and marker, `D05-alert-toast` |
| FR5.2 | `S04-alert-detail-*`, `S09-event-detail-*` |
| FR5.3 | `S02-live-map-*` rail card, `D05-alert-toast` |
| FR5.4 | `S02-live-map-*` rail, `S04-alert-detail-*` clear condition |
| FR5.5 | `D04-notification-permission`, `D05-alert-toast` |
| FR5.6 | `S02-live-map-*` rail, `S04-alert-detail-*`, `S08-history-*` |
| FR6.1 | `D01-cell-inspector-*` observing drones, `S06-fleet-*` overlap |
| FR6.2 | `S02-live-map-*` zone boundaries |
| FR6.3 | `W00-conventions`, `S02-live-map-*` gap treatment, `D01-cell-inspector-*`, `D07-assign-drone` |
| FR6.4 | `W00-conventions`, `S05-risk-timeline-*` series breaks |
| FR6.5 | `S11-setup-step6-zones-*`, `S12-config-*` Zones tab |
| FR7.1 | `C05-suggestions` |
| FR7.2 | `C05-suggestions` rationale |
| FR7.3 | `C05-suggestions` safeguard list, `D02-confirm-suggestion` |
| FR7.4 | `C05-suggestions` rejected cards |
| FR7.5 | `C05-suggestions` no-safe-option state |
| FR7.6 | `C05-suggestions` template state, `S15-system-health` Services tab |
| FR7.7 | `D02-confirm-suggestion` |
| FR7.8 | `D02-confirm-suggestion`, `D03-dismiss-suggestion`, `S14-audit-log` |
| FR8.1 | `S08-history-*`, `S09-event-detail-*` |
| FR8.2 | `S08-history-*` resolution notice, `S10-replay-*` resolution chip |
| FR8.3 | `S08-history-*` filter bar, `S08-history-empty` |
| FR8.4 | `S10-replay-*` |
| FR8.5 | `S10-replay-*` resolution chip and stepped playhead |
| FR8.6 | `S09-event-detail-*` outcome, `C05-suggestions` countdown |
| FR8.7 | `S09-event-detail-*`, `S04-alert-detail-*` from history |
| FR9.1 | `S11-setup-step1-plan-*`, `S12-config-*` Plan tab |
| FR9.2 | `S11-setup-step2-grid-*`, `S12-config-*` Grid tab, `D11-regenerate-grid` |
| FR9.3 | `S11-setup-step3-proposals-*`, `S12-config-*` Attributes tab |
| FR9.4 | `S11-setup-step4-attributes-*`, `S12-config-*` Attributes tab |
| FR9.5 | `S11-setup-step5-exits-*`, `S12-config-*` Exits tab |
| FR9.6 | `S11-setup-step6-zones-*`, `S12-config-*` Zones tab |
| FR9.7 | `S11-setup-step7-thresholds-*`, `D06-edit-thresholds`, `S03-zone-detail-*` |
| FR9.8 | `S11-setup-step8-drones-*`, `S06-fleet-*`, `D07-assign-drone` |
| FR9.9 | `S14-audit-log`, save toasts in `S11-setup-review-*` and `S12-config-*` |
| FR10.1 | `S01-login`, `D12-session-expired` |
| FR10.2 | `S17-roles-reference`, `S13-accounts` roles panel, `D08-create-edit-user` |
| FR10.3 | nav on every frame, `S16-not-permitted`, `S02-live-map-operator` |
| FR10.4 | `S15-system-health` IT landing note, `S17-roles-reference` |
| FR10.5 | `S13-accounts`, `D08-create-edit-user`, `D09-deactivate-user` |
| FR10.6 | `S14-audit-log` |

Non-functional requirements: NFR1 top bar on every frame and `S15-system-health`; NFR2 Section 3
of this document and `D13-install-app`; NFR3 the alert rail in `S02-live-map-mobile`; NFR4
`S08-history-*`, `S09-event-detail-*`, `S14-audit-log`; NFR5 `W00-conventions` and the legend in
`S02-live-map-desktop`; NFR6 `S02-live-map-disconnected`, `S15-system-health` Services tab,
`C05-suggestions` template state; NFR7 `S01-login`, `D12-session-expired`, `S16-not-permitted`;
NFR8 `_assets/site-plan.svg` rendered as an uploaded image with no tile provider.

NFR9 has no frame, and deliberately so. It fixes numeric accuracy targets for the density and
risk models at Eval 1 and Eval 2, which is a model-evaluation obligation with nothing for the
front-end to render. It is recorded here so the absence reads as a decision rather than an
omission. NFR10 is a capacity target measured against the mobile reference device; it constrains
how `C02` renders 2400 cells in Step-6 rather than what any wireframe shows.

***

## 10. What Step-6 takes from here

- `_assets/wireframe.css` is not shipped. Its eight treatments become named tokens in the
  Tailwind theme config, so one edit restyles every surface consistently, as `CLAUDE.md` requires.
- The canonical dataset in Section 5 becomes the seed for the mock data layer. It already has the
  shape the real API and WebSocket payloads will have.
- The map string encoding in Section 4 is a wireframe device only. The real `CellLayer` renders
  from the cell store, not from a string.
- Tab switching in `_assets/wireframe.js` is throwaway. React owns that in Step-6.
