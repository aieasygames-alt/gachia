# R92: Complete Pre-write Qualification and Guarded History Reuse

## Objective

Qualify the existing HI3 release's complete pre-write path before creating its
exclusive promotion journal. Do not upload, rebuild or replace either existing
version, weaken freshness, or replay the successful R89 preview continuation.

## First Read-only Measurement

`qualify.mjs` used executor `2dba812c4cf2015bfccbaf5198e5fe4cee09c6cb`
and its full exact CI `42568051118`. The fixed source-baseline entry passed
1,267 real public responses in 201.406 seconds. The complete active A remained
unchanged. The next stage called the actual `openUnifiedPromotion` and stopped
after 194.135 seconds with `spawnSync python3 ETIMEDOUT`, before preview renewal,
promotion evidence creation, authorization or journal creation.

The observation was 316.007 seconds old at the stop, so this was a parser child
timeout, not source expiry. A global GET-only guard prohibited application and
cloud writes; authenticated CMS login/logout used a separate fixed path. Logout
succeeded. Original historical proofs were checked again after the failure.

- Failure: `failure.json`, SHA256
  `552a09f724b50232a6fdf607e7408f4019185a6ebfe55753eb2ce5cd1ef3b658`.
- No upload, deployment, preview renewal, CMS content edit or source advancement.
- No promotion journal exists. The failed qualification is preserved, not retried.

## Offline Diagnosis

`diagnose-history.mjs` reran only the sealed historical readers with all network
requests forbidden. It traced the original Python executor without replacing
any successful validator result. The complete 115-source / five-owner history
and both original previews passed in 113.580 seconds. All 94 actual parser calls
completed; total parser time was 2.877 seconds and the slowest call was 44 ms.

This does not reproduce or identify the first timeout's root cause. It does
show that this successful read spent most of its time outside Python parsing.
The diagnostic is not fresh production evidence and cannot authorize a write.

Result: `diagnostic-result.json`, SHA256
`4f66b2b504b1533f59d6cc609e1fd0a7a29280f00655bca4021b70398158156d`.

## Changes

- Recursive historical publication reads now join an existing guarded artifact
  inventory session or create one for that independent root read. Only local
  inventories are reused. Every hit still walks the complete tree and checks
  inode, type, link, size, mtime and ctime identity. CMS, cloud, CI, review,
  source, HTTP and publication validation results are not cached.
- Recursive failures invalidate the entire owning session, including when an
  intermediate caller catches the failure. Independent and overlapping root
  operations do not share inventories. Existing explicit verifier sessions
  retain their ownership and busy/failure checks.
- Fingerprint failures now include parser version, page count and serialized
  input bytes, retaining the original error code and cause. The parser bytes,
  32-page / 4 MiB batching, 30-second child deadline and no-retry behavior stay
  unchanged. No request or CLI skip option was added.

## Verification

The two focused release test files passed all 65 tests. New coverage includes
recursive inventory reuse, joining a live verifier session, same-mtime edits
across awaits, caught nested failures, overlapping roots and parser failure
context without retry. CMS type checking and diff checks passed.

The same real offline historical read passed after the change in 83.559 seconds,
versus the previous 113.580 seconds: about 26% less elapsed time in this one
local comparison. See `guarded-history-benchmark.json`. This is not a claim that
the complete pre-write path fits its original 15-minute source window.

Full local regression and exact remote CI are the next gates. Operational
qualification with this implementation has not run yet. Existing HI3 candidate
and recovery versions, public Main and resident CMS content remain unchanged.
Formal scope remains 11 Main games / 237 existing Chinese guide bodies, one
record per release, not all 16 scopes or all content types.

Disk: approximately 19 GiB available at preflight. No cleanup performed; retain
historical publication evidence, frozen inputs, installed releases and backups.
