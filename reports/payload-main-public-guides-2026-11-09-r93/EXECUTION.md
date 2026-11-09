# R93: Main Public Acceptance for Qualified Existing Guides

## Observed Blocker

R92's exact executor `ae0f39759e056daaf858df911351768a339a9b7f` passed
full CI `42573869451` and a real new source baseline. Its promotion opening and
both original version previews then passed. Renewal checked 1,318 responses for
each of the existing recovery/candidate UUIDs without uploading or deploying.

The subsequent fixed public-reference projection rejected
`/zh/hi3/guides/v9-0-official-update-guide` as `Unqualified Main public consumer`.
This was the only rejected path among the sealed candidate's 1,318 references.
The source was 621.365 seconds old, not expired. The existing public reader still
had the original Ananta-only HTML allowlist despite the accepted 11-game / 237
existing Chinese guide-body qualification.

The qualification stopped before the protocol/journal stage. There was no
promotion authorization, deployment, public acceptance or source advancement.
CMS logout passed; original proofs and journals were preserved. See the R92
`guarded/failure.json`, SHA256
`2cc4deb405981f2036baa4f20fdc06d135ae4dfe8cd4e10d0bfa36afef5be91c`.

## Fix

- A dependency-free shared Main-guide game list now feeds both the existing
  CMS/consumer qualification and the public acceptance reader. The TS entry
  re-exports it; there is no second independently maintained allowlist.
- Public references accept Chinese guide detail paths for exactly those 11
  already-qualified Main games. Non-pilot guide references require HTTP 200,
  HTML MIME and the exact production canonical for that path.
- Fixed promotion and historical adapters pass their already-verified
  qualification, not a new request/CLI policy selector. The original default
  and Ananta pilot still require both historical Chinese/English pages.
- The accepted existing-guide policy requires the edited game's Chinese detail
  and raw-guide JSON, the preserved Ananta Chinese page, existing protected
  JSON, static, disabled-account, robots and sitemap coverage. It does not
  require an unrelated English Ananta page absent from the sealed R79 contract;
  such a reference, when present, is still validated under its existing rules.
  Historical pilot requirements remain unchanged.
- This does not qualify Sea, dedicated owners, additional locales, other
  content types, new entities or multiple changes per release. The production
  verifier still requires one existing guide and only its Chinese `/content`.
  No freshness, parser, review, module, topology or write guard is bypassed.

## Verification

The focused HI3 regression first reproduced the exact rejection against R92.
New tests cover all 237 existing Chinese guide paths, excluded scopes/locales
and path escapes, missing/non-HTML/wrong-canonical references, missing current
game coverage, rejected policy/field/locale/skip injection, legacy requirements,
and HI3 public HTTP evidence plus independent body-tamper rejection.

Complete release regression passed: 1,608 JavaScript and 56 Python tests.
Public Web passed all 452 tests, including every accepted guide's real page
consumer. CMS and Web type checks, 38 documentation/scope checks and the two
focused request-injection gates passed. Full CMS regression and exact executor
CI are still pending.

`verify-artifacts.mjs` passed against the actual sealed recovery/candidate
artifacts and R92 renewal, with network requests forbidden. Each role passed
1,318 public-reference projections, 1,317 local public-response checks and
1,318 original preview-evidence checks, including the HI3 Chinese guide and its
exact canonical. Local robots bytes were pinned, not mislabelled as a public
Cloudflare response; the managed public prefix was not observed or fabricated.
Original selected proof pins remained unchanged.

Result: `artifact-verification.json`, SHA256
`813de0c96542a5f8b638059a98487ba3895de380f73dfa121962ea45eb431d5d`.

An initial synthetic HTTP test omitted the already-required managed robots
prefix; its fixture now uses the same reviewed prefix as the pre-existing test.
The first real projection also exposed the unrelated mandatory English pilot
page, which is now selected by the verified release policy as described above.
Both initial failure logs are retained. Neither was a public deployment.

The initial full CMS regression exposed the isolated production fixture's
old placeholder `{ policy: 'isolated-promotion-fixture' }`, which is not a
valid release qualification. The fixture now supplies the complete accepted
pilot shape and its actual changed key. Production validation was not relaxed;
the failing full-suite log is retained and the corrected suite must pass.
The three focused private-promotion success variants then passed with the
corrected fixture. Superseded CI `42579662704` for `12e6d38` was cancelled
after this deterministic local fixture failure was found; it is not a passed
checkpoint. The fixture correction is a separate commit, not an amendment.

No production operation is authorized by these changes alone. Both existing
cloud versions and public Main remain unchanged. A complete fresh pre-write
qualification is still required before the first HI3 promotion.
