# R55: Fixed cloud reads and executor source integrity

This increment continues phase 1. It does not expand editorial qualification,
install the current executor, modify CMS records or perform cloud writes.

## Fixed Adapter Qualification

The independent fixed-adapter suite no longer replaces `desktopCloudSnapshot`.
Recovery, read-only preview renewal and source advancement now run the real
snapshot reader and the real production GET transport against isolated HTTP
responses. Each complete snapshot reads deployments, settings and subdomains
for all seven protected services, plus scripts, routes and domains (24 reads).

Eight added cases verify complete endpoint coverage and rejection of HTTP 503,
split deployment, router settings drift, subdomain drift, unexpected scripts,
routes and domains. Failed source advancement emits no consumable source index
and performs no cloud writes.

This removes one internal mock boundary, not all of them. Historical publication,
current executor entry and build verification remain substituted in the combined
suite; local serving still uses a synthetic HTTP server. Network responses are
synthetic. This is not real cloud acceptance or complete production qualification.

## Executor Integrity Fix

The previous verifier retained its initial index file list. Files added and staged
after capture could escape both that fixed list and the untracked-file check.
Already-staged deletion could also shrink the initially checked executor set.

`captureUnifiedExecutorSource` derives the required inventory from the exact HEAD
tree, compares it with the current index, and checks disk bytes against Git blobs.
Each recheck repeats the inventory, untracked-file and HEAD checks. The fixed
production verifier also rechecks immediately after its asynchronous CI read.
The production entry still resolves its own checkout and retains the single-Mac
gate; no CLI repository override, skipped CI or injected verifier was added.

Twelve tests use small real temporary Git repositories, not mocked Git output.
They cover initial and subsequent edits, untracked files, staged additions,
staged deletions, renames and changed HEAD, while allowing unrelated reports.
Test-owned repositories are removed on completion.

## Local Verification

- CMS: 362/362 passed, including the independent fixed-adapter suite's 72/72
  cases with no skipped cases.
- Real Git executor tests: 12/12 passed, also rerun after the byte-hash typing fix.
- Cloud release, manual recovery, source advancement, documentation and scope
  tests: 139/139 passed.
- CMS TypeScript and `git diff --check` passed.

These results are local verification, not exact-commit CI or cloud evidence.

## Remaining Work

R54 changes remain in this working tree and are included in regression coverage.
There is no new exact-commit CI result, real preview renewal, deployment, public
acceptance or production source advancement. Phase 1 is not closed; phases 2-5
remain pending. Keep the private promotion/recovery writers closed until the
remaining fixed-chain qualification is complete.

Disk observation: about 28 GiB free. No persistent cache, backup, build artifact,
historical cloud evidence or game content was deleted.
