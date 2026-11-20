# Material dependency and consumer gates (R129)

New `freezeUnifiedContent` executions validate material dependencies **before**
allocating an archive or build workspace. The comparison is against the complete
published A, so preserving an earlier CMS edit does not become a new edit in the
current game.

- Editing `raw-materials.json` or `raw-character-materials.json` requires complete
  material and character identities and positive safe-integer quantities.
- Character-only edits must not introduce dependency defects. Existing legacy
  defects remain reported; they do not revoke the accepted character-text pilot.
- Six actual relationship formats are modeled, including Endfield's `materialId`
  and numeric stages, WuWa's rarity and skill stages, and NTE's canonical Zero.
  Nonempty unreviewed formats fail. Empty/absent relationship domains remain
  explicit; an empty material catalog is not a qualified material domain.
- Quantity-only legacy entries are counted and blocked, rather than silently
  discarded. Every occurrence retains a source pointer and quantity.

The frozen receipt binds the dependency audit keys. Rereading new receipts
recomputes the checks. Historical receipts without the new field remain readable
under their original acceptance contract; this does not grant new material
publication permission.

For a material-changing freeze, `buildUnifiedOwners` automatically requires every
material detail and collection page, rendered names, collection/detail links,
applicable reverse character links, canonical URLs and robots policy. The build
receipt binds these source-derived consumers; an unrelated success assertion
cannot replace them. NTE's Japanese **collection** keeps its existing noindex
policy, while Japanese material details remain indexable. WuWa's reverse links
use inline character fields and still need their own consumer adapter.

## Reproducible audits

Run from `services/content-cms` with explicit absolute paths:

```sh
CMS_LOCAL_ONLY=1 pnpm materials:release-audit \
  --source-index /absolute/published-sources/source-index.json \
  --pin SHA256 \
  --output /absolute/new-dependency-report

CMS_LOCAL_ONLY=1 pnpm materials:public-audit \
  --audit /absolute/new-dependency-report/dependency-audit.json \
  --pin SHA256 \
  --output /absolute/new-public-report
```

The first command reopens the full published history, audits every registered raw
material domain, compares material/relationship mirrors and writes a source-bound
Genshin review queue. Naming candidates are suggestions for review, never aliases
or factual approval. It does not modify content or connect to CMS/cloud APIs.

The public command uses only credential-free GETs to `https://gachia.com` through
the existing explicit loopback proxy. It compares parsed public JSON and exact
global material search projections, checks all collection links, and samples the
first/last plus a dependency-bearing detail in each locale. Independent reads
finish after an assertion fails so the report captures all observed consumer
gaps. Missing scopes or failed assertions produce exit code 2 and
`blocked-by-consumer-gaps`; they are not a passing publication gate. Network
failures retain observations in `failure.json` and are not automatically retried.

These are source/build gates and a public baseline audit. They do not expand any
production scope, qualify all material fields, verify game facts/media, prove full
detail-page or sitemap parity, or replace a real CMS review, candidate/recovery
build, exact CI and controlled release. The existing production scopes continue
to reject material publication until that vertical slice is accepted.

## R135 identity correction and recipe review

`material-identity-review.ts` prepares a source-bound Genshin identity correction.
Both reference locales must agree on a positive numeric game ID, and the existing
target must match both names. Material source spelling must also match the English
reference name; short character IDs require an existing qualified target. Missing,
conflicting or ambiguous evidence stays held. No runtime aliases are introduced.
Replay validates source hashes, reference hashes, every pointer and all unchanged
data; an identity review never attests a recipe, a quantity, or release permission.

The R135 reviewed record is `reviews/2026-11-20-genshin-material-identities.json`.
Its 46 reference files are from community-maintained `theBowja/genshin-db`, fixed at
`8e5badd60b5d894284ccc927a56c9683529d2592`, with Git blob and SHA256 evidence.
This is corroboration, not official certification. The local source and public
mirror apply 21 material and 2 character identity changes (498 pointers), preserving
all 5,400 quantities/stage entries. Genshin still has 53 undefined material IDs,
1,279 dangling material references and 2 absent character records. Recipe review
found differences in 1,034 of 1,350 stages, including 989 recognized-material
quantity differences. Material publication remains blocked.

The 108 Guihuan quantity-only records already lacked IDs in their introducing Git
commit. Keep them held; neither a currency ID nor deletion is established by this
history. R135 does not modify Guihuan content, CMS records or production.

The read-only release audit now persists a completed published-history audit even
if a local mirror predates a published CMS overlay. `localMirrorParity` and
`mirrorDrift` explicitly report that separate condition; the published dependency
audit and public audit still use the verified published sources. A verified
`review-sources.json` capture permits subsequent offline review without repeating
the full history read or treating a Git mirror as published A.
