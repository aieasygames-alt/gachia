# Local shadow reader integration

This is a **synthetic fixture** acceptance lane, not a public reader
cutover or a Cloudflare Worker deployment. The normal Genshin/NTE pages, sitemap
and static media remain on their existing source. No media rights are approved.

2026-11-01: the `--split` profile adds the actual Main Next application on 3333.
One NTE snapshot contains both NTE-owned character content and Main-owned item
detail content. Scope is not owner. Main uses `MAIN_SHADOW_READER=1` alongside
the existing local-only gate; its normal public data sources remain unchanged.
Final split evidence is in `reports/payload-next-phase-2026-11-01/`.

## Runtime contract

- The CMS fixture endpoints require `CMS_LOCAL_ONLY=1`, `CMS_SHADOW_READER=1`
  and a loopback Host. Keep the service bound to `127.0.0.1`.
- Each owner requires `CONTENT_SHADOW_LOCAL_ONLY=1` and its own
  `GENSHIN_SHADOW_READER=1` or `NTE_SHADOW_READER=1`. Missing/unknown opt-in or a
  non-loopback Host returns 404 for `/shadow/*`.
- Set `CONTENT_CMS_SHADOW_ORIGIN` to a literal HTTP `127.0.0.1` origin and
  `CONTENT_CMS_SHADOW_RELEASE_KEY` to the approved local fixture key. Remote
  origins, credentials, redirects and mismatched keys are refused.
- The requested URL pins the release. The shared protocol checks the exact
  DTO, hashes, complete two-scope map, route policy, owner/schema capabilities
  and expiry before exposing **any** consumer. A missing NTE snapshot also
  blocks the Genshin reader; a partial success is not a complete release.
- React `cache()` shares one validated consumer between page rendering and
  `generateMetadata`. Per-request context IDs in metadata/body/JSON-LD witness
  this identity; they must change on a fresh request. This is not persistent
  caching or a retained-release fallback.

## Real application endpoints

All endpoints live in the actual owner Next applications:

- `/shadow/<releaseKey>/zh/<owner>/characters/index`: fixture plain-text body,
  actual title metadata and JSON-LD from the same verified consumer.
- `/shadow/<releaseKey>/sitemap.xml`: only loopback shadow URLs; never appended
  to the public sitemap.
- `/shadow/<releaseKey>/media/<sha256>`: a deterministic, generated SVG test
  asset tied to the release. Its bytes and digest are checked over HTTP. This
  is **not** a migrated third-party asset or a rights receipt.
- `/shadow/<releaseKey>/cache`: release/owner-bound document cache identifiers
  and the actual `private, no-store` transport policy. No CDN/Worker persistent
  cache is implemented or certified by this diagnostic endpoint.

The success-only `x-shadow-release` header is emitted by validated auxiliary
responses, not blindly by middleware. The page exposes its validated release
through its body and metadata. Errors have no success stamp. Failed page
rendering returns an error; auxiliary failures return 503. There is no fallback
that silently substitutes old/public data for a failed shadow request.

## Reproduce

From the repository root, with the local dependencies already installed:

```sh
node --test scripts/shadow-consistency-audit.test.mjs
node scripts/shadow-loopback-acceptance.mjs reports/<new-evidence-directory>
```

The runner refuses occupied ports 3100/3317/3322, copies the fixture to its own
temporary directory, starts three loopback services with a restricted environment
and disposable secret, then stops only its own process groups and removes its
own temporary fixture. It never edits the checked-in fixture or migration DB.
The default is `next dev` (CMS uses webpack to keep that run explicit).

For built-runtime acceptance, first build both owner apps and the CMS using its
required local-only/disposable-secret environment, then run:

```sh
node scripts/shadow-loopback-acceptance.mjs reports/<new-built-evidence-directory> --built
```

`--built` uses `next start` for all three apps. It does not deploy anything.
Never run a build concurrently with a server using the same `.next` directory.

For the Main/NTE split profile, add `--split` (four services including the
Genshin regression owner), and build Main as well before using `--built`:

```sh
node scripts/shadow-loopback-acceptance.mjs reports/<new-split-directory> --split --built
node scripts/shadow-evidence-verify.mjs reports/<new-split-directory>
```

The split fixture remains separate from the historical two-owner fixture.
Wrong-owner page requests return 404; each shadow sitemap includes only that
owner's entries, even when both entries live in the same scope snapshot. The
Main page overrides its inherited public metadata and uses its existing shared
JSON-LD serializer. Gate changes do not enable production routes or bindings.

The network auditor persists status, response headers, request headers, response
body, size and SHA-256 per request. Fetch bodies are decoded response payloads,
not compressed wire captures. Host-boundary probes use Node HTTP directly because
Node fetch normalizes the Host header. Failed runs are retained, not overwritten.

Scenarios include healthy/repeated reads, missing other-owner snapshot, partial
ReleaseMap, tampered bytes, CMS outage/restoration, wrong key, non-loopback Host,
opt-in disabled, and unaffected public page/sitemap checks. The temporary fixture
is changed only between awaited sampling stages, not in the source repository.

## Still outside this acceptance

All Main content beyond the synthetic NTE item slice, other owners, all real content types and locales, real media rights and media
manifests, full RSC/navigation/browser matrices, version propagation under
concurrent activation, old-release retention, production storage/cache,
Cloudflare Worker runtime and public authority transfer remain unverified.
T04 as a whole and P4 must not be closed based on this two-owner lane.
