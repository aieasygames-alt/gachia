# R66: sealed promotion opening qualification

## Scope

Added explicit `pnpm test:promotion-sealed`. Unlike the default synthetic fixed-adapter combination, this local regression does not replace `verifyUnifiedProductionLocal` or `readUnifiedHistoricalPublication`. It calls the real `openUnifiedPromotion` with retained R46-R50 evidence and the real installed application, composing local review/export/build checks, five-owner source identity checks, seven-service topology parsing, preservation closure, historical publication and exact uploaded-preview readers.

Only HTTP responses, GitHub credential lookup and desktop executor checkout selection are isolated. HTTP responses are reconstructed from the verified sealed evidence; CI responses are synthetic. Executor verification uses the real checker on a temporary Git repository. Every HTTP call must be GET and match an expected destination; no real network is contacted. No production-ready receipt is written, and the private promotion writer is not invoked.

The regression checks immutable input/credential capture, historical release identity, Main-only preservation closure, both uploaded module identities, rejection of a changed candidate identity, rejection of executor drift before further network reads, and unchanged original evidence.

## Reproduction

From `services/content-cms`:

```sh
UNIFIED_SEALED_PROMOTION_HISTORY=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-unified-history-2026-11-06-r50/previews-request.json \
UNIFIED_SEALED_PROMOTION_PIN=6ce31beb55834442e79d9f0c4d5f7a87f55f534a148a1d369f282f295ecdc6dc \
UNIFIED_SEALED_PROMOTION_NETWORK=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-main-promotion-2026-11-06-r49/network-selection.json \
pnpm test:promotion-sealed
```

The network file is checked against the original preview receipt's pin, not treated as a new route selection. Missing explicit inputs fail instead of skipping. This is an opt-in local evidence test, not a replacement for default CI.

## Verification

- Final explicit run: 6/6 passed, zero skipped, approximately 313 seconds (`promotion-sealed.log`).
- 115 real sealed sources; four synthetic CMS reviewer reads; 74 intercepted read-only HTTP requests; four executor rechecks including the intentional drift rejection.
- The real combination produced the sealed release identity and a Main-only scope with Genshin/NTE preserved, without replacing the local verifier or historical reader.
- Both uploaded modules reopened successfully. Candidate immutable metadata drift was rejected. Executor source drift was rejected before another HTTP request.
- Type checking, 38 documentation/scope tests and diff validation passed. Missing explicit inputs failed as intended.
- An initial local test run was deliberately stopped to correct an overcounted executor-check expectation; production logic was unchanged. The final run above completed normally.
- The default full CMS suite was not rerun in R66; its R65 result remains separate evidence.

## Remaining Gates

This qualifies opening and module identity revalidation, not preview renewal, deployment writing, public acceptance or source advancement through a single fully composed real-evidence run. The default synthetic combination retains its documented boundaries. Actual current-executor CI and fresh cloud observations remain required. CMS responses here are synthetic; the previous R65 audit separately verified the actual resident CMS.

No application install, content edit, cloud write, large production build or cleanup is performed. Only a small temporary executor repository is created and removed.
