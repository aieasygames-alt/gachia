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
- Executor commit: `44a1a2b216b2f138819a533ca1759cfad58a95fa`, pushed to `codex/payload-unified-maintenance`.
- First exact remote executor CI: https://github.com/aieasygames-alt/gachia/actions/runs/42559385332 failed in the fixed-adapter child process at its unchanged 900-second timeout. The first 117 child cases completed without an assertion failure; 17 were not reached. The overall CMS result was 438 passed / one failed wrapper, so later CI gates did not run. See `ci-failed.log`. This is not exact-CI acceptance and does not permit the real audit.

The integration tests retain the existing documented isolation boundaries. They do not claim a real cloud promotion or a complete no-substitution fresh-source writer qualification.

The new historical promotion-source reader was also run against the real R89 sealed chain, using its original observation time rather than today's clock. It reopened all 115 sources / five owners and verified ancestor CI in 207.843 seconds. Original request and source bytes were unchanged. See `sealed-source-verification.json`, pin `38d53dc23f2d6ac12cc308b348d78ec2071ee2b49c049266522a87cffd5bb164`. This was not a new live observation or freshness renewal.

## Bounded CI Follow-Up

The fixed-adapter fixture now supports exactly two ordinal shards in separate child processes. Its default direct invocation still registers all 134 cases. The wrapper runs both shards, requires 67 passing cases each, zero failures/cancellations/skips, and 134 unique test names across the union. Each child's existing 900-second timeout is retained. The registered-case assertion prevents adding a case without updating complete coverage expectations. Production code, source freshness and acceptance rules are unchanged by this test-runner fix.

The complete local CMS suite is being rerun. The runner fix must also pass a new exact remote CI before any real baseline or promotion audit. No real baseline or promotion audit was attempted after the failed CI.

## Operational Status

This checkpoint has not uploaded, promoted, advanced sources, edited CMS content or changed the installed application. R83/R86 stopped evidence and R89 completed previews are preserved.

After exact CI, use a new read-only baseline and promotion audit to verify this input against the actual R89 release. Record elapsed time before considering the one-time promotion; the combined preview renewal and repeated production checks must fit their existing freshness constraints. Do not rerun the uploader or successful completion, rewrite timestamps, automatically retry a failed operation, or deliberately start a predictably incomplete deployment.

Formal qualification is still limited to 11 Main games / 237 existing Chinese guide bodies, one record per release. All-game/all-content formal publication is not complete. Four independent sites, remaining Main content types, Sea derived pages, additions, withdrawals, structure and media remain separate work.

Disk preflight: approximately 21 GiB available. No files were removed.
