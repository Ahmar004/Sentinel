# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sentinel - AI Rules

**What this repository is: a proof-of-concept front-end only.** A complete, clickable React UI for Sentinel (Crowd Control and Stampede Early Signs Detection System), driven entirely by mock data, presented at the FYP proposal defence. There is no backend, no WebSocket server, and no ML in this repository. Every screen must behave as if the full pipeline were live.

**Stack: React (PWA) + TypeScript + Vite + Tailwind CSS, Zustand for live state, Leaflet with Esri World Imagery tiles for the map, Recharts for timelines.**

**Global principle: honesty over completeness.** Sentinel's credibility rests on never showing a number it cannot justify. A prettier map that hides unknown states misrepresents the system and loses the defence.

## Source of Truth and Roadmap Discipline

- Follow roadmap.md in root at all costs.
- `roadmap.md` governs the order of work. Do one step at a time. DO NOT start a later step, and DO NOT invent a new step - propose it in `roadmap.md` and wait for approval first.
- The document hierarchy is `docs/Proposal-doc_Version_FINAL.docx` (authoritative), then `docs/understanding.md`, then `docs/srs.md`, then `docs/design.md`, then `docs/wireframes.md` with the frames in `wireframes/`, then code. When two disagree, the higher one wins and the lower one is corrected in the same change.
- Every specification document lives in `docs/`. Only `roadmap.md` and this file sit at the repository root. Where a comment or doc says "srs.md" or "design.md" without a directory, it means the copy in `docs/`.
- DO NOT invent requirements. If something the UI needs is not in the proposal, `docs/understanding.md` or the SRS, it is an open question for the user, not a decision to make alone. The five open questions formerly logged in `docs/understanding.md` Section 14 (latency budget, risk bands, final role list, alert delivery channel, drone count) are now closed by the SRS; every number the system depends on is in SRS Section 2.7, and the reasoning behind each decision is in SRS Appendix C.
- Within the proposal itself, Section 14 (Tools and Technologies) beats Section 9 (Eval plan) where they disagree on model choices: the shipped pipeline is DM-Count, Farneback and XGBoost, while P2PNet, RAFT and LSTM are evaluation only.

## Writing Rules (apply to code, UI copy and docs)

- No emojis anywhere - not in code, comments, commit messages, or UI. Icons come from a real icon library, never from unicode emoji.
- No double hyphens in prose. Use a single hyphen "-" where a dash is needed.
- Use the word "Stampede", never "Crush".
- In docs, spell out technical justifications in plain sentences. The FYP audience is examiners, not this team, so a claim like "density regression is more suitable" must be followed by the reason: in aerial footage each person covers only a few pixels and is partly occluded, so a detector undercounts worst at exactly the high densities where stampede risk appears.
- DO NOT bloat any doc. Every line must prevent a concrete mistake or answer a question an examiner will ask; cut anything that does neither.

## Domain Vocabulary (the UI must use these exact words)

Getting these wrong makes the demo incoherent. Import them from a constants module; DO NOT hardcode the strings in components, and DO NOT invent synonyms ("tile" for cell, "area" for zone, "heatmap" for the wind-map overlay).

| Term | Meaning |
| - | - |
| Cell | A small fixed square of ground in a site-wide grid. Every measurement is stored against a cell, never against a drone. This is what allows drones to move. |
| Zone | A named group of cells, used for display, alerting and reporting. A presentation layer over the grid. Two to four zones only. |
| Risk score | Normalised 0 to 1, per cell, aggregated per zone. |
| Coverage gap | An area with no recent observation from any drone. |
| Freshness / stale | How long ago a cell was last updated, and whether that value is still trustworthy. |
| Dwell / dwell gating | A cell is scored only when its history covers the full sliding window; otherwise the answer is "not enough dwell", not a number. |
| Observe state | Drone holding position. Density, flow, window features and risk are all produced. |
| Transit state | Drone flying to a new area. Density only; risk shows "not enough dwell". |
| Footprint | The ground area a drone currently sees, projected from its pose. |
| Wind-map overlay | Density shading plus flow arrows drawn together. |
| Flow convergence | Streams moving into the same space. A core precursor. |
| Counter-flow | Two dominant flow directions more than 90 degrees apart meeting at a boundary. |
| Stop-start pulses | Jerky, wave-like motion from being pushed while blocked. The third precursor. |
| Exit occupancy | Measured throughput through exit cells against the capacity set at venue setup. |

## Non-Negotiable UI Behaviour

These come from the architectural rules the system enforces, and they are the difference between a demo that reads as engineered and one that reads as a mockup.

- **Observation state and risk band are two separate fields, not one.** A cell carries an observation state (observed, not-enough-dwell, stale, gap) and carries a risk band (normal, watch, elevated, critical) only when observed. Each of the four observation states and each of the four risk bands gets a distinct, deliberate visual treatment. DO NOT collapse gap and normal into the same colour, and DO NOT let an unknown cell read as a safe cell. See SRS Section 2.3.
- **Gaps stay gaps.** Never interpolate a missing cell, never render it as last-known-good, never smooth it away. Grey and explicitly labelled.
- **Drone state decides the output.** A transiting drone contributes density only. Where risk is missing, the UI must say why, naming the reason (transit, or not enough dwell).
- **Every alert answers why.** Feature attribution is part of the alert surface itself, not buried in a detail view nobody opens.
- **Every suggestion is ranked, explained, safeguarded, and confirmed by a human.** A suggestion is advisory. The explicit confirm step is a requirement. Show the safeguards that were applied: a route is rejected if it passes through an over-threshold cell, if it would push a neighbouring cell over its own threshold, or if any cell on it is stale.
- **Outcome tracking closes the loop.** History shows what happened to the risk trajectory of the affected cells after a suggestion was issued.
- **Live means live.** Mock data ticks at roughly 1 Hz per cell: values update, alerts arrive, drones switch between observe and transit, footprints move. Model the mock feed as a push stream that views subscribe to, not a static snapshot polled by components, because the real backend pushes over Django Channels WebSockets.
- **It is a map-and-metrics application, not a video wall.** The real pipeline emits small per-cell summaries, never video. A per-drone view carrying the overlay is in scope; stitched panoramic video is not.

## Scope Boundaries the UI Must Not Cross

The UI must never imply a capability the project has ruled out. DO NOT build, mock, or even stub:

- Any control of barriers, signage, gates, or where people stand. Sentinel suggests; it never actuates.
- Ticketing, capacity planning, scheduling, entrance and exit design, or resource allocation.
- Stitched panoramic video across feeds. Fusion is by coordinates only, for non-overlapping zones.
- An "add unlimited zones" affordance. Two to four zones is the validated scope, and the UI must reflect that limit.
- Anything requiring a paid API or a paid cloud service. Every dependency must be open source, openly licensed, or a free tier that needs no payment details. Map imagery comes from Esri World Imagery, which serves tiles with no API key and no account; DO NOT swap in a provider that asks for a key or a billing account, which rules out Google Maps on both counts and its terms separately forbid using its tiles outside its own APIs.

## Front-End Architecture Rules

- All mock data lives behind one mock data layer that has the same shape the real API and WebSocket payloads will have (cell store entries, alerts with feature attribution, ranked suggestions, drone telemetry). Components consume that layer, never inline fixtures, so a real backend can replace it later without touching the views.
- DO NOT embed data generation, ticking timers, or business logic in UI components. Extract to hooks or controllers, keep components pure (data in via props, actions out via callbacks), and lift shared state to the nearest common parent.
- DO NOT duplicate JSX blocks, hook logic, or utility patterns - extract to `components/`, `hooks/`, or `utils/` at the second cross-file use or the third repetition within the same file.
- DO NOT hardcode domain enum literals (cell states, risk bands, roles, drone states, alert severities, suggestion statuses); import them from a constants module.
- DO NOT hardcode design tokens inline. Colours, spacing and typography live in the `@theme` block in CSS, which is where Tailwind 4 keeps the theme; there is no `tailwind.config.js`. The four observation states and the four risk bands are named tokens there, so one edit restyles every surface consistently.
- Roles gate the interface (FR10): coordinator, administrator, drone operator and IT see different navigation and different screens. Derive every role-dependent decision from one session object passed down through props, never from ad hoc checks scattered through components.
- FR8 (history and replay), FR9 (venue setup, cell grid, zones, exits and capacities, thresholds, drone assignment) and FR10 (auth and RBAC) have no ML behind them, so they are the parts that can be made to feel genuinely complete. Give them real depth; they carry a large part of the demo.

## Responsive and Input Design

- The dashboard has two first-class layouts, and neither is derived from the other. Mobile portrait at 390 x 844 is the on-ground coordinator's and drone operator's device, used under time pressure. Desktop at 1440 x 900 is the administrator's and IT's device, used for venue setup, configuration, accounts and audit. Design each deliberately rather than reflowing one into the other. There is no tablet reference layout. Design interactions keyboard-first, then touch, then mouse.
- Forms and dialogs: Enter submits, Esc cancels. Implement with a real `<form onSubmit={...}>` calling `event.preventDefault()`, `type='submit'` on the primary button, and `type='button'` on every other button.
- Suggestion and alert text must be readable and actionable by a non-technical operator who has seconds, not minutes.

## Commands

The app is scaffolded with Vite. From the repository root:

- `npm install` - install dependencies.
- `npm run dev` - start the Vite dev server.
- `npm run build` - type-check with `tsc -b` then produce a production build in `dist/`.
- `npm run preview` - serve the production build locally.
- `npm run lint` - run ESLint (flat config, `eslint.config.js`) over the whole repo.
- `npm test` - run the vitest suite once (`vitest run`).

Stack as installed: React 19.2, Vite 8, TypeScript 5.9.3 (strict), Tailwind CSS 4.3 via `@tailwindcss/vite` (CSS-first `@theme`, no `tailwind.config.js`), react-router-dom 7, zustand 5, recharts 3, leaflet 1.9 with react-leaflet 5, lucide-react for icons, vitest 5 with @testing-library/react and jsdom, eslint 10 with typescript-eslint, vite-plugin-pwa. The path alias `@/*` maps to `src/*`. An ESLint rule restricts imports of `src/client/*` to `src/store/*` only.

## Workflow

- Interview and ask me questions about things when you are having any confusion or when you have to take any important decision, do not take important decisions based on self-asumptions.
- Invoke the skill named in the roadmap step before starting that step, and announce which skill is being used.
- When writing utils, hooks or components, use test-driven-development before writing implementation code.
- When library or framework documentation is needed (APIs, versions, migration details), fetch current docs rather than relying on training data.
- When an answer, decision or clarification is needed, ask via the AskUserQuestion tool and keep looping with follow-up rounds until every open point is resolved. DO NOT end a turn with questions posed only in prose.
