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

Full local regression passed: CMS 439 tests, release tooling 1,600 JavaScript
and 56 Python tests, 38 documentation/scope checks and CMS types. Implementation
commit `ae0f39759e056daaf858df911351768a339a9b7f` passed all mandatory exact CI
gates in run `42573869451` (18m36s). Independent API verification is saved in
`exact-ci.json`, SHA256
`eee45eedc1a1ee470e8eccd090a2a3e4acf233ace17351aa94745a9188a5abdf`.

An independent real historical regression also passed with all 115 sources,
five owners, both previews and 18 actual GitHub GETs in 102.195 seconds. See
`historical-verification.json`, SHA256
`9fc0ac57cdba44ce4ac041c3681a94625c8fe17c42131196f84ef0e801150d00`.
There were no current CMS/Cloudflare reads or freshness renewal in that read.

## Guarded Implementation Measurement

`qualify-guarded.mjs` made one independent read-only attempt against the verified
new implementation. It pins its own script, rejects all application/cloud
writes and does not instantiate a deployment writer or promotion journal.

- New baseline: 1,267 responses passed, 195.543 seconds.
- Actual promotion opening: passed, 226.418 seconds; source age 345.695 seconds.
- Actual preview renewal: both original UUIDs passed 1,318 responses each;
  final CMS/source/module/topology checks passed, 275.401 seconds total.
- The next actual public-reference projection failed with
  `Unqualified Main public consumer`. The sealed HI3 Chinese guide path was
  still excluded by the old Ananta-only public reader.
- Failure source age: 621.365 seconds, not expired. The protocol's initial and
  final pre-write verification stages were not reached. The complete pre-write
  duration is therefore still unqualified.
- Result: `guarded/failure.json`, SHA256
  `2cc4deb405981f2036baa4f20fdc06d135ae4dfe8cd4e10d0bfa36afef5be91c`.
- No promotion authorization or journal, deployment, CMS content edit or source
  advancement. CMS logout succeeded, original proof pins remain unchanged.

The existing HI3 candidate and recovery versions, public Main and resident CMS
content remain unchanged. The next implementation corrects the public consumer
policy mismatch; see R93. Do not retry this completed measurement or treat its
renewal as reusable write authorization.
Formal scope remains 11 Main games / 237 existing Chinese guide bodies, one
record per release, not all 16 scopes or all content types.

Disk: approximately 19 GiB available at preflight. No cleanup performed; retain
historical publication evidence, frozen inputs, installed releases and backups.
