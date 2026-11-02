# Explicit material link policy

`buildMaterialLinkPreview` is the next T03 slice after character summaries. It
emits one material page record per declared locale and an explicit set of
locale-specific collection/detail links. It does not fall back from missing
English/Japanese text to Chinese, and it does not infer alternate URLs.

The link identity includes route owner and collection owner. NTE intentionally
has split ownership: the `/items` collection is NTE-owned while item detail
routes are Main-owned. Other scopes must preserve the route contract rather than
copying NTE's split. The policy does not make an owner capable of serving a page;
it only records the route contract used for later capability validation.

Excluded related characters remain in the dependency report but have no active
character paths. This prevents upcoming or unavailable entries from becoming
links while keeping the source dependency visible. Missing characters are not
converted to empty lists by this policy.

The preview is still not a website navigation, sitemap, search index, metadata
or release manifest. It does not verify target pages, image bytes, rights,
derived FAQs, ordering, cache keys or cross-application parity. Outputs remain
`publishable=false` and `releaseCompatible=false`; the locale fallback is the
literal policy value `none`.
