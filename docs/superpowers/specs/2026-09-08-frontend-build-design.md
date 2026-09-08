# Sentinel Front-End Build - Design

Step-6 of `roadmap.md`. This document decides how the front-end is built. It does not restate
what is being built: `srs.md` is the requirement, `design.md` is the screen and flow design,
and `wireframes/` is the visual reference. It exists so that the ten implementation plans that
follow do not each re-decide the stack, the layering, or the order of work.

## 1. Decisions taken

Recorded with reasoning, so a question at the defence has an answer here rather than in
someone's memory. These extend the register in `srs.md` Appendix C.

| # | Decision | Reasoning |
| - | - | - |
| B1 | TypeScript, not JavaScript | The honesty invariant is a discriminated union: a cell that is not `OBSERVED` has no risk score, and the type system can make reading one a compile error rather than a review finding. It also turns the `SentinelClient` interface in `srs.md` Section 3.5 into a contract a backend team can be handed. |
| B2 | TypeScript 5.9.3, not the current 7.0.2 | `typescript-eslint` 8.70 declares a peer range of `typescript >=4.8.4 <6.1.0`. Adopting TypeScript 7 today means no type-aware linting, which is most of the value of the compiler on a project whose central invariant is a type. |
| B3 | Zustand for live state, plain Context for session and configuration | The mock feed pushes roughly 2400 cells at 1 Hz. Selector subscriptions mean a tick touching twelve cells re-renders twelve subscribers. Session and site configuration change rarely, so Context costs nothing there and reads more plainly. Zustand is MIT licensed and needs no key and no service (NFR8). |
| B4 | Tailwind CSS 4 with CSS-first `@theme` tokens | Tailwind 4 has no `tailwind.config.js`. The guarantee `CLAUDE.md` asks for is unchanged, that one edit restyles every surface, but the tokens live in `@theme` inside CSS. The eight cell treatments and the four risk bands are named tokens there. |
| B5 | The cell grid renders as one Leaflet canvas layer, not 2400 React elements | 2400 React elements reconciled at 1 Hz is the single most likely way this application becomes unusable during the demo. `C02 CellLayer` subscribes to the store and draws imperatively; everything else on screen uses fine-grained selectors. |
| B6 | `HttpSentinelClient` is not stubbed | Dead code nobody runs is a liability, and an empty implementation invites a reviewer to believe a backend exists. The interface file is what the backend team receives. |
| B7 | Layering enforced by lint, not by review | Only `src/store/` may import `src/client/`, and only `src/client/` may import `src/mock/`. An eslint `no-restricted-imports` rule makes "swap in a real backend without touching the views" a claim the build checks rather than an intention. |
| B8 | Screen `S18 Suggestions` added | `required-pages.md` item 7 asks that the suggestion lifecycle stay visually distinct rather than folded into the alert feed, and `design.md` had folded it into four surfaces. Suggestions are the decision-support tier, the part of the pipeline a panel is least likely to have seen before, so it earns a surface. It serves existing requirements FR7 and FR8 and adds no capability. |
| B9 | Screen `S19 Analytics` added, as new requirement FR11 | `required-pages.md` item 10 has no home anywhere in `srs.md` or `design.md`. Added deliberately and recorded as new scope rather than smuggled in as a reading of an existing requirement. Export is generated in the browser, because no paid service is permitted (NFR8). |
| B10 | `S18` and `S19` are Coordinator and Administrator only | Both are views over the same event data as `S08 History`, so they inherit its roles. Decision D19 already closes suggestions to the Drone Operator; excluding that role from the analytics of those suggestions follows. |
| B11 | The scenario engine ships in plan 2, its presentable form in plan 9 | Plans 3 to 9 need to drive a coverage gap or a safeguard rejection on demand rather than wait for one to occur. A developer-only control is enough for that; `D14 Demo harness` is the surface an Administrator sees. |
| B12 | Seeded pseudo-random number generator throughout the simulator | The defence demo must run identically every time. A simulator depending on `Math.random` produces a different alert at a different moment on every reload, which is the fastest way to lose a rehearsed demonstration. |

## 2. Stack

Every package is MIT or ISC, needs no API key and has no paid tier (NFR8). Versions are those
current at the time of writing and mutually compatible on React 19.

| Package | Version | Role |
| - | - | - |
| react, react-dom | 19.2 | Required by react-leaflet 5 |
| vite | 8.2 | Build and dev server |
| typescript | 5.9.3 | See decision B2 |
| tailwindcss, @tailwindcss/vite | 4.3 | Design tokens in `@theme` |
| react-router-dom | 7.18 | Routing |
| zustand | 5.0 | Live state |
| recharts | 3.10 | `C03 RiskTimeline`, `C04 AttributionChart` |
| leaflet, react-leaflet, @types/leaflet | 1.9.4, 5.0 | `CRS.Simple` and `ImageOverlay` over the uploaded plan image. No tile provider |
| lucide-react | 1.42 | Icons. Never unicode emoji (Rule-0) |
| vitest, @testing-library/react, jsdom | 5.0, 16.3 | Tests |
| eslint, typescript-eslint, prettier | 10, 8.70 | Lint and format |
| vite-plugin-pwa | 1.3 | App shell precache only. No runtime caching entry for any live data (NFR6) |

## 3. Module architecture

Seven layers. Each has one job, and the dependency direction is enforced by lint (B7).

```
src/domain/      vocabulary and types. Depends on nothing.
src/client/      the SentinelClient interface. Depends on domain.
src/mock/        the deterministic simulator. Depends on domain. Imported only by client.
src/store/       zustand slices and selector hooks. Depends on client and domain.
src/components/  C01 to C11 and layout primitives. Depends on store and domain.
src/screens/     S01 to S19. Depends on components, store and domain.
src/routes/      role-gated routing. Depends on screens and the permission matrix.
```

### 3.1 `src/domain/`

The enum identifiers exactly as `srs.md` Appendix A lists them, and the payload types from
Section 3.3. No domain enum literal appears anywhere else in the codebase.

The honesty invariant is expressed as a discriminated union rather than as a convention:

```ts
type CellObservation =
  | { observationState: 'OBSERVED';         densityPerSqM: number; flow: Flow | null; risk: Risk; dwellMs: number }
  | { observationState: 'NOT_ENOUGH_DWELL'; densityPerSqM: number; flow: Flow | null; risk: null; dwellMs: number }
  | { observationState: 'STALE';            densityPerSqM: number; flow: null;        risk: null; ageMs: number }
  | { observationState: 'GAP';              densityPerSqM: null;   flow: null;        risk: null }
```

A component that reads `cell.risk.score` without first narrowing on `observationState` does
not compile. `STALE` carries a mandatory `ageMs` because `wireframes.md` Section 2 requires a
stale cell to be presented only with its age. `GAP` carries no measurement of any kind,
because a gap that carries a density is a gap presenting as an observation.

### 3.2 `src/client/`

The `SentinelClient` interface transcribed from `srs.md` Section 3.5, plus the two methods
`S18` and `S19` require (Section 6 below). Views and hooks consume the interface only, never a
fixture and never a raw `fetch`.

### 3.3 `src/mock/`

The deterministic simulator behind `MockSentinelClient`:

- **Seed.** The canonical dataset in `wireframes.md` Section 5. Site Riverside Arena,
  300 m by 200 m, 60 by 40 cells, three zones, four drones, two exits, five users, the open
  alert `A-1042` with its nine-feature attribution, its three ranked suggestions, and the
  closed historical incident `SG-0771`.
- **`CellStore`.** A ring buffer per cell, sized for the 30 s sliding window and the one hour
  of full-rate history replay needs. Beyond the hour, one sample per 10 s.
- **Tick engine.** 1 Hz, emitting `cell.batch`, `zone.update` and `drone.update` as `srs.md`
  Section 3.2 specifies. Cell updates are batched into one message per tick, never one message
  per cell.
- **Scenario engine.** `CALM`, `CONVERGENCE`, `TRANSIT_GAP`, `SAFEGUARD_REJECT` and
  `MODEL_OFF` from `srs.md` Appendix B, at 1x, 4x and 16x.
- **Seeded generator.** One seeded pseudo-random number generator threaded through every
  stochastic decision (B12).

### 3.4 `src/store/`

Three Zustand slices. `liveStore` holds cells, zones, drones, alerts, suggestions and the
connection state, and is written only by the client subscription. `sessionStore` holds the
user, role and permissions. `configStore` holds the site, grid, zones, exits and thresholds.

Selector hooks such as `useCell(cellId)` and `useZone(zoneId)` are the only way a component
reads live state, so a tick re-renders its subscribers and nothing else.

### 3.5 `src/routes/`

One permission matrix module, derived from `srs.md` Section 2.4. The nav rail reads it,
routing enforces it, and `C11 RolesReference` renders it. Because all three read one array, a
role cannot see a nav entry it cannot open, and the roles screen cannot describe a permission
routing does not enforce (decision D20).

## 4. Build decomposition

Ten plans plus a documentation plan. Each is written with `writing-plans` and executed with
`subagent-driven-development`, and each ends at a state that opens in a browser and can be
demonstrated.

| # | Plan | Delivers | Done when |
| - | - | - | - |
| 0 | Specification amendments | Section 6 of this document. No code | `srs.md`, `design.md` and `wireframes.md` are consistent with each other and with the two added screens |
| 1 | Foundation | Scaffold, `src/domain/`, `@theme` tokens for the eight cell treatments and both themes, permission matrix, session store, role-gated routing with placeholder screens, application shell, `C08 ConnectionBanner`, `C10 StateChip` | Logging in as each of the four roles shows exactly that role's navigation |
| 2 | Mock data layer | Canonical seed, `CellStore`, tick engine, `MockSentinelClient` implementing all of Section 3.5, `liveStore` and `configStore`, seeded generator, scenario engine with a developer-only control | A debug surface shows cells ticking at 1 Hz with all four observation states present, Zone C at not enough dwell, and all five scenarios drivable |
| 3 | Map and layers | `C01 SiteMap`, `C02 CellLayer`, `C07 Legend`, `C06 CoverageBar`, `D01 Cell inspector` | Gaps render grey and labelled, no cell interpolates, and a flow arrow appears only where `flow` is not null |
| 4 | `S02` complete | Zone strip, alert rail on desktop and alert sheet on mobile, `C05 SuggestionList`, `C04 AttributionChart`, `D02`, `D03`, `D04`, `D05`, the estimated people count (FR1.5) | Flows F02, F03 and F04 run end to end in both viewports |
| 5 | Zone, alert, timeline | `S03`, `S04`, `S05`, `C03 RiskTimeline`, `D06` | F03 and F08. The timeline draws gaps as breaks, never as interpolated segments |
| 6 | Fleet and per-drone | `S06` with both tabs, `S07`, `D07` | F06 |
| 7 | History, suggestions, replay | `S08`, `S09`, `S10`, `S18`, `C09 FilterBar` | F05 and F09. Outcome tracking visibly closes the loop |
| 8 | Venue setup and configuration | `S11` eight-step wizard, `S12` eight tabs, `D10`, `D11` | F07 |
| 9 | Accounts, audit, health, edges | `S13`, `S14`, `S15`, `S16`, `S17`, `C11 RolesReference`, `D08`, `D09`, `D12`, `D13`, `D14`, and the degraded, empty and error states in `design.md` Section 10 | F01, F10, F11 and F12 |
| 10 | Analytics | `S19`, with client-side export | FR11 acceptance criteria |

`S18` sits in plan 7 rather than in a plan of its own because it shares `C05`, `C09` and the
same event data as `S08` and `S09`; building it anywhere else duplicates work. `S19` is last
because `required-pages.md` itself calls it the lowest priority and because it summarises data
every earlier plan produces.

Plans 1 to 5 and 7 together constitute the defence path: sign in, watch the site, investigate
an alert, read why it fired, act on a ranked suggestion, and review the outcome. If time runs
out, that path is coherent on its own.

## 5. Testing

Test-driven development throughout, as `CLAUDE.md` requires. Vitest with React Testing Library,
tests colocated with what they test. Four kinds, because they catch different failures:

- **Invariant tests.** No surface renders a risk figure for a cell that is not `OBSERVED`. A
  gap cell renders grey and labelled and never as last known good. A transiting drone
  contributes density and no flow. The type system blocks most of this at compile time, so
  these tests exist to catch the places a cast could slip through.
- **Determinism tests.** The same seed produces the same tick sequence. This is what makes the
  demo repeatable, so it is asserted rather than assumed.
- **Component tests.** Role-gated rendering for each of the four roles, and a keyboard
  assertion on every form and dialog: Enter submits, Escape cancels, the primary button is
  `type="submit"` and every other button is `type="button"`.
- **Flow tests.** F01 to F12 driven through the store, which is what proves the screens compose
  rather than merely render.

## 6. Specification amendments required before plan 1

The document hierarchy puts `srs.md` and `design.md` above the code, so the two added screens
land in those documents first.

### 6.1 `srs.md`

- **New FR11, Reporting and analytics**, with acceptance criteria: session statistics over a
  selected time range covering alerts per zone, coordinator response time, suggestion
  acknowledgement rate and outcome verdict distribution; and export of the current view.
  Export is generated in the browser, because every hosted export service requires payment
  details, which NFR8 forbids.
- **Section 3.1** gains `GET /suggestions`, filterable across alerts, and
  `GET /sites/{siteId}/analytics`.
- **Section 3.5** gains two methods. The existing `getSuggestions(alertId)` reaches only within
  a single alert, so `S18` cannot be built on it:

```ts
querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionOption>>
getAnalytics(siteId: string, range: TimeRange): Promise<AnalyticsSummary>
```

- **Section 3.3** gains the `AnalyticsSummary` schema.
- **Section 7** gains traceability rows for `S18` and `S19`.
- **Appendix C** gains decisions D22 and D23, recording why each screen was added and that
  `S18` serves existing requirements while `S19` is new scope.

### 6.2 `design.md`

- Section 3.2 navigation table gains Suggestions and Analytics rows, both Coordinator and
  Administrator only (B10).
- Section 4 screen inventory gains `S18` at `/suggestions` serving FR7 and FR8, and `S19` at
  `/analytics` serving FR11.
- Section 5 gains a detail section for each.
- Section 12 traceability is extended.
- Section 14 records that export is client-side and loads no service.
- **Correction.** The `S11` step 7 row reads as though the risk and density thresholds both
  default to 0.70. `wireframes.md` Section 5 gives risk 0.70 and density 4.0 per square metre.
  Both are spelled out separately. A density threshold of 0.70 per square metre would never
  register as dense, given decision D6 puts stampede-level density at 4 to 6 per square metre.

### 6.3 `wireframes.md`

- **Correction.** Section 5 gives Zone A a risk of 0.31 in band `NORMAL`, and its peak cell
  `C-012-034` at 0.44. Zone risk is the maximum across observed cells (FR4.5, decision D13),
  so a peak of 0.44 would make the zone 0.44 and `WATCH`. The peak is corrected to 0.31.

No new wireframes are drawn. `S18` and `S19` build from `design.md` and
`wireframes/W00-conventions.html`, as `S01` and `S10` to `S17` already must.

### 6.4 `CLAUDE.md`

- The Tailwind line names `tailwind.config.js`, which Tailwind 4 does not have. Corrected to
  `@theme` in CSS. The requirement is unchanged.
- The stack line gains TypeScript and Zustand.
- The Commands section replaces its "not scaffolded yet" placeholder with the real scripts, in
  the change that adds them, as that section already instructs.

## 7. `required-pages.md` coverage

Every page the team agreed on is delivered by a named screen. Where the SRS differs, the
substitution and its reason are recorded rather than left for someone to notice.

| # | Required page | Delivered by | Substitution and why |
| - | - | - | - |
| 1 | Login | `S01` | Four roles, not coordinator and viewer. Each has a genuinely different screen set, so FR10 is visibly real (decision D3) |
| 2 | Main Dashboard | `S02` | None |
| 3 | Individual Drone View | `S07`, reached from `S06` | Wind-map overlay instead of a video feed. The pipeline emits small per-cell summaries, never video |
| 4 | Combined Feeds View | `S06` Combined feeds tab | Per-drone panels showing footprint coverage and the cells each observes. No stitched imagery, and the tab says so in words |
| 5 | Zone Management | `S11` step 6, `S12` Zones tab | Leaflet over the uploaded plan image, not Google Maps, because no dependency may need an API key or payment details. Zones are named groups of cells, not free polygons, because every measurement is stored against a cell. Two to four zones, not unlimited |
| 6 | Drone Management | `S12` Drones tab, `S06`, `D07` | None |
| 7 | Suggestions | `S18`, with `C05` in the `S02` alert rail and in `S04`, and outcomes in `S09` | Added as a screen (B8) |
| 8 | Event History | `S08`, `S09` | None |
| 9 | System Health | `S15` | None |
| 10 | Analytics and Reporting | `S19` | Added as requirement FR11 (B9). Export is client-side |

## 8. Boundaries this build does not cross

Restated from `srs.md` Section 2.6 and `design.md` Section 14, because the two added screens
are the most likely place for scope to leak.

- `S19` reports on what happened. It does not forecast, recommend staffing, or plan capacity.
- `S18` lists and explains suggestions. It never actuates anything, and every confirmation
  remains an explicit human step.
- No screen loads a map tile or anything needing an API key.
- No screen plays video or stitches imagery.
- No screen offers a fifth zone.
