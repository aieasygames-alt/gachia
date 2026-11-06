# R57: Real Worker execution in next-batch qualification

This increment removes the synthetic local HTTP server from the fixed-adapter
suite. It does not expand editorial scope, install the executor or publish content.

## Implementation

- The combined next-publication path calls the real `prepareUnifiedPublication`
  with no injected serving function or module replacement. Its default
  `serveUnifiedWorker` verifies the frozen tooling lock and starts the pinned
  Wrangler/workerd through `withLocalWorker`.
- The synthetic sealed Main module and next candidate are now executable Worker
  modules. Candidate and compatible recovery are both run locally; the HTTP
  acceptance checks rendered content, all public JSON and their static union.
- The fixture uses the existing installed tooling and a frozen lockfile copy,
  not another dependency installation or production build copy. Each subprocess
  uses isolated HOME, no deployment credentials and disabled telemetry; the
  existing runner terminates its process group on success or failure.
- The test network interceptor permits real credential-free loopback GETs only
  during next-batch preparation. Cloud and GitHub responses remain synthetic.
- New negative cases execute an incorrect candidate body and a syntactically
  invalid module. The existing recovery-body rejection now runs a real Worker
  instead of throwing from a substituted server. All fail without a usable next
  publication and preserve the no-overwrite behavior.

## Boundary

These are small synthetic Worker modules, not production OpenNext builds. The
combined suite now uses the real cloud snapshot parser, frozen/build readers and
local Worker runner. Historical publication and current executor entry are still
replaced. It is not complete production qualification or a real cloud acceptance.

The shared main fixture retains its existing default module bytes for other
protocol tests; executable module bytes are explicitly selected only by this
fixed-adapter suite.

No cloud renewal, upload, promotion, public acceptance, production source advance,
CMS record edit or installation was performed. Private promotion/recovery writers
remain closed. The current working-tree changes have no new exact-commit CI result.

## Verification

- Targeted real-Worker success case and three runtime rejection cases passed.
- Full CMS suite: 362/362 passed, including the independent fixed-adapter process
  with 82/82 cases and no skipped cases.
- Unified promotion, recovery, reconciliation and source protocol suite: 197/197
  passed, including users of the shared main fixture's unchanged default mode.
- Documentation and verification scope checks: 38/38 passed.
- CMS TypeScript and `git diff --check` passed.

These are local results. Real workerd execution is not a real cloud release.

## Disk

Approximately 28 GiB remains available. Only test-owned temporary evidence and
Worker state are cleaned up. No backups, production artifacts, game content or
historical cloud evidence were deleted.
