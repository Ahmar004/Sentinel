# Sentinel Plan 0 - Specification Amendments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `srs.md`, `design.md`, `wireframes.md` and `CLAUDE.md` into a state where the front-end build can begin, by adding the two screens agreed in the design (`S18 Suggestions`, `S19 Analytics`), declaring the two `SentinelClient` methods they need, and correcting four factual errors those documents already contain.

**Architecture:** Documentation only. No code, no dependencies, no application files. Every change is an edit to an existing Markdown file at an exact anchor given in full below. The document hierarchy is `docs/Proposal-doc_Version_FINAL.docx`, then `docs/understanding.md`, then `srs.md`, then `design.md`, then wireframes, then code; this plan edits the middle of that stack, so `srs.md` changes land before the `design.md` changes that depend on them.

**Tech Stack:** None. Markdown edits and `grep` verification.

**Spec:** `docs/superpowers/specs/2026-09-08-frontend-build-design.md`, Section 6.

## Global Constraints

- **No emojis anywhere.** Not in prose, not in commit messages.
- **No double hyphens in prose.** Use a single hyphen where a dash is needed.
- **Use the word "Stampede", never "Crush".**
- **Every claim carries its reason in plain sentences.** The audience is an FYP examiner, not this team. A requirement that states what without stating why is incomplete.
- **DO NOT bloat.** Every line added must prevent a concrete mistake or answer a question an examiner will ask.
- **DO NOT invent requirements beyond FR11.** FR11 is the single new requirement this plan is authorised to add, agreed in the design under decision B9. Anything else missing is an open question for the user.
- **Leaf requirement count.** `srs.md` Section 4 currently holds 61 leaf requirements (FR1.1 to FR10.6). Adding FR11.1 to FR11.3 makes 64. Three separate sentences in two files state this count and all three must end at sixty-four.
- **ASCII only.** These files are currently pure ASCII. Keep them so.
- **Out of scope for this plan:** the `CLAUDE.md` Commands section. It instructs that the real scripts replace its placeholder "in the same change that adds them", and the scaffold is plan 1. Leave it untouched.

---

### Task 1: Add FR11 to `srs.md` and correct the leaf requirement count

**Files:**
- Modify: `srs.md` (Section 4, after FR10.6; and Section 7 lines 745 and 760)

**Interfaces:**
- Produces: requirement identifiers `FR11.1`, `FR11.2`, `FR11.3`, consumed by Task 3's traceability row and by Task 4's screen inventory entry for `S19`.

- [ ] **Step 1: Verify the current leaf count is 61**

Run:
```bash
grep -oE "^\*\*FR[0-9]+\.[0-9]+\*\*" srs.md | sort -u | wc -l
```
Expected: `61`

- [ ] **Step 2: Add FR11 after FR10.6**

Find this block, which is the end of Section 4 immediately before the `***` separator and `## 5. Data Model`:

```
**FR10.6** Authentication events and every privileged action shall be audit-logged, viewable by administrator and IT.
*Acceptance:* login, logout, failed login, role change, threshold change, drone assignment, alert acknowledgement, and suggestion confirmation and dismissal all appear in the log.

***

## 5. Data Model
```

Replace it with:

```
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

Export is generated in the browser because every hosted export service requires payment details, which NFR8 forbids.

***

## 5. Data Model
```

- [ ] **Step 3: Verify the leaf count is now 64**

Run:
```bash
grep -oE "^\*\*FR[0-9]+\.[0-9]+\*\*" srs.md | sort -u | wc -l
```
Expected: `64`

- [ ] **Step 4: Correct the two stated counts in Section 7**

`srs.md` line 745 currently reads "sixty", which was already wrong before this plan: the file held 61 leaves, not 60. Find:

```
The screens column is filled from `design.md`, which is what makes Step-4's verification mechanical rather than a judgement call. Leaf-level mapping for all sixty requirements is in `design.md` Section 12.
```

Replace with:

```
The screens column is filled from `design.md`, which is what makes Step-4's verification mechanical rather than a judgement call. Leaf-level mapping for all sixty-four requirements is in `design.md` Section 12.
```

Then find:

```
Sixty-one leaf requirements in total.
```

Replace with:

```
Sixty-four leaf requirements in total.
```

- [ ] **Step 5: Verify no stale count remains**

Run:
```bash
grep -n "sixty\|Sixty" srs.md
```
Expected: exactly two lines, both reading `sixty-four` or `Sixty-four`. No occurrence of `sixty requirements` or `Sixty-one`.

- [ ] **Step 6: Verify the file is still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' srs.md; grep -n -- "--" srs.md
```
Expected: no output from either command.

- [ ] **Step 7: Commit**

```bash
git add srs.md
git commit -m "docs(srs): add FR11 reporting and analytics, correct leaf count"
```

---

### Task 2: Declare the two `SentinelClient` methods `S18` and `S19` require

**Files:**
- Modify: `srs.md` (Section 3.1 endpoint table, Section 3.3 payload schemas, Section 3.5 interface)

**Interfaces:**
- Consumes: `FR11.1` and `FR11.2` from Task 1.
- Produces: `querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionOption>>` and `getAnalytics(siteId: string, range: TimeRange): Promise<AnalyticsSummary>`, plus the `AnalyticsSummary` schema. Plan 2 implements both in `MockSentinelClient`; plans 7 and 10 consume them.

- [ ] **Step 1: Add the `GET /suggestions` row to the Section 3.1 table**

Find:

```
| Suggestions | `GET /alerts/{alertId}/suggestions` | Ranked options for an alert | Coordinator, Administrator |
```

Replace with:

```
| Suggestions | `GET /alerts/{alertId}/suggestions` | Ranked options for an alert | Coordinator, Administrator |
| Suggestions | `GET /suggestions` | Filter across alerts by site, zone, status, action, phrasing source, actor and time range | Coordinator, Administrator |
```

The existing endpoint reaches only within one alert. `S18` lists the lifecycle across alerts, so it cannot be built on it.

- [ ] **Step 2: Add the analytics row to the Section 3.1 table**

Find:

```
| Health | `GET /health`, `/health/workers`, `/health/latency` | System health surfaces | Administrator, Drone Operator, IT |
```

Replace with:

```
| Analytics | `GET /sites/{siteId}/analytics` | Summary statistics for a time range (FR11) | Coordinator, Administrator |
| Health | `GET /health`, `/health/workers`, `/health/latency` | System health surfaces | Administrator, Drone Operator, IT |
```

- [ ] **Step 3: Add the `AnalyticsSummary` schema to Section 3.3**

Find the end of the Outcome schema block, which is the last schema in Section 3.3:

```
`verdict` is `PENDING` until the window closes.

### 3.4 Error model
```

Replace with (the outer fence below is four backticks, because the replacement text itself contains a fenced JSON block):

````
`verdict` is `PENDING` until the window closes.

**Analytics summary:**

```json
{
  "siteId": "site-01",
  "from": "2026-08-27T00:00:00.000Z",
  "to": "2026-08-27T23:59:59.999Z",
  "alertsByZone": [
    { "zoneId": "zone-a", "count": 0 },
    { "zoneId": "zone-b", "count": 3 },
    { "zoneId": "zone-c", "count": 0 }
  ],
  "responseTime": { "acknowledged": 3, "medianMs": 13000, "p95Ms": 41000 },
  "acknowledgementRate": { "issued": 7, "confirmed": 3, "dismissed": 2, "expired": 2 },
  "verdicts": { "IMPROVED": 2, "UNCHANGED": 1, "WORSENED": 0, "PENDING": 0 }
}
```

`responseTime` is `null` when no alert in the range was acknowledged, and `acknowledgementRate` is `null` when no suggestion was issued. A count of zero and an absence of data are different facts, and FR11.3 requires the interface to tell them apart. `alertsByZone` lists every zone in the site including those with a count of zero, because a zone that raised no alert is a measured result rather than missing data.

### 3.4 Error model
````

- [ ] **Step 4: Add `querySuggestions` to the Section 3.5 interface**

Find:

```
  getOutcome(suggestionId: string): Promise<Outcome>
```

Replace with:

```
  getOutcome(suggestionId: string): Promise<Outcome>
  querySuggestions(query: SuggestionQuery): Promise<Page<SuggestionOption>>
```

- [ ] **Step 5: Add `getAnalytics` to the Section 3.5 interface**

Find:

```
  getHealth(): Promise<SystemHealth>
```

Replace with:

```
  getHealth(): Promise<SystemHealth>
  getAnalytics(siteId: string, range: TimeRange): Promise<AnalyticsSummary>
```

- [ ] **Step 6: Verify both methods and the schema are present**

Run:
```bash
grep -n "querySuggestions\|getAnalytics\|acknowledgementRate\|GET /suggestions" srs.md
```
Expected: four or more lines, covering the two interface methods, the endpoint row and the schema.

- [ ] **Step 7: Verify the file is still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' srs.md; grep -n -- "--" srs.md
```
Expected: no output from either command.

- [ ] **Step 8: Commit**

```bash
git add srs.md
git commit -m "docs(srs): declare querySuggestions and getAnalytics on the client contract"
```

---

### Task 3: Record the traceability row and the two decisions in `srs.md`

**Files:**
- Modify: `srs.md` (Section 7 traceability matrix, Appendix C)

**Interfaces:**
- Consumes: `FR11.1` to `FR11.3` from Task 1.
- Produces: decisions `D22` and `D23`, referenced by FR11's own prose (added in Task 1) and by `design.md` in Task 4.

- [ ] **Step 1: Add the FR11 row to the Section 7 matrix**

Find:

```
| FR10 | FR10.1 to FR10.6 | none | all | `S01` login, nav rail, `S13` accounts, `S14` audit log, `S16`, `S17` roles reference, `D08`, `D09`, `D12` |
```

Replace with:

```
| FR10 | FR10.1 to FR10.6 | none | all | `S01` login, nav rail, `S13` accounts, `S14` audit log, `S16`, `S17` roles reference, `D08`, `D09`, `D12` |
| FR11 | FR11.1 to FR11.3 | none | Coordinator, Administrator | `S19` analytics, `S08` history |
```

- [ ] **Step 2: Add decisions D22 and D23 to Appendix C**

Find the final row of the Appendix C table, which is the last line of the file's decision register:

```
| D21 | The estimated people count is surfaced, over observed cells only | FR1.1 defines a density map whose values sum to a people count, and until now nothing in the interface showed that sum, leaving the counting requirement evidenced only by shading. Restricting the count to observed cells is what keeps it honest: a figure spanning unobserved cells would be interpolation expressed as a number. Recorded as FR1.5. |
```

Replace with:

```
| D21 | The estimated people count is surfaced, over observed cells only | FR1.1 defines a density map whose values sum to a people count, and until now nothing in the interface showed that sum, leaving the counting requirement evidenced only by shading. Restricting the count to observed cells is what keeps it honest: a figure spanning unobserved cells would be interpolation expressed as a number. Recorded as FR1.5. |

Decisions D22 and D23 were taken in Step-6, when mapping the team's `required-pages.md` against `design.md` found two agreed pages with no screen behind them.

| # | Decision | Reasoning |
| - | - | - |
| D22 | A dedicated suggestions screen, `S18`, serving existing requirements | `design.md` had distributed the decision-support tier across the `S02` alert rail, `S04`, the `S08` Suggestions tab and `S09`, so no single surface showed a suggestion's whole life from proposal to outcome. That tier is the part of the pipeline an examiner is least likely to have seen before, so it earns a surface of its own. `S18` renders the same `C05` and `C09` components the other screens use, so the lifecycle gains one home without anything being written twice, and it adds no capability: every requirement it serves is already in FR7 and FR8. |
| D23 | An analytics screen, `S19`, recorded as new requirement FR11 | `required-pages.md` item 10 asks for session statistics with export, and had no home in this document or in `design.md`. It is recorded as new scope rather than read into an existing requirement, because inventing a requirement and then presenting it as one that was always there is precisely the drift this register exists to prevent. Export is generated in the browser, because every hosted export service requires payment details, which NFR8 forbids. `S19` reports what happened and does not forecast, recommend staffing or plan capacity, all of which stay out of scope under Section 2.6. |
```

- [ ] **Step 3: Verify both decisions and the traceability row are present**

Run:
```bash
grep -n "| D22 |\|| D23 |\|| FR11 |" srs.md
```
Expected: three lines.

- [ ] **Step 4: Verify the file is still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' srs.md; grep -n -- "--" srs.md
```
Expected: no output from either command.

- [ ] **Step 5: Commit**

```bash
git add srs.md
git commit -m "docs(srs): record FR11 traceability and decisions D22 and D23"
```

---

### Task 4: Add `S18` and `S19` to `design.md`

**Files:**
- Modify: `design.md` (Section 3.2 navigation table, Section 4 screen inventory, Section 5 after `S17`, Section 13)

**Interfaces:**
- Consumes: `FR11.1` to `FR11.3` from Task 1, and the two client methods from Task 2.
- Produces: screen identifiers `S18` at `/suggestions` and `S19` at `/analytics`, consumed by Task 5's traceability rows and by build plans 7 and 10.

- [ ] **Step 1: Add both nav rows to the Section 3.2 table**

Find:

```
| History (`S08`) | Yes | Yes | No | No |
```

Replace with:

```
| History (`S08`) | Yes | Yes | No | No |
| Suggestions (`S18`) | Yes | Yes | No | No |
| Analytics (`S19`) | Yes | Yes | No | No |
```

Both are Coordinator and Administrator only. They are views over the same event data as `S08`, so they inherit its roles, and decision D19 already closes suggestions to the Drone Operator.

- [ ] **Step 2: Add both rows to the Section 4 screen inventory**

Find:

```
| `S17` | Roles reference | `/roles` | Admin, IT | FR10.2, FR10.4 |
```

Replace with:

```
| `S17` | Roles reference | `/roles` | Admin, IT | FR10.2, FR10.4 |
| `S18` | Suggestions | `/suggestions` | Coord, Admin | FR7.1 to FR7.8, FR8.6 |
| `S19` | Analytics | `/analytics` | Coord, Admin | FR11.1 to FR11.3 |
```

- [ ] **Step 3: Add the `S18` and `S19` detail sections**

Find the end of the `S17` detail section, immediately before the Section 6 heading:

```
`S13` renders the same `C11` component as a panel, so the table has one source (decision D20).

***

## 6. Dialogs and pop-ups
```

Replace with:

```
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
- Alerts per zone as a bar chart, with the same figures in a table beneath it, so the numbers are readable without interpreting the chart (NFR5).
- Coordinator response time from alert raised to acknowledged, as median and 95th percentile.
- Suggestion acknowledgement rate: issued, confirmed, dismissed and expired.
- Outcome verdict distribution across improved, unchanged and worsened, with pending counted separately rather than folded into unchanged.
- Export of the current range, generated in the browser and contacting no service (FR11.2, NFR8).

Every figure states the events it was computed from, and a kind with no events in the range reads as no data rather than as zero (FR11.3). An acknowledgement rate of 0 percent means every suggestion was ignored; no data means none was issued. Rendering the second as the first misleads exactly as badly as rendering a coverage gap as a calm cell.

**States:** loading, results, no events in this range.

This screen reports what happened. It does not forecast, recommend staffing or plan capacity, all of which stay out of scope (SRS 2.6).

***

## 6. Dialogs and pop-ups
```

- [ ] **Step 4: Update the Section 13 row for the proposal's suggestions view**

Find:

```
| Suggestions | `C05` in the `S02` alert rail and in `S04` |
```

Replace with:

```
| Suggestions | `S18`, and `C05` in the `S02` alert rail and in `S04` |
```

- [ ] **Step 5: Verify both screens are present in all four places**

Run:
```bash
grep -c "S18" design.md; grep -c "S19" design.md
```
Expected: at least `5` for `S18` (navigation row, inventory row, detail heading, the review-surface sentence, Section 13 row) and at least `3` for `S19` (navigation row, inventory row, detail heading). `grep -c` counts matching lines, not occurrences.

- [ ] **Step 6: Verify the file is still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' design.md; grep -n -- "--" design.md
```
Expected: no output from either command.

- [ ] **Step 7: Commit**

```bash
git add design.md
git commit -m "docs(design): add S18 suggestions and S19 analytics screens"
```

---

### Task 5: Extend `design.md` traceability and boundaries, and correct the threshold row

**Files:**
- Modify: `design.md` (Section 5 `S11` step table, Section 12 traceability, Section 14 boundaries)

**Interfaces:**
- Consumes: `S18` and `S19` from Task 4, `FR11.1` to `FR11.3` from Task 1.

- [ ] **Step 1: Correct the `S11` step 7 threshold row**

The row reads as though both thresholds default to 0.70. `wireframes.md` Section 5 gives a risk threshold of 0.70 and a density threshold of 4.0 people per square metre. A density threshold of 0.70 per square metre would never register as dense at all: SRS decision D6 puts stampede-level density at 4 to 6 people per square metre.

Find:

```
| 7. Thresholds | Per-zone risk and density thresholds, defaulting to 0.70 | FR9.7 |
```

Replace with:

```
| 7. Thresholds | Per-zone risk and density thresholds, defaulting to a risk threshold of 0.70 and a density threshold of 4.0 people per square metre | FR9.7 |
```

- [ ] **Step 2: Add `S18` to the five suggestion and outcome traceability rows**

Find:

```
| FR7.1 | `C05` in `S02` rail and `S04` |
| FR7.2 | `C05` rationale |
| FR7.3 | `C05` safeguard list, `D02` |
| FR7.4 | `C05` rejected cards |
| FR7.5 | `C05` no-safe-option state |
| FR7.6 | `C05` source badge, `S15` Services |
```

Replace with:

```
| FR7.1 | `C05` in `S02` rail and `S04`, `S18` |
| FR7.2 | `C05` rationale |
| FR7.3 | `C05` safeguard list, `D02` |
| FR7.4 | `C05` rejected cards, `S18` |
| FR7.5 | `C05` no-safe-option state, `S18` |
| FR7.6 | `C05` source badge, `S15` Services, `S18` |
```

Then find:

```
| FR8.6 | `S09` outcome, `C05` countdown |
```

Replace with:

```
| FR8.6 | `S09` outcome, `C05` countdown, `S18` verdict chip |
```

- [ ] **Step 3: Add the FR11 rows to the Section 12 table**

Find:

```
| FR10.6 | `S14` |
```

Replace with:

```
| FR10.6 | `S14` |
| FR11.1 | `S19` |
| FR11.2 | `S19` export |
| FR11.3 | `S19` no-data states |
```

- [ ] **Step 4: Correct the stated leaf count in Section 12**

Find:

```
All sixty-one leaf requirements from `srs.md` Section 4. The same mapping fills the empty column in the SRS traceability matrix.
```

Replace with:

```
All sixty-four leaf requirements from `srs.md` Section 4. The same mapping fills the empty column in the SRS traceability matrix.
```

- [ ] **Step 5: Add the export boundary to Section 14**

Find:

```
- No screen loads a map tile or anything needing an API key.
- No screen plays video.
```

Replace with:

```
- No screen loads a map tile or anything needing an API key.
- No screen plays video.
- No screen exports through a hosted service. `S19` generates its export in the browser.
- No screen forecasts. `S19` reports what happened and says so in words.
```

- [ ] **Step 6: Verify the corrections landed and no stale count remains**

Run:
```bash
grep -n "sixty\|Sixty" design.md; grep -n "defaulting to" design.md; grep -c "FR11\." design.md
```
Expected: the count line reads `sixty-four`; the thresholds row names both defaults separately; `FR11.` appears at least `3` times.

- [ ] **Step 7: Verify the file is still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' design.md; grep -n -- "--" design.md
```
Expected: no output from either command.

- [ ] **Step 8: Commit**

```bash
git add design.md
git commit -m "docs(design): trace FR11 and S18, correct the threshold defaults row"
```

---

### Task 6: Correct `wireframes.md` and `CLAUDE.md`

**Files:**
- Modify: `wireframes.md` (Section 5 zone table)
- Modify: `CLAUDE.md` (stack line, design token rule)

**Interfaces:**
- Produces: a canonical dataset that is internally consistent, which plan 2 seeds the mock data layer from, and a `CLAUDE.md` that names the file Tailwind 4 actually uses, which plan 1 reads before scaffolding.

- [ ] **Step 1: Correct the Zone A peak cell**

Zone A is stated as risk 0.31 in band `NORMAL`, yet its peak cell is given at 0.44. Zone risk is the maximum score across the zone's observed cells (FR4.5, decision D13), so a peak of 0.44 would make the zone 0.44 and put it in the `WATCH` band. The row contradicts itself, and plan 2 seeds the mock layer from this table, so the contradiction would otherwise become a bug in code.

Find:

```
| A Concourse | 0.31 | `NORMAL` | 656 | 32 | 24 | 88 | ~1,480 | `C-012-034` at 0.44 |
```

Replace with:

```
| A Concourse | 0.31 | `NORMAL` | 656 | 32 | 24 | 88 | ~1,480 | `C-012-034` at 0.31 |
```

- [ ] **Step 2: Verify no other frame states the old figure**

Run:
```bash
grep -rn "0.44" wireframes.md wireframes/*.html
```
Expected: no result pairs `C-012-034` with `0.44`. If any wireframe HTML does, correct it there too, since Section 5 states that every frame transcribes this dataset.

- [ ] **Step 3: Update the `CLAUDE.md` stack line**

Find:

```
**Stack: React (PWA) + Vite + Tailwind CSS, Leaflet for the map, Recharts for timelines.**
```

Replace with:

```
**Stack: React (PWA) + TypeScript + Vite + Tailwind CSS, Zustand for live state, Leaflet for the map, Recharts for timelines.**
```

- [ ] **Step 4: Correct the design token rule to name the file Tailwind 4 uses**

Tailwind 4 has no `tailwind.config.js`. The guarantee the rule asks for is unchanged, but a plan 1 implementer reading the current wording would create a file the toolchain ignores.

Find:

```
- DO NOT hardcode design tokens inline. Colours, spacing and typography live in the Tailwind theme config; the four observation states and the four risk bands are named tokens there, so one edit restyles every surface consistently.
```

Replace with:

```
- DO NOT hardcode design tokens inline. Colours, spacing and typography live in the `@theme` block in CSS, which is where Tailwind 4 keeps the theme; there is no `tailwind.config.js`. The four observation states and the four risk bands are named tokens there, so one edit restyles every surface consistently.
```

- [ ] **Step 5: Verify both files**

Run:
```bash
grep -n "C-012-034" wireframes.md; grep -n "@theme\|Zustand" CLAUDE.md; grep -n "tailwind.config" CLAUDE.md
```
Expected: the peak cell reads `0.31`; `@theme` and `Zustand` each appear; `tailwind.config` appears only inside the sentence saying there is no such file.

- [ ] **Step 6: Verify both files are still pure ASCII and free of double hyphens**

Run:
```bash
LC_ALL=C grep -n '[^ -~]' wireframes.md CLAUDE.md; grep -n -- "--" wireframes.md CLAUDE.md
```
Expected: no output from either command.

- [ ] **Step 7: Commit**

```bash
git add wireframes.md CLAUDE.md
git commit -m "docs: correct zone A peak cell and the Tailwind token location"
```

---

## Definition of done for this plan

- [ ] `srs.md` holds 64 leaf requirements, FR11 among them, and every sentence stating the count says sixty-four.
- [ ] `srs.md` Section 3.5 declares `querySuggestions` and `getAnalytics`, and Section 3.3 defines `AnalyticsSummary`, so no screen in `design.md` needs data the contract does not expose.
- [ ] `srs.md` Appendix C records D22 and D23 with their reasoning.
- [ ] `design.md` lists `S18` at `/suggestions` and `S19` at `/analytics`, both Coordinator and Administrator, in the navigation table, the screen inventory, the detail sections and the traceability matrix.
- [ ] The `S11` step 7 row names both threshold defaults separately.
- [ ] `wireframes.md` Zone A peak cell reads 0.31, consistent with the zone's stated risk and band.
- [ ] `CLAUDE.md` names TypeScript, Zustand and the `@theme` block.
- [ ] All four files are pure ASCII, contain no double hyphens and contain no emoji.
- [ ] No application code, dependency or configuration file was created. This plan is documentation only.

**Forward interface for plan 1.** The `CLAUDE.md` Commands section still carries its "not scaffolded yet" placeholder. It instructs that the real scripts replace it in the same change that adds them, so plan 1 does that, not this plan.
