# R68: recovery input snapshots and verification checkpoint

## Change

The fixed recovery opener now captures its cloud credential before asynchronous executor/history checks. Its later topology and module reads use that captured credential. The private recovery writer also snapshots the request, cloud credential and release authorization at entry, so caller mutation during preflight cannot change later authorization, deployment or receipt identities.

The fixed combination now exercises mutation of request pins and the credential during opening, followed by real revalidation. An additional writer case mutates the request, credential and authorization during executor verification, verifies the accepted receipt retains the original request, and confirms the original request cannot replay the recorded recovery. Network responses and historical-root boundaries remain isolated as previously documented; no real cloud recovery is performed.

## Scope

This round does not expose promotion/recovery CLI writes, widen the Ananta pilot or edit CMS content. It prepares the accumulated source changes for exact-commit verification. Historical builds, databases, credentials, network bodies and large report artifacts are not part of the source checkpoint.

## Local verification

- Targeted recovery regression: 16 passed, zero skipped.
- CMS typecheck: passed.
- Complete CMS suite: 379 passed, zero failed or skipped (336 seconds); fixed adapter child suite expects 118 cases.
- Shared promotion protocol: 197 passed, zero failed or skipped.
- Documentation and verification scope gates: 38 passed.
- Staged whitespace check: passed.

These results do not establish real cloud publication. Exact-commit GitHub verification is pending at this checkpoint; its outcome will be recorded separately without changing this executor commit. Disk space remaining is approximately 28 GiB; no historical evidence or backups were removed.

## CI timeout correction

The first exact-commit run (42203831399, commit 31bdb8ff40f6742122bf005dd90076f42b20b713) failed: 378 CMS tests passed, while the fixed-adapter child hit its 360-second timeout. The local child had already required 292 seconds. The timeout is now bounded at 900 seconds within the unchanged 30-minute workflow limit, and timeout diagnostics include child stdout/stderr. All 118 child cases and zero-failure/zero-skip assertions remain required. This failed run cannot authorize publication; the correction requires a new exact-commit full CI run.
