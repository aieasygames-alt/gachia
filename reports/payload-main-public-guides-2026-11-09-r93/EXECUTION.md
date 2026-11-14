# R93: Main Public Acceptance for Qualified Existing Guides

<!-- BEGIN R120 CURRENT -->
## 当前完成状态（2026-11-14 R120）

异环单 Worker 真实 CMS 正式更新闭环已完成。57 个材料的 171 个三语详情 URL 迁入异环，公开 JSON、搜索切片和 Main 聚合接通独立读取；一次性 NTE → Router → Main 迁移完成后，常驻 CMS 娜娜莉记录 1327 的英文简介完成草稿、审核、仅 NTE 构建、云预览和正式发布。日常内容发布仅改变 `gachia-game-nte`，最终版本 `963f4629-9b0f-4992-8373-fcb536508c81`。

精确提交 `cc0fdd18638b88d30dd42911055ae56b006b19bd` 的完整 CI [43450568989](https://github.com/aieasygames-alt/gachia/actions/runs/43450568989) 全部通过、无跳过；候选/恢复云预览、完整公网合同、三语桌面/手机六场景、无 JS 材料和最终只读控制面/模块复核通过。其余 2,879 条 CMS 记录保持。恢复已云预览，本批未实际生产回滚；本批仅证明既有角色文本资格。

当前完整来源为 `reports/nte-independent-delivery-2026-11-12-r120/independent-sources-01/source-index.json`，SHA256 `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`，115 份来源相对 R119 仅异环角色 raw 变化，胡桃修改及五份攻略增量保留。下一批使用 `readNteSourceIndex` 接续此索引，不回退旧来源或重放完成日志。后续顺序：蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。详细证据见 R120 `EXECUTION.md` 和 `delivery.json`。下方旧轮次均为历史状态。
<!-- END R120 CURRENT -->

## Delivery Outcome

The existing HI3 candidate was promoted exactly once through the fixed
`unified:promotion promote` CLI. Deployment
`5546b227-4bc2-4e58-bf87-96a5a8cb05e7` serves Main candidate
`a389b6f2-aea9-4fdd-94e6-1ecf331913d7` at 100%. All 1,318 public responses
and both post-write integrity checks passed. The complete five-owner / 115-source
index was then advanced through the fixed source adapter. No version was
reuploaded, no other CMS record was edited, and no automatic retry or rollback
ran. The authenticated CMS session was logged out.

This completes the first real HI3 existing-guide publication, not all-game or
all-content qualification. The actual content change remains record 1183's
previously reviewed Chinese punctuation correction. Other 2,879 records remain
unchanged; the accepted shared scope is still 11 Main games / 237 existing
Chinese guide bodies, one existing record per release.

Publication: `delivery/published.json`, SHA256
`4ed14469644b2df7766b02037f9ab312e767b1c3527e49f77ecf69263b5eaf8d`.
Canonical promotion receipt: `6422cdd5822d34ced44ddd3cd3fbd45d5cd02b8b27f6f2a34948e1cf752d09ec`.
Next source index: `delivery/sources/source-index.json`, SHA256
`7b53cdf071317ec2f60703d1039b57085695e2a8164fdfb4e68661e524db6c96`.
Canonical journal: `97deda8dd8099eb353df5c9436c908726890bd0c30f553d077c9bdb661469ff9`.
The complete delivery result is `delivery/completion.json`.

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
focused request-injection gates passed. The corrected complete CMS suite passed
all 439 tests. Exact executor `98bacec68e86fc21c153b02e75c6353241a6d6b2`
passed full CI `42580090621`, including all seven mandatory gates, in 27m7s.
`exact-ci.json` SHA256:
`d3eb1830df386c5fd9d412dc94084335277e5e5824aeef1023765f763bd0faf8`.

The real historical adapter independently reopened 115 sources, five owners,
both 1,318-reference guide projections and ancestor CI using 18 GitHub GETs.
`historical-verification.json` SHA256:
`d1a11e74f7972430003c163beb250e46b7e490a805b7d3d46937cef89653994c`.

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

## Real Pre-Write Qualification

The first new measurement passed the fresh public baseline (195.253s) and
promotion opening (243.299s), then stopped when three recovery static assets
returned Cloudflare 1101 / HTTP 500. All 1,318 recovery response bodies were
retained; the candidate was not attempted. No promotion journal or deployment
was created. `prewrite/failure.json` SHA256:
`c05c5811fc99809ad6dd258442d8ce47fb145549756cfc118ed71117f17c3517`.

A separate nine-request diagnostic observed each affected path once on recovery,
candidate and public origins. All returned 200 with the exact sealed body;
before/after topology was unchanged. This did not establish the 1101 root cause,
renew acceptance, or authorize publication. Its SHA256 is
`cb7e78c63ad04eb172513950238a8a09fa98278ca5ee328719b9108166f8be04`.

A separate new measurement then passed the complete real pre-write path:
baseline 183.674s, opening 226.781s, both 1,318-response previews 266.646s,
public projection, two full protocol verification passes (76.322s / 84.459s),
remote module checks, and both final topology snapshots. Source age at the
read-only authorization was 784.040s, leaving 115.960s of the unchanged 900s
window. There were no cloud writes or promotion journal, and that in-memory
authorization was explicitly non-reusable. Receipt:
`prewrite-after-diagnostic/verification.json`, SHA256
`dcf073fe7780389c0d0faf16f21d47b2481dd82ecfb1382ea03c556a742e67f7`.

One launch was refused before login/baseline because OAuth headroom was below
40 minutes. Its log is retained; credentials were refreshed before the actual
new measurement. No timeout or freshness guard was extended.

## Formal Single-Attempt Delivery

`run-delivery.mjs` required the complete read-only measurement and exact CI,
but did not reuse its source handoff, renewal or authorization. It obtained
another fresh public baseline, then invoked the unchanged fixed CLI with the
reviewed release key and original candidate/recovery UUIDs. Source age at the
actual durable write intent was 777.889s, within the original 900s window.

The canonical journal contains only `baseline`, `remote_versions_verified`,
`promotion_intent`, `promoted`, and `production_accepted`. Its single deployment,
full public acceptance, post-write verification and complete source advancement
all passed. Total delivery elapsed time, including the new baseline and source
advancement, was 1,400.842s; post-write checks use the captured fresh-at-write
authorization rather than pretending the original source observation is new.

The first additional independent history check stopped on a local Python
30-second timeout while parsing two legacy pages (167,724 serialized bytes).
The published receipt/source index were not modified or rolled back. Its log
is retained, SHA256
`b0b6974a5480895aceb4ad9fcc8664e4a0cb645f1a7a58404e4f264a772288f4`.
The separately recorded Homebrew-runtime read-only check keeps the same parser,
proofs and timeouts; its final result is recorded below.

## Independent Completion Verification

`verify-delivery-homebrew.mjs` passed using the existing Homebrew Python runtime,
without changing parser bytes, deadlines, historical proofs or the published
receipt. It independently reopened the completed Main publication and its source
index, verified all ancestor CI, rechecked the 1,318 sealed public responses,
and confirmed all 115 sources / five owners. It also fetched the current public
HI3 guide JSON and Chinese detail page, validating both against the candidate's
exact public contract. Before/after live snapshots retained the promoted Main
UUID and all protected service/topology identities. The canonical promotion
journal remained byte-identical. This is an additional read-only verification,
not another deployment or source advancement; it does not establish the first
Python timeout's root cause.

Final proof: `delivery/independent-homebrew/verification.json`, SHA256
`c8e452239a8cbec57dc4542404b2cd0f40e336fbcbbf06470056510fc359db20`.
The closing documentation/scope suite passed all 38 tests, and `git diff --check`
passed. Functional code remains at the exact fully verified executor commit;
closing documentation changes do not replace that checkpoint.

## Next Source Entry

The next batch must explicitly use the R93 publication and source-index proofs
listed in Delivery Outcome, then capture its own new fresh baseline. The R73
publication is now an ancestor, not the current public Main source. Do not replay
the R79 upload, R89 completion, or this completed promotion journal/release key.
No historical or completion receipt is reusable write authorization.

Disk availability at closeout was approximately 17 GiB. No release/source chain,
backup, installed application or media was deleted. The R93 report is about
285 MiB and contains live publication dependencies, not a disposable build cache.
