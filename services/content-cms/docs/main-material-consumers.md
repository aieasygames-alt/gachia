# Main material consumer repair (R131)

This batch prepares the Main consumer migration needed before qualifying more
material types. It does not grant material publication permission or change the
published source index.

- Endfield's existing material cards link to their existing detail URLs in all
  three locales. Gear sets keep their existing presentation.
- Star Rail renders the actual `ascension` category as well as `special`.
  The prior `character-ascension` spelling remains supported. All 62 existing
  materials now have collection links, including seven ascension and two special
  materials omitted by the previous category order.
- Roco CN adds exactly its 23 material search entries in each locale. Its existing
  `/roco-cn/items/:id` URLs are retained. This migration does not enable other CN
  search categories or the withdrawn international Roco material domain.

## Search generation and release history

`mainManifests()` keeps the legacy v1 default for historical callers. New builds
read `packages/data/main-manifest-contract.json`, selecting the explicit
`main-search-roco-cn-materials-v2` contract. Generation records the selector in
`assets/data-manifest/main-contract.json`; verification checks the selector and
all four source-derived manifests.

Main candidate builders and NTE HTTP consumers select the frozen workspace's
contract. Old frozen workspaces without the selector retain v1; they are never
reinterpreted as v2 by the current executable.

Independent NTE releases inherit the **published Main artifact's** selector for
both candidate and recovery. An old Main artifact without the sidecar retains
v1 even if a newer NTE source workspace can generate v2. This prevents an
unpublished Main migration from blocking an otherwise qualified NTE-only edit.
Once a controlled Main migration advances the full source index, subsequent
independent releases inherit v2 from the new Main artifact. The artifact tree,
source index and request-level JSON assertions continue to bind that choice.

## Qualification status

R131 verifies all 103 materials' collection/detail pages in three locales against
the complete R130 published source snapshot, plus their related raw JSON and
exact search projections. The HTTP checks use an isolated Next development
server. They do not constitute an OpenNext production build, compatible recovery,
exact cloud preview, full exact CI or a production deployment.

The next delivery is a separately qualified Main migration: build from the full
R130 sources, preserve the four independent owners and Router, verify candidate
and compatible recovery, then deploy only Main and advance the source index.
The complete build still requires the standard 14 GiB available budget, including
the unchanged 8 GiB reserve. Do not substitute the development HTTP receipt for
that production evidence.

## Controlled Main migration

`prepareMainMaterialConsumerMigration` accepts a complete `readNteSourceIndex`
result with all owners current. It freezes the exact executor commit and overlays
all 115 published sources and their registered public mirrors before generation.
The frozen workspace is checked against Git, preserved source hashes, the exact
file inventory, and the committed manifest verifier. No new CMS edit is involved.

The versioned `main_material_consumer_migration_bundle_v1` uses the existing
Main-only preserved-content writer and its no-retry journal. It keeps the archived
Main runtime and old search contract for recovery, and validates the new search
contract and all 103 materials' three-language consumers for the candidate. Both
direct Main and the unchanged Router graph are captured. Every JSON projection is
rederived when reopening the bundle; recomputing a response pin cannot bless stale
data. The static union copies immutable Next assets only.

Activation requires full CI for the exact frozen commit, fresh topology and
module identities, a public recovery baseline, and both exact cloud previews.
Source advancement records `nte_main_material_consumer_source_index_v1`, retaining
all 115 content hashes, Router and the four independent owner descriptors. The
legacy reconstruction/restoration kinds retain their original checkpoint rules;
the new kind does not claim to repair the known earlier history gap.
