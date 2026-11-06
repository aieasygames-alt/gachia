# R70: stable source-advance inputs

## Fix

`advanceUnifiedPublishedSources` now captures the cloud credential before the first asynchronous executor verification. Both topology and immutable-version reads use that credential, not the mutable caller object. The source index output directory was already captured at entry and is now explicitly covered by the mutation regression.

`prepareUnifiedNextPublication` now resolves its output directory before asynchronous verification. A caller changing its request or directory during verification cannot redirect the accepted preparation or its failure evidence.

## Verification

The two strengthened regressions failed before the fix: one attempted a cloud read using the mutated credential; the other wrote the preparation to the mutated directory. Both passed after the fix. The preparation regression runs the existing real local Worker consumer checks and verifies the complete previous-owner baseline; cloud responses and historical-root boundaries remain isolated fixture data.

- Focused regression: 2 passed, zero skipped.
- CMS typecheck: passed.
- Complete CMS suite: 379 passed, zero failed or skipped; 363 seconds.
- Shared publication protocol: 197 passed, zero failed or skipped.

The fixed adapter child still requires all 118 cases. No test was removed or skipped. No cloud write or public activation occurred. The previous exact CI for `b02d686` does not cover these new source edits; a new source checkpoint and exact CI are required before using the modified executor for a real operation.

## Remaining work

The first actual Main publication is still pending. Complete composed promotion/recovery/source-advance qualification and supported write entry points remain ahead of the real promotion, public acceptance and source advancement. R69's real preview observations are historical evidence, not indefinitely fresh write authorization. Other games and content types are not qualified by this narrow fix.

Disk free space was approximately 26 GiB during verification. The workspace CMS `.next` cache is approximately 576 MiB and is a possible future cleanup candidate after confirming no process uses it. No cache, backup, historical build or game content was deleted in this round.
