# Held material dependency snapshot

Run `CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/material-dependency-snapshot.ts`
from the CMS directory to rebuild the local pilot snapshot. The command reads
the three pilot raw JSON sources and does not open Payload, write CMS content,
or contact a Worker.

`material-dependency-snapshot-v1` preserves the material and character array
order, every leveling stage, every skill-material row, and each quantity. It
also carries the exact dependency edges and missing identities produced by the
existing review graph. A missing ID remains a missing ID; the snapshot never
renames it, deletes the dangling relation, or chooses a character variant.

The snapshot is content-addressed and rejects edits to the retained payload.
It is a review artifact only: `hold=true`, `executable=false`,
`publishable=false`, and `releaseCompatible=false` are required flags. A
source-bound plan, page/metadata/search/sitemap parity, media evidence, and
CMS approval are still required before any material build or release.
