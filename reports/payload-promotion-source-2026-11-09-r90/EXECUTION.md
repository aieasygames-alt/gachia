# R90: Explicit Fresh Source for Main Promotion

## Delivery Boundary

R89 completed the read-only continuation of the two existing HI3 preview versions. Its historical production request must stay immutable, including the source handoff selected when that completion ran. That handoff is now expired and cannot authorize a new promotion.

The Main promotion request now accepts an optional, explicitly pinned `sourceHandoff`. It may only refresh observations of the same completed publication and source index. The original release key, plan, complete public A and previous artifacts must remain unchanged. The fixed live production verifier still checks the full source chain, current CMS approval, installed application, executor CI, immutable modules and cloud topology. No freshness window is extended.

The original production, audit and preview proofs remain the historical release identity. The new source proof is bound into preview renewal, every promotion journal row and the final receipt. Historical published readers reopen the new observation at the original operation time, require the same source modules and provenance, and verify ancestor CI. Read-only stopped-promotion completion preserves and validates that proof as well. Legacy receipts without an explicit source proof remain compatible.

## Verification

- Focused CMS promotion/source tests: 15 passed, including a four-case fixed-entry child suite.
- Full source-reader integration: six cases passed, reopening a complete five-owner next baseline and rejecting expired operation time, modified public bodies, changed source index, changed modules and changed provenance.
- Promotion protocol and completed-evidence focused tests: 71 passed.
- All unified script tests plus documentation/scope gates: 478 passed, no skips or failures.
- Complete local `pnpm test:release`: 1,576 JavaScript tests and 56 Python tests passed. This additionally covers legacy publishing, recovery, backup and source-continuation contracts; see `release-tests.log`.
- CMS typecheck and `git diff --check`: passed.
- Full CMS suite: 439 passed, including the independently executed 134-case fixed-adapter child suite; no failures, cancellations or skips. Duration: 466.990 seconds.
- Initial implementation commit: `44a1a2b216b2f138819a533ca1759cfad58a95fa`, pushed to `codex/payload-unified-maintenance`.
- First exact remote executor CI: https://github.com/aieasygames-alt/gachia/actions/runs/42559385332 failed in the fixed-adapter child process at its unchanged 900-second timeout. The first 117 child cases completed without an assertion failure; 17 were not reached. The overall CMS result was 438 passed / one failed wrapper, so later CI gates did not run. See `ci-failed.log`. This is not exact-CI acceptance and does not permit the real audit.

The integration tests retain the existing documented isolation boundaries. They do not claim a real cloud promotion or a complete no-substitution fresh-source writer qualification.

The new historical promotion-source reader was also run against the real R89 sealed chain, using its original observation time rather than today's clock. It reopened all 115 sources / five owners and verified ancestor CI in 207.843 seconds. Original request and source bytes were unchanged. See `sealed-source-verification.json`, pin `38d53dc23f2d6ac12cc308b348d78ec2071ee2b49c049266522a87cffd5bb164`. This was not a new live observation or freshness renewal.

## Bounded CI Follow-Up

The fixed-adapter fixture now supports exactly two ordinal shards in separate child processes. Its default direct invocation still registers all 134 cases. The wrapper runs both shards, requires 67 passing cases each, zero failures/cancellations/skips, and 134 unique test names across the union. Each child's existing 900-second timeout is retained. The registered-case assertion prevents adding a case without updating complete coverage expectations. Production code, source freshness and acceptance rules are unchanged by this test-runner fix.

The complete local CMS rerun passed: 439 tests, including all 134 unique fixed-adapter cases, zero failures/cancellations/skips. Total duration was 292.638 seconds (previously 466.990 seconds); the two-child wrapper took 234.838 seconds. Typecheck, documentation/scope gates and diff checks also passed. See `cms-sharded-tests.log`.

The runner correction is committed and pushed as `9edd6205d08009b39a4cb39eb62614e4a231e756`. New exact remote CI: https://github.com/aieasygames-alt/gachia/actions/runs/42561892296 passed in 22m54s. Independent API verification confirmed the exact commit, branch, workflow and every required successful gate; see `exact-ci.json`. The first failed run remains preserved.

After that acceptance, a single real read-only baseline/audit attempt completed using `run-audit.mjs`:

- Fresh baseline: 1,267 responses, 192.949 seconds; complete active pin remained `8589f3b98c8c36df128521f5b12e50ecdfb78fdf9bee12d157cde1f92dd8a28f`.
- Real fixed promotion audit: passed in 267.266 seconds, preserving the historical production/audit/previews and original release key. The installed CMS's current formal review, complete source binding, exact CI and source cloud identities/topology were checked by the real fixed entry, without substituted validators.
- New source handoff pin: `2948d56df144541cb5f4f17d383062c5360284e2e90fd5bc7de1a516e8329cbf`.
- Promotion request pin: `c7ded8197d0aa47ffbc186c4d5f9492ad2521c24dd7072f1d81fef6e8e718f23`.
- Audit result pin: `05bdeb15f00ac949b1517bbca12afa3242a8872d6d778bbd851f5b7d3b7778c4`.
- Source age at audit completion: 379.269 seconds, leaving 520.731 seconds of the existing source window. Baseline plus audit wall time: 460.262 seconds.
- Original pinned proofs were rechecked unchanged, no promotion journal was created, and the CMS session was logged out successfully. There was no upload, deployment or source advancement. This audit did not renew the two preview acceptances.

`verify-audit.mjs` independently passed, reopening the actual new proof against the sealed R89 release, all 115 source observations, five owner module/provenance bindings, complete preview/history evidence and all relevant CI, using the recorded audit completion time. It performed no current CMS/cloud reads or writes. See `audit-independent-verification.json`, pin `e292c61e366c13cae4f7dab2d05ed3bac2c32f7a211686902d82d37355cc6e57`. The original pinned proofs were unchanged. The independent check does not renew source or preview freshness.

## Operational Status

This checkpoint has not uploaded, promoted, advanced sources, edited CMS content or changed the installed application. R83/R86 stopped evidence and R89 completed previews are preserved. The real fresh-source audit has passed; this is not public acceptance or promotion authorization on its own.

The remaining boundary is the full promotion's temporal lifecycle. The measured 379-second source age already excludes preview renewal and all later protocol rechecks/public acceptance. The complete writer has not been timed or shown to fit the original source window, so it was not invoked. Next separate fresh write authorization from post-deployment historical-source integrity checks, while retaining current CMS/module/topology verification and the original pre-write freshness requirement; verify the complete lifecycle before the one-time HI3 promotion, public acceptance and source advancement. This is an identified engineering risk, not an observed new promotion failure. Do not rerun the uploader or successful completion, rewrite timestamps, automatically retry a failed operation, or deliberately start a predictably incomplete deployment.

Formal qualification is still limited to 11 Main games / 237 existing Chinese guide bodies, one record per release. All-game/all-content formal publication is not complete. Four independent sites, remaining Main content types, Sea derived pages, additions, withdrawals, structure and media remain separate work.

Disk preflight: approximately 21 GiB available. No files were removed.
