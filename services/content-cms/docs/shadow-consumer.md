# Serialized local shadow consumers

Batch20 adds [bounded file transport and isolated Node processes](shadow-artifact-files.md).
The original batch18 in-memory experiment below remains reproducible; it is not
the latest transport acceptance. Actual production Workers remain unintegrated.

Run from `services/content-cms`:

```sh
pnpm inventory:check
CMS_LOCAL_ONLY=1 pnpm exec tsx scripts/shadow-consumer.ts
```

The experiment consumes `batch17-shadow.json` as synthetic input, checks its
inventory digest against the independent inventory file, and serializes release
and snapshot objects into separate keyed byte strings. It opens five separate
instances of a common owner-bound adapter, not five real Workers or processes.
No network, Payload database, deployment, or public route is used.

## Loading contract

`loadShadowConsumer(context, readArtifact)` captures a deep copy of the caller's
owner, release key, full scope inventory, capability declarations and UTC time
before awaiting any read. The transport receives only kind and a SHA-256 key;
there is no `latest` pointer, URL fallback or caller-controlled filesystem path.

The manifest must match the requested release key and exactly cover the expected
scopes. Each snapshot response must match the requested key; then the existing
protocol validates exact DTOs, content hashes, route policy, scope association,
expiry and every required owner's schema. Loading is all-or-nothing. Malformed
JSON, missing content, wrong-version responses, corruption or unsupported peers
return no consumer. No cached/legacy content is silently substituted.

Resource ceilings: 256 scopes, 1 MiB release JSON, 2 MiB per snapshot and 32 MiB
aggregate snapshot JSON. These bound JSON parsing after the transport returns;
they are not streaming/network limits. A future transport must enforce its own
byte limits and deadlines before buffering. Duplicate JSON keys are not separately
diagnosed; integrity is checked on parsed canonical content, not raw-byte hashes.

## Request-scoped output

- `document(path)` returns title/body with explicit plain-text format, owner,
  release key, shadow/publishable flags and a versioned cache key. It never emits
  HTML and does not implement a production renderer.
- `metadata(path)` shares title, canonical relative path, release identity and
  cache key. Robots are always noindex/nofollow; no production origin is invented.
- `index()` returns the same version's owner-filtered title/path list. It is not
  the production navigation, search engine, sitemap or locale fallback policy.
- Missing paths return null for both document and metadata. Wrong-owner paths
  fail rather than falling through to another consumer.

Returned objects and external artifact bytes cannot mutate the pinned view.
Each request must open its own view with a current, explicit clock. Do not retain
this object as a process-global cache; expiry is validated when opening it.
Rollback explicitly loads the previous key through the same validation rules.

## Remaining integration

The byte transport in this experiment is an in-memory map populated from a local
JSON fixture. Actual Main/Next metadata/RSC and dedicated Worker bindings remain
untouched. Capabilities and scope configuration are trusted local caller inputs,
not independently authenticated deployment facts. Release hashes provide content
integrity, not publishing authorization. There is no coordinator, signature,
durable storage, live pointer, asset/link validation, remote failure recovery or
production activation.

Content-addressed files and isolated consumers are now exercised by the linked
batch20 experiment. Next are real typed DTO/dependency closure and opt-in actual
application readers; remote activation remains behind separate acceptance gates.
