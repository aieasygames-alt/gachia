# R87: Bounded HTML Fingerprint Processing

## Delivered

The R86 stop originated in `unifiedPageFingerprints`: a single Python invocation processed an entire reference corpus with a fixed 30-second timeout. The caller now partitions input into at most 32 pages and 4 MiB of serialized JSON per invocation. An individually valid page larger than that batch budget runs alone, without truncation. The existing 16 MiB page and 2,500-page coverage limits remain.

Both versioned Python parsers are unchanged. Output ordering, fingerprints and parser pins remain compatible with historical receipts. Each process still has a 30-second timeout and a 32 MiB output limit. Any process failure or malformed result rejects the entire call; there is no retry, partial acceptance, persistent cache or freshness-window change.

## Verification

- Preview/completion/promotion protocol tests: 129 passed, zero failures or skips, including five new batching cases.
- CMS preview and uploaded-pair fixed-entry tests: 23 passed, zero failures or skips.
- CMS TypeScript check: passed.
- `verify-sealed.mjs` reopened the real R79 local preview contract using the fixed verifier, including transport evidence and saved HTTP bodies. All six owner/role combinations passed: Genshin 537 per role, NTE 371 per role, Main 1,318 per role; 4,452 total responses. Elapsed time: 15.794 seconds. See `sealed-verification.json`.
- The sealed check compared both Python parser files byte-for-byte with `c2335b1171d005509b290f7d8ab22f7429d62f41`; the original preview pin remains unchanged.

This verifies compatibility on the real sealed corpus, not a fresh production observation or a completed cloud publication. The new source has not yet received exact-commit remote CI. No CMS content, database, installed application, uploaded version or public deployment was modified. No historical artifacts were deleted.

## Next Delivery Boundary

R86 remains stopped and its exclusive journal cannot be reused. The next continuation must explicitly bind both the original R83 upload-stop evidence and the R86 completion-stop journal, prove the same two UUIDs and release identity, and reject unknown writes, changed evidence or other stop conditions. A separate exclusive directory/journal must preserve those ancestors. Fresh source/CMS/module/topology checks and fresh HTTP observations remain required; the old passing HTTP files do not grant promotion authorization.

After that entry and its historical reader have regression coverage and exact-commit CI, execute one read-only continuation and independently verify its completed receipt. Public promotion, public acceptance and source advancement are subsequent steps. Formal all-game/all-content coverage is still incomplete.
