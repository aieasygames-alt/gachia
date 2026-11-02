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
