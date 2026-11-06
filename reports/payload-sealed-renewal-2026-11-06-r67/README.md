# R67: sealed promotion and renewal composition

Extends `test:promotion-sealed` beyond opening the promotion: the real `renewUnifiedMainPreviews`, preview-network adapter, streaming HTML/JSON/robots validators, receipt writer and independent preview rereader run against retained real build and installation evidence. The successful renewal runs the real final production verifier again, including current-formal-document checks against isolated CMS HTTP responses and source identity checks against isolated cloud responses.

Only Playwright's HTTP client context is substituted for preview reads. Its responses use the verified sealed build's response bodies, with explicit preview noindex/robots behavior. Tests assert the actual adapter requests verified TLS, no cookies, zero retries and zero redirects and releases every buffered response/context. This is synthetic HTTP, not a fresh observation of the real uploaded Worker.

## Checks

- Successful renewal preserves exact candidate/recovery version and module identities, links the old evidence digests and creates separate new evidence in a temporary directory.
- Both new response sets reopen through the real independent validator; tampered saved body bytes are rejected.
- Wrong robots content and unexpected cookies reject renewal, retain failed diagnostics and never create a success receipt.
- The original preview receipt and selected original evidence remain unchanged.
- All output is inside the disposable test directory; no simulated publication receipt is written into real sealed release directories.

## Reproduction

Use the same explicit inputs as R66, from `services/content-cms`:

```sh
UNIFIED_SEALED_PROMOTION_HISTORY=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-unified-history-2026-11-06-r50/previews-request.json \
UNIFIED_SEALED_PROMOTION_PIN=6ce31beb55834442e79d9f0c4d5f7a87f55f534a148a1d369f282f295ecdc6dc \
UNIFIED_SEALED_PROMOTION_NETWORK=/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia/reports/payload-main-promotion-2026-11-06-r49/network-selection.json \
pnpm test:promotion-sealed
```

## Verification

- Complete sealed promotion/renewal regression: 9/9 passed, zero skipped, approximately 408 seconds (`promotion-renewal.log`).
- 115 real sealed sources, six isolated CMS reviewer reads, six executor checks and 187 intercepted CMS/CI/cloud GETs. The real local verifier and historical reader were not replaced.
- Three preview HTTP client contexts opened and closed; all 2,545 synthetic buffered responses disposed. Successful renewal itself took approximately 89 seconds, including its real final production verification.
- Both rejection cases left failed diagnostics but no successful renewal receipt. Original selected evidence pins remained unchanged.
- Type checking passed.
- Proxy network, documentation and verification-scope tests: 41/41 passed, zero skipped.
- The default full CMS suite was not rerun in this round; R65's 379/379 result remains separate evidence.
- Disk available during the run: approximately 28 GiB. No user files or production build caches were deleted.

## Remaining Gates

The private deployment writer, real public acceptance and actual source advancement are not exercised by this sealed-evidence regression. Current-code exact CI and actual fresh cloud observations remain required. No real cloud/CMS requests, content edits, resident installs or broadened game authorization occur in this round. R65's real resident CMS audit remains separate from these synthetic HTTP responses.
