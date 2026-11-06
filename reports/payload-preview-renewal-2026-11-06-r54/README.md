# R54: Read-only preview renewal entry

This change adds an operational read-only step toward the first Main publication.
It does not complete the fixed end-to-end production qualification or expand the
single Ananta installation-guide pilot.

## Changes

- `pnpm unified:promotion renew --request FILE --pin SHA256 --output NEW_DIRECTORY`
  reopens the pinned production request using the existing fixed verifier and
  checks both already-uploaded recovery and candidate previews. Output must be
  an absolute, unused directory; its parent must exist.
- The command requires the existing CMS review and Cloudflare credentials and
  GitHub CLI authentication. It uses only the explicitly pinned preview proxy.
  It does not upload, promote, recover, refresh old receipts or change the CMS.
- Successful renewal writes a new `receipt.json` with the original preview pin,
  unchanged version/module identities, new HTTP evidence and acceptance times.
  Failure retains diagnostic files without a success receipt. An existing
  directory is never overwritten.
- Promotion opening snapshots caller request pins before asynchronous work.
  Renewal rechecks the pinned network input before issuing a success receipt.

## Verification Boundary

Six isolated renewal cases cover success, preview failure, module rejection,
review rejection, changed network input and changed cloud topology. They use the
real renewal orchestration and preview response verifier, but mocked external
boundaries. They do not constitute real cloud acceptance or full production
qualification. CLI tests cover rejected write commands and unsafe output paths.

Local verification passed:

- CMS suite: 350/350, including the independent process with 64/64 fixed-adapter
  cases and no skipped cases.
- Preview network, preview response and promotion protocol tests: 66/66.
- Documentation and verification scope gates: 38/38.
- CMS TypeScript and `git diff --check`.

The first regression run exposed colliding eight-character preview UUID prefixes
in the synthetic fixture. The fixture now selects the explicitly revalidated
role and checks the expected host prefix; negative renewal cases assert their
specific rejection reason rather than accepting an unrelated failure.

No real renewal, cloud write, CMS installation, database edit or source advancement
was performed. New changes are not covered by R53's exact-commit CI. The promotion
and recovery writers remain private. Full fixed-chain qualification, new exact CI,
real renewal, controlled promotion, public acceptance and source advancement are
still required before closing phase 1.

Disk check: approximately 28 GiB available. No caches, backups, build artifacts or
historical evidence were deleted.
