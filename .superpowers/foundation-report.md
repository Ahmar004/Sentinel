# Sentinel front-end foundation - build report

Status: complete. All 7 groups built and committed in order; `npm run lint`, `npm run build` and `npm test` pass clean.

## Commit SHAs

| Group | Commit | Summary |
| - | - | - |
| 1 | `6c5880a` | Scaffold Vite + React + TypeScript + Tailwind app shell |
| 2 | `471656f` | Add domain layer: constants, fixed parameters, and wire/entity types |
| 3 | `2060305` | Add SentinelClient interface (srs.md 3.5, verbatim) |
| 4 | `4259352` | Add theme tokens and the cell-treatment mapping |
| 5 | `39b634a` | Add the permission matrix, nav entries and landing routes |
| 6 | `ec2b28a` | Add zustand stores: session, config and push-driven live state |
| 7 | `8873fe3` | Add routing, role-gated screens and the application shell |

## What was built

- **Scaffold**: Vite 8, React 19.2, TypeScript 5.9.3 (strict), Tailwind 4.3 via `@tailwindcss/vite` (CSS-first `@theme`, no `tailwind.config.js`), ESLint 10 flat config with a `no-restricted-imports` rule limiting `@/client` imports to `src/store` (and to `*.test.*` files, for fakes), vitest 5 + Testing Library + jsdom, vite-plugin-pwa precaching the app shell only. `CLAUDE.md`'s `## Commands` section replaced with the real scripts.
- **`src/domain/`**: `constants.ts` (every enum from srs.md Appendix A, verbatim), `parameters.ts` (every fixed value from srs.md 2.7), `types.ts` (the `CellObservation` honesty-invariant discriminated union plus every payload/entity type from srs.md 3.3 and Section 5), `cellObservation.ts` (`toCellObservation`, narrowing a wire `CellUpdate` into `CellObservation`, throwing on a malformed `OBSERVED` payload rather than guessing).
- **`src/client/SentinelClient.ts`**: the full interface from srs.md 3.5, verbatim, interface only.
- **`src/theme/`**: `theme.css` (`@theme` tokens: dark blue default, light greyish/cream alternate via `data-theme`, four risk bands, density ramp and observation-state fills), `cellTreatment.ts` (`getCellTreatment`, the single place fill/pattern/outline are decided from a `CellObservation`).
- **`src/auth/permissions.ts`**: one `PERMISSION_MATRIX` (srs.md 2.4, including "View reporting and analytics"), `navEntriesForRole`, `landingRouteForRole`.
- **`src/store/`**: `sessionStore`, `configStore`, `liveStore` (write-restricted to its own subscription; only `useCell`/`useZone`/`useDrone`/etc. selector hooks are exported), `clientRegistry` (the one place a `SentinelClient` instance is registered).
- **Routing and shell**: all 19 screens S01-S19 routed (`src/routes/routeConfig.tsx`), role-gated by `RequireRole` to `/403`; S01 Login and S16 Not permitted are real, the rest are placeholders. `AppShell`/`Nav`/`TopBar` implement design.md 3.1 at the single 768px breakpoint.

## Verification output

### `npm run lint`
```
> sentinel@0.1.0 lint
> eslint .

(no output - clean)
```

### `npm run build`
```
> sentinel@0.1.0 build
> tsc -b && vite build

vite v8.2.2 building client environment for production...
transforming...
✓ 1895 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.30 kB
dist/index.html                   0.68 kB │ gzip:  0.39 kB
dist/assets/index-B5vgB1Rj.css   14.37 kB │ gzip:  3.81 kB
dist/assets/index-BXTdjoOA.js   254.48 kB │ gzip: 81.54 kB

✓ built in 362ms

PWA v1.3.0
mode      generateSW
precache  7 entries (263.66 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

### `npm test`
```
> sentinel@0.1.0 test
> vitest run

 RUN  v5.0.0 D:/7_FYP/Sentinel/github-repo

 Test Files  4 passed (4)
      Tests  24 passed (24)
```

Test files: `src/theme/cellTreatment.test.ts` (6), `src/auth/permissions.test.ts` (9), `src/domain/cellObservation.test.ts` (4), `src/screens/S01Login.test.tsx` (5) = 24 total.

## Notes and open items for later steps

- `roadmap.md` had an uncommitted working-tree change already present before this session started (Rule-5/Rule-6 and a `required-pages.md` reference added to Step-6). It was left untouched and uncommitted, as it is outside this task's scope.
- `SentinelClient` has no concrete implementation yet (no `MockSentinelClient`); that is out of scope for this foundation pass and is expected in a later roadmap step. `src/store/clientRegistry.ts` throws a clear error if a component tries to use the store before `setSentinelClient()` is called at the app root.
- `configStore` has no hydration path yet because the `SentinelClient` interface (srs.md 3.5, implemented verbatim) has no `getZones`/`getExits`/`getThresholds` read method - only `getSiteState` (site + grid + live cells/zones/drones) and the save/put/delete methods. Config screens will need either a bootstrap payload from the mock layer or an SRS amendment; flagged here rather than inventing a method.
- Density-ramp bucket boundaries in `cellTreatment.ts` are anchored to the default density threshold (4.0/sqm, srs.md 2.7) since no other density scale is specified; documented in code.
