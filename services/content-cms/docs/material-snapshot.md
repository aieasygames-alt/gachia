# Typed material snapshot boundary

`buildMaterialSnapshot` binds the material DTOs from T03 to the explicit locale
link policy. It sorts material identities, requires all three declared locale
pages per material, and records the route policy and link policy in the
content-addressed snapshot key. `verifyMaterialSnapshot` rebuilds and compares
the complete object, rejecting changed links, route policy, order-independent
identity changes, missing locales, or forged approval flags.

This is intentionally a separate `material-snapshot-v1` contract. It is not
inserted into `shadow-page-v1`, and `releaseCompatible=false` remains explicit.
The snapshot hash proves canonical data integrity only; it does not prove source
truth, media availability, rights, approval, owner capability or activation.

The snapshot does not yet carry the complete character summaries, media evidence,
target page/metadata/search/sitemap parity, derived FAQ, collection order or
approved source-identity corrections. It therefore cannot be opened by the
existing shadow consumer and does not authorize a ReleaseMap entry.

For NTE, the dependency graph now applies the explicit `zero` canonical
identity policy from `packages/data/games/nte/character-identity.ts`. The
approved identity resolves to both `zero-male` and `zero-female` display pages;
it never selects one gender and it does not approve the material relation. The
original `characterId: "zero"` row, stages and quantities remain in the held
snapshot, while page links and the NTE app's material lookup use the two
verified display IDs.

The R126 held supplement at
`reports/material-type-expansion-2026-11-17-r126/nte-held-material-supplement.json`
lists all 27 unresolved material IDs and 441 source references. It records
identity, version, URL and consumer evidence as unverified or blocked and keeps
`status="held"`, `approvedTarget=null`, `publishable=false` and
`releaseCompatible=false` for every entry. It is a source ledger, not a
material DTO or a release authorization.

`material-dependency-snapshot-v1` is the held companion for the material pilot.
It retains the source array order, every NTE leveling stage, every skill-material
row and every quantity, while carrying missing IDs as explicit blockers. It does
not rewrite a missing ID, choose between `zero-male` and `zero-female`, or infer
an alias from a URL. The snapshot remains `hold=true`, `publishable=false` and
`releaseCompatible=false` until a separate source-bound review and all consumer
parity evidence are complete.
