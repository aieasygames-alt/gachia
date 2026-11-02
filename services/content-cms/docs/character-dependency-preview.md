# Material-related character summary preview

Run `CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/character-dependency-preview.ts` in
the CMS directory. It reads local JSON and hashes reviewed reader source files;
it does not execute application modules, open Payload or fetch image URLs.

The shared summary DTO contains only scope, ID, element/attribute, explicitly
present localized names, character detail routes with owners, and the thumbnail
URL/path. It is not a full character detail DTO. Names retain absent/null/empty
states and do not apply fallback. Raw character fields, editorial data and source
image URLs cannot leak into the whitelist. Provenance and eligibility remain in
the private preview envelope, not the DTO.

## Reviewed legacy policy

- Starrail and genshin exclude `status=upcoming`.
- NTE also excludes `availableAtLaunch=false`.
- Starrail/genshin helpers use `/images/<game>/characters/<id>.webp`.
- NTE uses `/images/characters/<id>.webp`, without an `nte` segment.
- All three helpers use `https://img.gachia.com`, not the raw `image` field.

The exact reviewed character-adapter and image-base file digests are pinned.
The CLI and tests hash actual files and reject drift before reuse. The library
accepts hashes from a trusted local caller; these hashes are not signatures or
proof of publication authority. No automatic policy update is performed.

Material-to-character links distinguish missing identity, reader-excluded identity
and eligible preview. Missing or excluded identities produce no active paths,
but remain in the dependency graph for review instead of disappearing. The source
digest captures full character changes; material dependency keys also bind the
relation and routing policies.

## Remaining gates

Every media reference has `bytesVerified=false` and `rightsVerified=false`.
URL construction is not proof of availability, format, checksum, licensing or
image delivery parity. Character detail existence/content and other page links
are also unverified. Graph ordering is deterministic, not a promise of current
page display order. Unknown fields outside the selected summary are not treated
as a complete character model.

The output remains `publishable=false`, `releaseCompatible=false` and
`dependencyClosureComplete=false`. Next work must add media evidence and the rest
of page links, ordering/fallback/derived content, and typed snapshot validation.
Unconfirmed dependency corrections stay blocked throughout.
