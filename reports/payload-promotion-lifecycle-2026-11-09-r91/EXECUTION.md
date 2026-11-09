# R91: Promotion Write Authorization Lifecycle

## Objective

Continue the existing HI3 CMS publication without re-uploading its candidate or
compatible recovery. Separate fresh authorization before deployment from
integrity verification after deployment, so the public acceptance pass cannot
invalidate a write that was correctly authorized while fresh.

## Implemented Boundaries

- The fixed verifier captures a single write authorization only after a complete
  fresh verification. It checks the original next-baseline observation window
  again after the final asynchronous topology snapshot and immediately before
  the durable promotion intent.
- The protocol still requires both exact-version preview acceptances and source
  identity to be less than 15 minutes old at every write. One owner's
  authorization cannot authorize another owner. There is no request/CLI flag to
  bypass freshness, review, modules, topology, or public acceptance.
- Post-write verification reopens source history at the captured authorization
  time. It still checks current CMS/local state, all five live immutable source
  identities, ancestor CI, executor integrity, release identity, and topology.
  Preview/renewal bytes and version/module identity remain pinned and unchanged.
- New journals consistently bind `freshnessPolicy: write-boundary-v1` and record
  the authorization in the write intent. Completed receipts bind the same
  per-owner authorization. Historical readers and source advancement validate
  freshness at that intent, not at the end of a potentially long public pass.
- Legacy receipts retain their original stricter acceptance-time semantics.
  Stopped journals cannot be repackaged as completed publications. Existing
  single-attempt, no-retry/no-automatic-rollback behavior is unchanged.

## Verification

Focused protocol/history regression passed, followed by the complete release
suite: 1,595 JavaScript and 56 Python tests passed. CMS type checking and all 38
documentation/scope tests passed. The final full CMS suite passed all 439 tests
in 344.987 seconds, including 148 unique fixed-adapter cases across two complete
74-case shards with no failures, cancellations or skips. Exact remote CI passed
all required gates.

Implementation commit: `2dba812c4cf2015bfccbaf5198e5fe4cee09c6cb`, pushed to
`codex/payload-unified-maintenance`. Full exact CI run
[42568051118](https://github.com/aieasygames-alt/gachia/actions/runs/42568051118)
passed in 23m23s. CMS, inventory/Router, release tooling, public Web/Data,
public-consumer types and documentation/scope gates all passed. The independent
GitHub API verification is saved in `exact-ci.json` (SHA256
`d89d976897b0c2019177f3fa36e06b0b9456504b1a280166071aece4b899d394`).

The initial test run exposed defects in the new expiry fixture, not a production
write: an overwritten preview role selector and repeated clock-method mocks.
The fixture now preserves role selection and advances the complete Date clock
exactly once. The corrected 11-case focused run passed. Two additional fixed
verifier/next-baseline composition cases also passed after completing their
isolated frozen-owner input. Earlier failing test outputs are retained, and the
complete CMS regression subsequently passed against the final fixtures.

The new cases cover deployment/public acceptance crossing the freshness window,
expiry before a write, missing/changed/forged authorization, stale preview at
write, changed current review/module/executor, source body corruption and
ancestor CI changes. No production operation has been started in this round.

## Real Historical Regression

`verify-history.mjs` independently reopened the real R89 historical Main request
using this commit's readers, without substituting publication/module/HTTP/CI
validators. It verified the complete 115-source / five-owner set, both original
version previews and ancestor CI in 142.679 seconds. A network guard permitted
only the 18 actual GitHub API GETs: there were no current CMS or Cloudflare
reads. Selected operational proofs were unchanged before and after the read.

- Result: `historical-verification.json`
- Result SHA256: `3add364ff58a18dda8ee6bca2b8a693d1aa9e2ef546b7c1a96d5ce703237459e`
- Status: `real_historical_preview_and_source_regression_passed`
- No freshness renewal, write authorization, cloud write or source advancement
  is granted by this regression.

## Operational Status

No upload, deployment, preview renewal, CMS content edit, installation, or source
advancement has occurred in R91. R89 and R90 evidence remains unchanged except
for the already-pending R90 documentation close-out. The existing HI3 release
and full public A are unchanged.

Disk preflight: approximately 21 GiB available initially and 19 GiB at the final
local check. No cleanup was performed. Do not delete historical
evidence, frozen sources, backups, or installed releases.

Next: measure/qualify the complete fresh pre-write path before a real
single-attempt promotion of the existing HI3 versions, then complete public
acceptance and source advancement. No earlier successful operation should be
replayed. A code/test success is not a claim that every game/content type is
formally publishable.
