# jscpd Top-20 Duplicate Clusters (summary)

Generated: 2025-12-14

This file summarizes the top-20 duplicate clusters found by `jscpd` (targeted source-only scan).

1. lines=645 — markdown — Duplicate README/CHANGELOG in multiple `node_modules` copies (dotenv)
   - Files: `packages/api/node_modules/dotenv/README.md` ↔ `packages/core/node_modules/dotenv/README.md`
   - Suggestion: Exclude `**/node_modules/**` from jscpd scans (already recommended). Low priority to fix in-source.

2. lines=506 — markdown — `CHANGELOG.md` duplicated across package-level vendor copies (dotenv)
   - Suggestion: Exclude vendor docs; or consolidate shared dependencies to root `node_modules`.

3. lines=411 — markdown — `README-es.md` duplicated across dotenv copies
   - Suggestion: Exclude vendor files from scan, or prune nested node_modules.

4. lines=386 — javascript — `dotenv/lib/main.js` duplicated across packages
   - Suggestion: dependency deduplication (hoist to root) or exclude `node_modules`.

5. lines=163 — markup — generated coverage HTML duplicated between coverage reports
   - Files: `packages/sdk/coverage/lcov-report/index.html` ↔ `packages/api/coverage/lcov-report/index.html`
   - Suggestion: Exclude `**/coverage/**` from scans; these are generated artifacts.

6. lines=162 — typescript — duplicated `lib/main.d.ts` (dotenv types)
   - Suggestion: dedupe type definitions by hoisting dependencies or using package-level type re-exports.

7. lines=121 — typescript — duplicated `.d.ts` type declarations across package node_modules
   - Suggestion: use a single source-of-truth for shared types, publish internal `@tg-payment/types` package.

8. lines=86 — typescript — duplicated `@types/uuid/index.d.ts`
   - Suggestion: ensure consistent devDependency versions and hoist types to root.

9. lines=64 — javascript — duplicated small helper in multiple `dist` builds
   - Suggestion: move shared helper into `packages/core` and import rather than copy.

10. lines=58 — typescript — test scaffolding duplicated across multiple `__tests__`
    - Suggestion: extract common test helpers into `test-utils` and import in tests.

11. lines=52 — markup — coverage fragment duplication
    - Suggestion: exclude generated coverage HTML from jscpd.

12. lines=48 — typescript — duplicated DTO/interface declarations in multiple packages
    - Suggestion: consolidate into `@tg-payment/core` types export and import from there.

13. lines=44 — javascript — small runtime shim duplicated in two packages
    - Suggestion: share via workspace import rather than copying into builds.

14. lines=40 — typescript — duplicate test harness code
    - Suggestion: centralize test harness in `test-utils`.

15. lines=39 — typescript — duplicated `.d.ts` helper types across packages
    - Suggestion: publish internal type package or re-export from core.

16. lines=36 — typescript — duplicated constants/config samples
    - Suggestion: move canonical config into single package and reference.

17. lines=34 — typescript — small parsing helper duplicated
    - Suggestion: refactor into `packages/core/src/utils` and import.

18. lines=32 — markup — generated docs duplication
    - Suggestion: exclude generated docs from jscpd or move generation output to `docs/build` ignored by scan.

19. lines=30 — javascript — duplicated dist artifacts from build step
    - Suggestion: avoid including `dist` in scans and ensure builds don't embed copies of shared code.

20. lines=28 — typescript — duplicated stub implementations in tests
    - Suggestion: extract stub factories into shared test utilities.

High-level recommendations
- Update jscpd config to exclude `**/node_modules/**`, `**/coverage/**`, `**/dist/**`, and generated docs.
- For source-level duplicates (types, DTOs, helpers, test scaffolding): extract into a shared package (`packages/core` or `@tg-payment/types` / `test-utils`) and import from there.
- Prefer dependency hoisting to root `node_modules` to reduce duplicate copies of third-party libraries and their types.

If you want, I can: (A) add a `jscpd` config file that excludes common generated/vendor paths, (B) open PRs to extract top 5 real-source duplicates into shared modules, or (C) run a focused refactor on test helpers now.
