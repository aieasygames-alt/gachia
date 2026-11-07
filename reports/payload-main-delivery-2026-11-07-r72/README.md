# R72: single Main delivery objective

The sole delivery objective is to publish the already-reviewed Ananta Chinese installation guide to Main, verify the public result, and advance its source baseline. Other games, new fields, broad framework work and further generic hardening are out of scope unless they block this delivery.

## Supported execution entries

The existing fixed promotion and compatible recovery functions are now exported and reachable through their CLIs. No protocol, production request grammar, game qualification, cloud adapter or authorization check is replaced. Both write actions require a separate explicit 64-character release key, which the fixed function compares with the verified release identity. The existing audit/renew actions reject that write-only argument.

From `services/content-cms`, the supported forms are:

```sh
pnpm exec tsx scripts/unified-promotion.ts promote --request REQUEST --pin SHA256 --output NEW_RESULT --release-key RELEASE_SHA256
pnpm exec tsx scripts/unified-recovery.ts recover --request RECOVERY_REQUEST --pin SHA256 --output NEW_RESULT --release-key RELEASE_SHA256
```

The promotion performs fresh preview verification itself; R69's observations cannot authorize this new write. Recovery is a separately authorized action against a recorded stopped promotion, not automatic rollback. A timeout or unknown result requires read-only reconciliation, never blind replay. Canonical execution evidence stays in the frozen build; `--output` is an exclusive local copy of the result.

The fixed adapter suite now uses the actual exported functions without the former test-only export hook. Argument regressions reject missing/malformed release keys, retries and injected force/authority before credentials or pinned request reads.

CI and actual execution outcomes are recorded separately under this report directory. Opening the CLI is not evidence that publication succeeded. No other game's qualification is expanded.

Local verification: CMS 379/379 (336 seconds), typecheck passed, documentation/scope gates 38/38. No tests were skipped. Exact-commit CI and the real promotion result are pending at source checkpoint creation.
