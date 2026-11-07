# R77: Main Existing Guide Body Qualification

This round expands source-level production qualification from one Ananta guide
to existing Chinese guide bodies in 11 Main-owned games. It does not install a
resident release, edit live CMS content, upload a Worker or deploy public content.

Accepted games: ananta, aniimo, endfield, guihuan, hi3, roco, roco-cn, skjh,
starrail, wuwa, zzz. Only `/content`, one existing record per release, qualifies.
Identity, titles, metadata, translations, structure and other records are unchanged
relative to active public A. Existing merge, review, CI, preview, ownership and
publication gates still apply. No source certification requirement is added.

The original Ananta pilot returns its original policy and qualification object,
preserving historical receipt replay. New guides use
`main-existing-guide-content-v1` in both live and historical readers.

Sea remains excluded until its generated detail-asset consumer is accepted.
Genshin and NTE retain their delegated guide publisher. Azur Promilia and Lvmeng
require their separate data/owner contracts. Other content families and entity
creation/removal are not qualified by this change.

The generated `coverage/coverage.json` and `coverage/coverage.md` report 237
qualified records: ananta 19, aniimo 8, endfield 21, guihuan 19, hi3 3, roco 30,
roco-cn 4, skjh 45, starrail 28, wuwa 29, zzz 31. Total editing inventory remains
2,795 unified records across 16 scopes; the other 2,558 are not qualified by this
unified production policy.

Tests render the actual public guide page and Markdown component for every guide
in the accepted games, check changed Chinese bodies and unchanged English HTML,
and preserve the retired English Roco CN route's 404. Every qualified Chinese
guide is also checked against the real `generateStaticParams` route set.
These are server-render
consumer tests, not a live deployment or browser hydration acceptance.

Verification:

- Public Web suite: 83 files, 452 tests passed.
- CMS and public Web TypeScript checks passed.
- Runbook and verification-scope gates: 38 tests passed.
- Full CMS suite: 385 tests passed, 0 failures/skips, 359.9 seconds. This includes
  real Payload's 16-scope / 139-family review/export regression and the isolated
  fixed publication/recovery/next-source composition.
- No new exact-commit remote CI, installed release or public publication in R77.

Initial checks caught and fixed
the retired-English test assumption and a test import pulling the CMS dependency
graph into the public TypeScript project. No production data was changed.

Disk check: 24 GiB available. No historical releases, backups or content deleted.
