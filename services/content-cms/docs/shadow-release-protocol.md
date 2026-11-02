# Local shadow release protocol

This is a synthetic, in-memory protocol experiment. It does not read Payload
drafts, create approvals, write a release pointer, serve HTTP content, or deploy
Workers. All release artifacts are `shadowOnly=true`, `publishable=false`.

## Reproduce

From `services/content-cms`:

```sh
pnpm inventory:check
CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/shadow-release.ts
```

The runner reads the migration scope inventory and the source route contract.
It constructs synthetic records for all registered scopes, never real content.
The fixed UTC instant belongs to the fixture, not a production clock. Output
contains reproducible JSON artifacts and assertions; it does not write a DB or
contact any service. Inventory checking is required to detect stale source lists.

## Artifact boundaries

- `shadow-page-v1` is a narrow plain-text projection: path, intended owner,
  schema, title, body, expiresAt. Unknown editorial fields are not projected.
  Titles/bodies are text, not trusted HTML; there is no renderer in this batch.
- Paths are explicit canonical four-segment fixture paths. Encoded aliases,
  query strings, trailing slashes and dot segments are rejected. This is not
  a production URL migration policy and does not support every current URL.
- Each snapshot contains a complete game's projected pages, sorted by path.
  Its key hashes the version, game, route-policy digest and pages. Verification
  reconstructs exact whitelisted data and rejects extra fields or forged owner,
  schema, ordering, digest and policy. Hashes ensure integrity, not approval.
- An explicit complete empty snapshot models removal. Missing/incomplete input
  is an error, never silently interpreted as unchanged or empty content.
- A ReleaseMap must reference exactly one valid snapshot for every expected
  scope. Callers supply the expected inventory separately; a map cannot remove
  a required scope by changing its own scope list. Unchanged scopes reuse keys.

## Owner and reader rules

The experiment imports the repository's `getRouteOwner` rather than assigning
one Worker per game. For example, `/zh/nte/characters/example` belongs to `nte`,
but `/zh/nte/items/ore` belongs to `main`. This is intended source ownership;
actual Router bindings, switches, canaries and deployment capabilities are not
queried or proven. The Router itself is not counted as a content owner here.

`openShadowView` verifies the entire map, every referenced snapshot and each
required owner's schema support before returning any page. It takes independent
copies for the view. Body lookup, lightweight title/path index, and cache keys
use the same release identity. Mutating a store or opening a newer release
cannot alter an already-open view. A wrong-owner lookup fails explicitly.

Expiry is evaluated at snapshot creation and view opening using explicit UTC
time. The view is request-scoped and must not be retained as a long-lived cache;
there is no production TTL mechanism. Rollback means reopening the previous map
through the same capability, integrity and expiry checks, not bypassing them.

## Not implemented

Durable object storage, content approval receipts, real type adapters, actual
worker readers, metadata/RSC/navigation/search/sitemap parity, asset/link
validation, publication coordination, CAS/locks, compatibility negotiation,
partial remote failure recovery, production clock/cache invalidation and
authority handoff are not implemented. The index is only a title/path fixture,
not a replacement for those consumers. No existing public page uses this code.

Local serialized consumers and then bounded file transport with isolated Node
processes were added in batches18/20; see [file transport](shadow-artifact-files.md).
These are synthetic owner-bound adapters, not actual application integration.
Next are real typed DTOs and dependency closure. Production activation and bulk
approval remain separately gated.
