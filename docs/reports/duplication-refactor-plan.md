# Duplication Refactor Plan

This short plan is derived from the existing `jscpd` duplication report (`docs/reports/duplication-report.json/jscpd-report.json`). It identifies the top hotspots and proposes small, actionable refactors to reduce duplication and improve maintainability.

Top hotspots (summary)

- Test scripts duplication
  - Files: `packages/api/scripts/test-fees.js`, `packages/api/scripts/test-auth.js`, `packages/api/scripts/test-conversion.js`, `packages/api/scripts/test-payment.js`
  - Problem: repeated test scaffolding, request building, seeding helpers
  - Refactor: extract shared helpers into `packages/api/test-utils/` or `tests/utils/` with functions: `buildTestApp`, `seedTestData`, `createTestUser`, `requestWithAuth`

- Controller boilerplate duplication
  - Files: `packages/api/src/controllers/*` (payment, conversion, fee-collection, admin)
  - Problem: repeated validation, error handling, response formatting
  - Refactor: add `packages/api/src/utils/response.ts` and `utils/validate.ts` + small `wrapController(fn)` helper that centralizes try/catch and standard response shape

- Worker lifecycle & shutdown logic
  - Files: `packages/core/src/workers/fee-collection.worker.ts`, `webhook-dispatcher.worker.ts`, `deposit-settlement.worker.ts`
  - Problem: repeated start/stop, interval handling and shutdown wiring
  - Refactor: move worker lifecycle to `packages/core/src/workers/worker-utils.ts` with `startWorker(intervalMs, fn)` and `stopWorker()` helpers

- Export CSV / client-side duplication
  - Files: `packages/dashboard/src/utils/exportCsv.ts` and table components
  - Problem: repeated CSV generation and table markup across pages
  - Refactor: centralize CSV utilities and small presentational components for tables

Small phasing plan (3 sprints / tasks)

1. Tests consolidation
   - Create `packages/api/test-utils/index.ts` with exported helpers.
   - Replace duplicates in `packages/api/scripts/*.js` and `packages/core/src/__tests__/*` to import helpers.
   - Run tests.

2. Worker lifecycle extraction
   - Add `packages/core/src/workers/worker-utils.ts` with start/stop helpers and common SIGTERM wiring.
   - Update `fee-collection.worker.ts` and `webhook-dispatcher.worker.ts` to use helpers.
   - Verify workers still start/stop correctly via unit tests or manual run.

3. Controller and UI cleanup
   - Add `packages/api/src/utils/response.ts` and modify a couple controllers to use `wrapController`.
   - Centralize CSV export utility used in dashboard.

Notes / Risks
- Keep changes small and test-driven: refactor one area at a time and run unit/integration tests to ensure behavior unchanged.
- Prioritize tests consolidation first — it yields immediate maintenance benefits and reduces duplicated test scaffolding shown in `jscpd`.

If you'd like, I can implement step 1 (test-utils) now and update the scripts to use it in a single commit.
