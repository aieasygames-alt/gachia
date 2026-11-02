# Local material route probe

`scripts/material-parity-probe.ts` checks the repository's Next route template
files against the material IDs in the three pilot raw sources. It is deliberately
not an HTTP or browser test: it does not start Next, render RSC, request metadata,
query search, read sitemaps or fetch media. Every observed route has
`metadata/search/sitemap=false` until a separate runtime probe supplies evidence.

The probe is useful for catching route-template coverage and owner assumptions,
not page correctness. A present dynamic `[id]` template is counted for each
source ID; this does not prove the page returns that ID, that its data adapter
contains the record, or that its output matches the typed snapshot. Missing
templates remain blockers and no fallback route is inferred.
