# Typed material public preview (T03, partial)

Run `CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/material-public-preview.ts` from the
CMS directory. It reads repository JSON without executing application code or
opening a database. Output is a compact, reproducible dependency report, not a
release artifact or publication approval.

Pilot scopes are starrail (Main), genshin (dedicated owner), and nte (collection
owned by NTE, item details owned by Main). These are a shared adapter, not three
CMS collections. Other scopes fail explicitly until route/consumer validation.

`materialPublicPreview` first verifies the existing material candidate integrity,
round-trip contract and current routing-policy digest. Its `dto` contains only
schema, scope, typed material fields and per-locale detail/collection identities.
Raw source, notes from reviewers and decisions are not projected. The outer
envelope contains provenance and hold flags and is not a public response.
Missing/null/empty translations remain distinct; no fallback, HTML rendering,
inferred image URLs or URL normalization is introduced. Unsafe path IDs fail.
The DTO schema is intentionally incompatible with the synthetic plain-text
snapshot schema; it cannot be inserted into the existing release pipeline.

`materialDependencyPreview` validates complete relation-array shapes for the
three supported formats, positive integer quantities, duplicates and identity.
Every occurrence retains its source pointer and quantity. It maps reverse
material-to-character references and reports missing material/character IDs
instead of silently dropping them. Source revisions, routing, relation and full
character-source digests bind the preview identity. Character data is checked
only for identity here, not claimed to be a complete typed character model.

## Consumer differences found in source

- `apps/web/lib/game-data/items.ts` resolves related characters and images and
  applies language fallback. The Main item page adds generated FAQs, summaries,
  next-step links and game-specific display logic.
- Dedicated genshin item details use a smaller view and their own metadata/source
  fallback. Reusing Main output would not guarantee equivalence.
- NTE collection and Main details have different owners and different name/source
  fallback rules. Explicit locale routes do not mean translated content exists.
- Candidate mapping sorts by identity; source collection order is not yet modeled
  for rendering. A test compares source fidelity by ID, not source array position.

The pilot therefore always reports `dependencyClosureComplete=false`,
`publishable=false`, and typed previews remain `releaseCompatible=false`.
Even a relation graph without missing IDs is not a complete page dependency
closure: character DTOs/media rights and bytes, derived copy, page links, locale
fallback decisions, ordering and approvals are still required.

Do not auto-rename unmatched references or add guessed material records. Review
the reported source gaps first, then model character/media/link dependencies and
bind them into a new typed snapshot contract before actual application readers.
