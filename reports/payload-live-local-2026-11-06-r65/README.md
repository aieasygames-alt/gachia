# R65: real resident CMS local audit

## Real Local Result

Executed the current `audit-local` entry against the pinned R48 production request and the actual resident CMS at `127.0.0.1:3100`, using the existing desktop administrator credential privately. Login and logout were the only authentication POSTs. No content edit, cloud call, install or public activation was performed. The temporary authenticated session was logged out successfully.

The complete local preflight passed with no substituted CMS responses or verifier functions:

- Ananta existing installation guide, Chinese `/content`, remains the only qualified editorial change.
- Current formal review and exported candidate match the frozen evidence.
- Candidate SHA-256: `50a15bc167cb9ad92e1939cd5049cde58f4d5cb9f908033f03cf5463e5aea277`.
- Review pin: `f6d8261c83089250acf860602a8e6b20d64aab2a9c52fc7427c255bc891a3b23`.
- Real installed source remains `7b12684262338511bbcc2d3468bacaeff9a2404a`.
- Genshin and NTE local preservation catalogs passed. Local preflight alone does not authorize omitting their owners; fresh cloud identity binding is still required to close the Main-only upload scope.

Evidence: `audit-local.json` and `audit-local.log`. The one-shot `run-local-audit.mjs` refuses to overwrite these files, passes the credential only in the child environment, omits cloud/CI tokens, and checks diagnostic output for credential leakage before saving it. It does not create a production-ready receipt.

## Code Fix

`openUnifiedPromotion` now captures CMS/cloud credentials at entry. Previously its later module-revalidation closure read `input.cloudToken` again, allowing caller mutation after asynchronous preflight to change the credential used for subsequent identity reads. The new fixed-combination case mutates both credentials and request pins during preflight, then exercises both module revalidations and the subsequent source recheck with zero writes. Production CLI permissions remain unchanged.

## Verification

- Real resident `audit-local`: passed; logout confirmed.
- Targeted open-caller-mutation regression: 1/1 passed.
- Complete CMS suite: 379/379 passed, zero skipped, approximately 326 seconds (`cms-tests.log`). Its fixed-combination child passed all 117 cases.
- Shared publication protocol: 197/197 passed, zero skipped (`protocol-tests.log`).
- Documentation/verification scope: 38/38 passed.
- Type checking and whitespace/diff validation: passed.

## Remaining Gates

The fixed promotion test still isolates its local-preflight and historical-root boundaries. R64 and this live audit provide separate local evidence, not a single complete promotion qualification. Current-code exact CI, fresh cloud source/topology checks, preview renewal, public activation/acceptance and actual source advancement remain outstanding. No broader game or content type is newly authorized.

Disk available: approximately 27 GiB. No large production build or cleanup was performed; tests use disposable fixtures.
