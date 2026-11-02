# Complete material dependency snapshot boundary

`buildCompleteMaterialSnapshot` is a structural boundary for a future typed
release. It requires material DTOs, eligible character summaries, the explicit
no-fallback link policy and a media evidence report whose entries have both
bytes and rights verification. It sorts identities and hashes the complete
canonical object; verification rebuilds it and rejects policy, locale, evidence,
identity or approval-flag changes.

This does not mean those evidence fields are trusted. The local manifest builder
does not fetch bytes or authenticate rights receipts, so real data still cannot
produce this complete snapshot without a separately trusted evidence process.
The result intentionally remains `publishable=false` and
`releaseCompatible=false`, and is not accepted by the existing shadow consumer.

Missing source-ID corrections, character detail content, collection ordering,
metadata/search/sitemap parity, derived FAQ, cache behavior and owner activation
remain outside this boundary. A complete structural object is not a publication
approval or a production release map.
