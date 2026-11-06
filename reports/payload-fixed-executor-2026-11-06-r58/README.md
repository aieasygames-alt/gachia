# R58: Real executor checkout integrity in fixed combinations

This increment continues the first publication qualification without changing
editorial scope or executing cloud writes.

## Shared Read-only Verification

The fixed desktop executor entry now delegates its Git and exact-CI checks to
`verifyUnifiedExecutorCheckout`. The desktop entry still rejects non-Mac/CI
execution and still resolves the current reviewed checkout itself. No production
request or CLI option can select another executor repository or inject verification.

The shared checker captures committed files and bytes, checks the exact CI result
and required successful steps, and rechecks the checkout after the asynchronous
CI reads. It returns the same repeated-verification function used by source
advancement, next-publication preparation and compatible recovery.

## Combined Tests

The fixed-adapter harness no longer returns an executor success stub. It creates
a small real Git repository and delegates to the same checker as production.
Git commands and disk reads are real; GitHub HTTP responses remain synthetic and
are bound to the actual temporary repository commit.

Seven added cases reject dirty bytes, untracked files, staged additions, staged
deletions, edits during CI reads, staged additions during CI reads and a different
CI commit. These must stop before historical publication or cloud reads and must
not create an output directory.

Existing final-executor failure cases now change an actual file just before the
real verifier runs, rather than throwing a simulated verifier error. The harness
restores that test-owned file afterward to independently test that failed output
cannot be consumed or overwritten. Production behavior is unchanged.

## Boundary

The harness still substitutes desktop eligibility and checkout selection to run
on Linux CI with a disposable repository. It does not prove successful execution
of the complete fixed desktop entry against this checkout. Historical publication
is still replaced, external responses are synthetic, and the Worker modules are
not production OpenNext builds. Full production qualification remains incomplete.

No real cloud renewal, promotion, public acceptance, production source advance,
CMS update or installation was performed. These working-tree changes have no new
exact-commit CI result. Private promotion/recovery writers remain closed.

## Local Verification

- Ten targeted checkout/CI and final-failure combinations passed.
- Full CMS suite: 362/362 passed, including the independent fixed-adapter
  process's 89/89 cases with no skipped cases.
- Documentation and verification scope checks: 38/38 passed.
- CMS TypeScript and `git diff --check` passed.

The synthetic GitHub responses test the exact-CI parser and binding, not the
existence of a real successful CI run for these working-tree changes.

Disk observation: about 28 GiB free. Test-owned temporary repositories are cleaned
up; no persistent backups, release artifacts or game content were removed.
