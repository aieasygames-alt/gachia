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

## R136 recipe and definition candidates

`genshin-recipe-candidates.ts` prepares held overlays from the R135 relation
candidate and the captured R134 materials/characters. It verifies SHA256 and Git
blob evidence, explicit numeric-to-local mappings, both material locales, exact
stage labels and positive safe-integer costs. Character and talent records have
separate numeric ID namespaces. Talent costs mean **one talent per level**.
Every changed stage retains its original ingredients and pinned reference path,
cost key and hash. Existing ingredient display order is retained where possible.

The explicit mapping record is
`reviews/2026-11-20-genshin-recipe-decisions.json`. Existing local IDs remain
stable; conflicting Chinese/English names receive explicit corrections rather
than a runtime alias. Treasure Hoarder and Fatui insignias remain different
numeric identities. A Chinese match cannot reassign a local record whose English
name identifies a different numeric material. The original six conflicts have
individual resolutions in the R136 report.

The candidate covers 90 characters and 1,350 stages, with 1,066 changed stages.
It proposes 84 new definitions: 68 complete records and 16 specialties whose
reference files omit rarity. Those 16 drafts retain the missing field and are
excluded from the material overlay; costs still reference them, so the normal
dependency gate correctly blocks. It also proposes corrections to 45 existing
definitions. For 33 existing specialties the old local rarity is retained and
explicitly marked unverified, never inferred from category or neighboring items.
New site types are derived from reference type and cost usage; that classification
does not qualify the site's material consumers. No Japanese translation is made.

The self-contained compressed fixture
`reviews/2026-11-20-genshin-recipes-r136.json.gz` contains exact source/reference
texts, Git blobs, mappings, MIT license and expected output pins. Regression
tests can replay the batch without report caches, network requests or a new
history audit. The report runner can reproduce outputs in a new directory:

```sh
./services/content-cms/node_modules/.bin/tsx \
  reports/genshin-recipe-candidates-2026-11-20-r136/prepare.mts \
  /absolute/new-candidate-directory
```

The 14 unresolved legacy material identities retain their original occurrences
in the held ledger. Their replacement **in the candidate** is justified by the
specific character/stage reference, not by assigning an alias to an unknown ID.
Live raw data, mirrors, CMS and production remain unchanged by this batch. The
candidate still lacks 16 material definitions and the `mualani`/`ororon` character
records. Neither complete individual drafts nor an overlay's integrity hash
grant import or publication permission. R134 remains published A; future work
must reconcile CMS import O and separately qualify numeric, relationship and new
entity changes, material consumers, candidate/recovery builds and exact CI.

## R137 specialty ranks and missing character definitions

`genshin-candidate-completion.ts` completes only the R136 gaps. It binds the
parent seal and source hashes, all 49 specialty IDs and exactly the two missing
character IDs. New overlays hold 269 material definitions, 117 character records
and the unchanged 5,490-reference R136 recipe file. The identity dependency audit
and complete-material-closure gate pass with zero missing definitions/characters.
This gate remains separate from factual and publication qualification.

Each specialty has explicit `gi.yatta.moe` material API evidence: endpoint numeric
ID, `UI_ItemIcon_ID`, exact English name and `rank=1`. That is the site's
**community display-rank evidence**. The independently pinned game extraction
`DimbreathBot/AnimeGameData` commit
`bd35e243fa436f141f015cf221a6e19d0c34b7ca` omits `rankLevel` on all 49 records.
Its `rank` field is a sort order such as 313. The code verifies and preserves
this distinction; it does not claim either that the raw game field equals 1 or
that the community display rank certifies an official one-star rarity. The
16 new drafts receive the explicit API display rank; the 33 existing display
values agree and need no numeric change. A new/mismatched game rankLevel fails
closed for further review, rather than silently preferring a source.

Mualani and Ororon use the existing pinned genshin-db commit for Chinese,
English and Japanese character identities, English/Chinese skill text and all
six constellation records. Numeric avatar IDs and talent/constellation record
IDs are validated in their distinct namespaces. BWiki revisions 690423 and
690478 explicitly corroborate release versions 5.0/5.2 and limited/standard
acquisition; release version is never inferred from an API timestamp. All four
passives are retained for both characters, including `passive3`; Ororon's
`combatju` is retained as `specialJump`. The site's generic skill aggregation
still needs explicit support for these fields before new-entity release.

Character image fields stay empty and unqualified: credential-free HEAD checks
on the two current canonical `img.gachia.com` paths returned 404. The batch adds
no image bytes or URL alias. Editorial build/team/tier recommendations and FAQ
stay empty rather than being invented. Source-backed character definitions can
close identity dependencies while media, new-entity lifecycle and full consumer
qualification remain held.

`reviews/2026-11-20-genshin-completion-r137.json.gz` is a self-contained replay
fixture with the parent candidate, inputs, exact source/API/wiki texts and the
full hashed/Git-blob-verified game table. New tests cover corrupted and stale
inputs, endpoint/identity/rarity mismatch, missing evidence, changed wiki
revision, lost skills and source preservation. In-memory server rendering tests
exercise both characters and all 49 specialty details/collection links in three
locales. These HTML data tests do not verify media or qualify a new entity for
production. Raw data, CMS, production scopes and published R134 A stay unchanged.
