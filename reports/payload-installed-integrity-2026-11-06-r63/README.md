# R63: installed application integrity

## Changes

- Extracted the installed application check into `src/unified-installed-application.ts`, shared by the real production local preflight and isolated filesystem tests. The production caller still fixes the root to this Mac's GachiaCMS installation; no request option can redirect it.
- Validates pinned manifest location, configured installed app, source commit, build ID, exact Git source inventory, application bytes and release bytes. Empty inventories, array inventories, invalid file paths and malformed digests fail closed.
- Local preflight snapshots its request before asynchronous work and rechecks installed application integrity after the final formal CMS review read.
- Added 16 tests using a real temporary Git repository and real files, including changed source with recomputed manifest pin, missing source, runtime/release corruption, linked settings and changes between consecutive checks. Temporary directories are removed by test teardown.

## Verification

- `node --import tsx --test tests/unified-installed-application.test.ts tests/unified-production.test.ts`: 34 passed, zero failed/skipped.
- `pnpm typecheck`: passed.
- Documentation and verification scope tests: 38 passed.
- `git diff --check`: passed before this report was added; checked again after documentation edits.
- Read-only execution of the same installed checker against the R48 request's pinned real application manifest: passed, 711 application files and 184 release files. Source commit remains `7b12684262338511bbcc2d3468bacaeff9a2404a`.
- This installed check did not contact the database, CMS HTTP endpoints or cloud. It did not install or modify the resident app.
- Available disk space: approximately 27 GiB. No large build or cleanup performed.

## Remaining Boundary

The fixed promotion combination still substitutes `verifyUnifiedProductionLocal`; these tests do not remove that substitution. Historical root isolation also remains. No full CMS suite, exact-current-commit CI, cloud renewal, upload, public activation or real source advancement was performed in R63. Existing source authentication requirements are not expanded.

Next work remains the complete fixed local preflight composition (real CMS review reader plus sealed build/editorial/installation evidence), followed by current executor CI and the real Main-only public acceptance/source advancement loop. The single Ananta pilot restriction is unchanged; all-game production readiness is not yet achieved.
