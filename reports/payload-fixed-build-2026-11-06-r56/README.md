# R56: Real frozen and build readers in next-batch qualification

This increment continues phase 1 without expanding editorial scope, installing
the executor or changing public content.

## Removed Boundary

The fixed-adapter suite no longer mocks `verifyUnifiedOwnerBuild`. Its next-batch
fixture now writes a pinned frozen manifest, complete active-source files, frozen
source inventory, candidate artifact inventory, build state, consumer expectations
and HTTP response evidence. The fixed next-publication entry and the publication
reader use the real frozen-source and owner-build verifiers to reopen those bytes.

The deliberately incomplete-A case now supplies an internally consistent frozen
build with one source omitted. The real next-source binding rejects it, rather
than a mock returning a mutated in-memory build object.

Eight new rejection cases cover frozen source, active source bytes, runtime
artifact, failed build state, consumer body, consumer expectations, build pin and
frozen manifest. Each must stop before creating a usable next-publication record.
Existing complete publication, expired handoff, failed local HTTP, failed final
executor and asynchronous request-mutation tests remain enabled.

## Limits

These are synthetic preview-only build artifacts and HTTP bodies, not output
from a new OpenNext build. Passing their real evidence readers does not qualify
them for production. The combined suite still replaces historical publication
and the current executor entry, and still serves local acceptance through a
synthetic HTTP server. R55's real cloud snapshot parsing remains in use, with
isolated network responses.

No real cloud renewal, upload, promotion, public acceptance, source advancement,
CMS record edit or installation occurred. The private write entry points remain
closed and the Ananta single-record pilot qualification is unchanged. There is
no new exact-commit CI result for these working-tree changes.

## Verification

- Targeted next-publication combinations: 15/15 passed.
- Full CMS suite: 362/362 passed, including the independent fixed-adapter
  process with 80/80 cases and no skipped cases.
- Documentation and verification scope gates: 38/38 passed.
- CMS TypeScript and `git diff --check` passed.

The CMS total counts the independent-process wrapper once; its eight added
internal cases increase the combined suite from 72 to 80, not the outer total.

## Disk

Approximately 28 GiB remains available. Fixtures are small temporary directories
removed by test cleanup. No frozen production builds, backups, game content or
historical cloud evidence were deleted or copied.
