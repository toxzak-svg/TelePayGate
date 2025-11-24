# Duplicate Bundles (triage)

This file lists prioritized refactor bundles based on the `jscpd` output and estimated effort.

Priority 1 (Low-risk, high-impact)

- Tests: repeated setup blocks and fixtures across `packages/core/src/__tests__` and `packages/api/src/__tests__`.
  - Action: extract `packages/core/src/test-utils.ts` (done for first two files) and `packages/api/src/test-utils.ts` where needed.
  - Estimated time: 2-6 hours (incremental PRs)
  - Estimated PRs: 3-6 (one per logical test area — e.g., dex-integration, auth/tests, fixtures)
  - PRs:
    - refactor/extract-test-utils (PR #21): extracts DEX integration setup into `packages/core/src/test-utils.ts` and updates two tests.
    - refactor/worker-lifecycle (PR #22): adds worker-utils (periodic runner + graceful shutdown) and wires initial workers.

Priority 2 (Low-risk)

- Worker lifecycle code: repeated start/stop/shutdown handlers in `packages/core/src/workers/*`.
  - Action: add `packages/core/src/lib/worker-utils.ts` with StartLoop/StopLoop helpers.
  - Estimated time: 4-8 hours
  - Estimated PRs: 2 (add utils + update 2-3 worker files in focused PRs)

Priority 3 (Medium-risk)

- Controllers: repeated response and error formatting across `packages/api/src/controllers/*`.
  - Action: extract `packages/api/src/utils/response.ts` and apply to controllers in small PRs.
  - Estimated time: 6-12 hours
  - Estimated PRs: 4-8 (one controller area per PR)

Priority 4 (Medium-risk)

- Models: duplicated mapping/parsing across `packages/core/src/models/*`.
  - Action: consolidate mapping helpers in `packages/core/src/lib/mappers.ts`.
  - Estimated time: 4-8 hours
  - Estimated PRs: 2-4

Priority 5 (Low-to-medium risk)

- Dist vs src duplication: compiled `dist` artifacts show duplication with `src` and `node_modules`.
  - Action: ensure `jscpd` ignores `node_modules` and `dist` in CI; focus refactors on `src` only.
  - Estimated time: 1 hour (CI config)
  - Estimated PRs: 1 (CI update)

Notes

- Keep each bundle's PR small and testable.
- Prioritize test fixtures and worker utilities first for quickest wins.
