# Local shadow artifact HTTP contract

The first application adapter must consume immutable artifacts through two read-only routes:

```text
GET /api/shadow/releases/:releaseKey
GET /api/shadow/snapshots/:snapshotKey
```

Both routes must return the exact stored bytes with an immutable cache policy. The adapter pins one `releaseKey` at request start and rejects a response whose release, scope, snapshot key or owner capability does not match. Missing, expired, partial or tampered artifacts return a fail-closed response and never fall back to mutable CMS data.

This contract is local/preview-only until a production storage and authorization decision is approved.
