# R64: complete sealed local preflight regression

## Scope

Added the explicit `pnpm test:local-sealed` command. It opens the retained real historical publication with the real historical reader, reconstructs isolated CMS responses from its sealed review, and calls the complete `verifyUnifiedProductionLocal` without replacing any verifier.

The local preflight reads the real preview/transport/publication/build evidence, current 115-source plan, editorial selection and active baseline, exact Git sources, installed application and preservation catalogs. CMS HTTP responses alone are synthetic. Network requests are intercepted and restricted to read-only loopback paths, with the expected credential, query and redirect policy checked. No real CMS or cloud request is made.

Five cases cover successful composition, caller mutation during the first HTTP read, insufficient reviewer role, changed review on the final read, and transport failure. Original selected evidence files must retain their digests after each case. The test does not copy builds or mutate the installed application.

## Reproduction

From `services/content-cms`, explicitly supply the retained history request:

```sh
UNIFIED_SEALED_LOCAL_HISTORY=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-unified-history-2026-11-06-r50/request.json \
UNIFIED_SEALED_LOCAL_HISTORY_PIN=f063c28266887c1aed85ebf3d71d4c0be5bc628059451d5b61b392613aa2288d \
pnpm test:local-sealed
```

Missing evidence parameters fail instead of skipping. This machine-specific regression is deliberately separate from default CI tests.

## Verification

- Explicit sealed local run: 6/6 passed (five cases plus parent), zero skipped, approximately 372 seconds. It reopened 115 sources and one selected record against installed source `7b12684262338511bbcc2d3468bacaeff9a2404a`.
- Missing-parameter invocation: exit 1 with the required explicit history path/pin assertion, as intended.
- Installed application and production unit regressions: 34/34 passed.
- Documentation and verification scope gates: 38/38 passed.
- `pnpm typecheck` and `git diff --check`: passed.
- The complete default CMS suite was not rerun in this round.

## Remaining Work

This is not current CMS approval, exact-current-commit CI, cloud preview renewal, public activation or real source advancement. The default fixed promotion combination still isolates its local preflight and historical root; this separate regression does not remove those substitutions from that combination. The Ananta single-record pilot restriction is unchanged.

Available disk space remains approximately 27 GiB; no large build, resident install or cleanup was performed.
