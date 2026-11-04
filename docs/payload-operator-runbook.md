# Payload 最短操作手册

更新：2026-11-04，适用 Mac 单用户 CMS 与 Genshin/NTE guides。公众网站仍由 Cloudflare 多 Worker 服务，不回源 Mac。本文替代旧部署说明中的过时状态；历史验收看各轮报告。

**R30范围约束：Payload CMS只在这台Mac运行，不要求第二台Mac或跨机启动验收。** 最新异地备份的本机隔离PG/媒体恢复、实际CMS登录/导出/重启持久性已通过，详见[R30](../reports/payload-single-host-closeout-2026-11-03-r30/README.md)。这是复用已安装应用的本机恢复，不是整机重建；独立密钥托管仍待办。

**R32首次真实Genshin公网发布与来源交接已完成。保存或 published 不等于公网更新。** 真实标题“原神快速上手指南：基础操作、元素反应与资源规划”已通过双owner构建、四个候选/兼容恢复版本精确云预览、新鲜续验、正式推广/公网验收/source-advance；NTE原UUID/JSON保持，真实共享Main只读重绑定和重新选择也通过。下一条独立正常发布、实际NTE推广和独立key仍待验，当前不是稳定限定V1或原始项目全部完成。

**R35日常更新保护已安装：** [R34](../reports/payload-readiness-audit-2026-11-04-r34/README.md)复现的同游戏hold/撤回后隐式回退O，现由本地证据准备及正式推广的逐字段O/A/B门禁拒绝，正常/renewed推广写前均重新核验。**这不是导出器自动保留A，不能仅看manifest.changed或inspect通过就发布。** 遇到`Implicit reset to import O`应停止，核对当前公开A与候选完整差异及CMS批准状态；不批量清hold、混入草稿、手改pin或绕过门禁。刻意恢复到精确O同样拒绝，显式reset-intent尚未实现。hold/撤回不等于网站删除，可信A的手动恢复reader保持可用。精确代码CI/三模块安装与安装版两游戏fixture证据见[R35](../reports/payload-public-preservation-2026-11-04-r35/README.md)；本轮DB/线上内容未变，下一项是真实NTE发布，不重发R32候选。

当前工作包见[V1有限完成计划](../plans/payload-v1-completion-2026-11-03.md)，当前实测见[R32](../reports/payload-promotion-critical-path-2026-11-04-r32/README.md)，历史失败见[R31](../reports/payload-version-provenance-2026-11-03-r31/README.md)。R29不可靠历史content选择器已由[上传字节回执](payload-version-provenance-2026-11-03.md)替代：上传时绑定日志/UUID、出站multipart、响应ETag/字节及前后版本元数据；以后重验封存字节和新鲜不可变UUID身份，不伪造历史下载。三份旧来源仅接受审核原始pin，未知外部UUID仍拒绝。

本账户部署POST可能只返回id；发布器封存原始POST，再按返回精确部署ID GET严格核对同ID、percentage、单一正确UUID/100%，最后仍核对当前活动七服务拓扑，不因字段缺失重复POST。实际partial/显式兼容恢复/source-recover和恢复后另建run再次成功发布均已通过；旧失败/恢复journal保留，不再执行旧run。

发布前确认OAuth余量；本轮使用已安装Wrangler相同的官方refresh_token grant，在显式边界续签，权限集合不变，凭证仅写私有Wrangler配置、不进入报告，不伪造到期时间。认证续签不延长实时15分钟门禁。固定HTTPS目标GET的瞬时TypeError最多3次；仅上传后固定服务/UUID模块二进制GET自身传输超时可再读一次，每次180秒/最多两次/最多16MiB，尝试记录进入回执pin。HTTP错误、外部取消、元数据超时、预算/身份错误及云写不重试。HTTP采样最多4并发，失败等待活动同伴落盘。R32公共静态采样只对自身超时或已识别断流允许一次完整新读取，保存尝试证据；字节/身份/HTTP错误及外部取消不借此重试。

**R32已修复并实测通过推广重复封存校验耗时。** 去重仅限同步只读验证pass，不跨await、网络或写边界；写前仍重新读取字节、四版本身份、活动UUID/拓扑和900秒实时有效性。实测推广202.16秒，首/次intent时最老候选证明约96.85/134.24秒；不是网络时延保证。下一条真实编辑另建run，不重发本轮已成功releaseKey，不重放历史失败journal，不改acceptedAt/延长窗口/跳过写前漂移。不要求内容准确度审稿；发布意图、身份、安全和新增媒体权利仍保留。

## 1. 编辑者只需做什么

1. 打开 `http://127.0.0.1:3100/admin` 并登录，进入内容记录，筛选游戏与 guides。账号密码只在本机私有文件中保存，不复制进报告或聊天。
2. 选一条既有指南，切换 zh/en/ja locale，只修改后台的 **title / body**（导出时对应原文 title / content）。保留 ID、slug、URL、顺序、bodyFormat、sourceRecord 来源基线、媒体及其他字段；缺译不自动补齐。不要批量解除 hold。
3. 查看差异，确认这是你希望公开的实际编辑。需要发布时将**这一条**记录 hold 设为 false，再用发布动作保存为 published。该动作要求 admin/reviewer 身份，editor 只能保存草稿；这是操作资格，不是事实准确度审稿。草稿或 hold=true 不进入正式导出。

R33已补齐撤回边界：editor的更新必须显式保存草稿（REST为`?draft=true`），普通/批量非草稿更新均要求admin/reviewer；不能通过写入`_status: draft`直接撤回已批准记录。多语言草稿不会覆盖已批准版本的正式导出，`draft=true`也不授予editor发布资格。admin/reviewer可明确hold、撤回或恢复版本，但这些CMS动作**不等于网站页面已撤回或Cloudflare已切流**；仍须按实际差异和完整发布/恢复门禁处理。完整UI/并发和网站撤回流程尚未全部验收，见[R33](../reports/payload-editorial-lifecycle-2026-11-04-r33/README.md)。
4. 由下面的维护流程导出、构建、预览并推广。没有真实变更时返回 no_changes，应停止；不得加入演练文案凑一次发布。

初始凭据位置：`~/Library/Application Support/GachiaCMS/initial-admin.txt`，首次登录后更改密码。未配置邮件找回；丢失密码应走本机管理员恢复，不能开放 first-user 注册。

## 2. 本机入口与备份

以下变量只在终端设置；占位变量必须取自**同一 run 的实际输出**，不能填历史报告的演练 ID/pin。

```sh
CMS="$HOME/Library/Application Support/GachiaCMS/desktop.py"
REPO="/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia"
GAME=genshin
cms() { python3 "$CMS" "$@"; }
cms status
cms backup
```

`GAME` 可改为 nte；所有 publish 命令从候选读取 game，不额外加 --game。每次实际发布前保留新冷备。backup 会短暂停止并恢复 CMS，不影响公网；备份含数据库、私有媒体、settings，不能公开。

命令参数严格按各action白名单检查；不适用的`--game`、`--preview`、`--backup`等会拒绝，不会静默忽略。`content-import`没有preview模式，执行会导入缺少的记录，日常编辑/发布不需要重导入；**`--preview`只适用于`content-export`**。无关参数及导入的多余参数必须修正后重试，不通过绕过manager或直接调用脚本规避门禁。

数据根目录 `~/Library/Application Support/GachiaCMS`，仅 loopback PostgreSQL 54329/CMS 3100；不启用 Tunnel、端口映射或远程编辑。R30已对最新R29私有R2对象新下载、认证解密并实际同机恢复应用；隔离PG临时使用54330，验收后已停止，原CMS恢复3100。独立密钥托管仍未验；不要求跨机应用启动，见[异地备份与恢复](payload-offsite-recovery.md)。源码交付包不替代运行备份。

## 3. 导出与本地预览：不写云

```sh
cms content-export --repo "$REPO" --game "$GAME" --preview
cms content-export --repo "$REPO" --game "$GAME"
cms publish-plan --repo "$REPO" --release-key "$RELEASE_KEY"
cms publish-prepare --repo "$REPO" --release-key "$RELEASE_KEY"
cms publish-source-select --run "$RUN" --pin "$PLAN_PIN"
cms publish-build --run "$RUN" --pin "$PLAN_PIN"
cms publish-preview --run "$RUN" --pin "$PLAN_PIN"
cms publish-verify --run "$RUN" --pin "$PLAN_PIN"
```

- 正式导出不加 --preview；releaseKey 为返回值，候选在 `GachiaCMS/publish/<releaseKey>/`。preview=true 永不允许云上传。
- prepare 返回 runId、planSHA256，分别记为 RUN/PLAN_PIN；冻结指定 Git commit（默认 HEAD），不会把工作区未提交代码一起打包。工程包保存当前源码并不等于 Git 已交付。
- R29起，正式prepare先只读选择当前来源，读取经完整来源链校验的Main树，并与公网另一游戏指南逐字节核对；把它同时冻结到package/public两个构建输入。plan固定来源/响应pin和Main UUID；build、retain、封存、候选及恢复云预览/公网验收均保留该JSON，不回退另一游戏的Git导入O或夹带未发布CMS内容。共享Main变化先显式rebind，再重新prepare，禁止复用旧run。
- 已登记来源时，source-select在build前按当前game/Main UUID自动选择；输出evidencePath/evidencePin→ASSET_SOURCE/ASSET_SOURCE_PIN、sourcePath/sourcePin→RECOVERY_SOURCE/RECOVERY_SOURCE_PIN。不需要为新releaseKey手拼旧来源路径。未登记或当前UUID已变化则停止，先走第4节的首次/新版本来源交接，不可跳过拒绝后照常上传。
- run 在 `~/.gachia-cms-releases/<runId>/`；证据/锁/日志不得删除重建。两个 owner 必须全部通过，不能只发游戏而遗留 Main 的公开 JSON。
- 本地预览是真实临时 Worker，响应正文、metadata/JSON-LD/引用/静态字节、sitemap 和 cache 保存到返回目录，不是长期预览站点或 Cloudflare 验收。

Cloudflare的`/settings`会随未部署版本上传改变`annotations.workers/message`；R29仅从拓扑比较中排除此版本描述字符串，原值仍保存取证。其他annotations、兼容配置、bindings、observability、路由、服务及部署身份仍严格比较。旧失败journal不可删除或重试；先只读对账，确认无未知写入，再另建run执行全部门禁。

## 4. 维护者准备资源、上一公开基线和兼容恢复：不写云

### 已登记来源的推荐入口（R26）

第3节完成双owner build/preview/verify后，用一个命令准备本轮本地证据：

```sh
cms publish-prepare-evidence --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO"
```

仅接收已经构建、非preview且有真实文字变化的候选；若候选与当前公开A相同也拒绝。按当前game/Main UUID选择并重验来源→刷新全部登记公网资源→保留旧资源到候选→从plan固定sourceCommit读取导入O并采样公开A→下载精确云runtime、派生本地兼容恢复并采样三语言/JSON/metadata/JSON-LD/sitemap/静态/账号→再次选择来源与检查七服务拓扑。全程持有同一run锁，不接受任意URL/Worker/force/skip，不自动build、登记首次来源、上传或切流。

输出`manifestPath/manifestPin`为本地汇总回执；`assets.evidencePath/evidencePin`、`retention.id/retentionPin`、`baseline.baselinePath/baselinePin`、`recovery.evidencePath/evidencePin`分别提供后续所需pin。将`retention`记为RETENTION/RETENTION_PIN，将`recovery`记为BOUND_RECOVERY/BOUND_RECOVERY_PIN；无需再重复手动assets-refresh、retain、baseline-capture或recovery-local-prepare。下面对应单步命令保留给首次托管/故障定位，不与推荐入口重复运行。

**仍必须执行publish-verify-retained、publish-preview-retained、publish-cloud-check、publish-recovery-check及全部云封存/精确预览/推广门禁**，继续使用下面的云命令。汇总回执固定`productionReady:false`、`cloudRecoveryAccepted:false`，不能当上传/上线批准或替代15分钟证据时效；`verifyEvidencePreparation`仅离线重验，不续期或重读云。资源范围仍是已登记清单，不新增未批准媒体或完整资产清单声明。

每次生成独立`evidence-preparation-<id>`目录，阶段日志、中间结果、实际响应正文/headers和恢复树均保留，成功manifest最后排他写入。失败看输出diagnostics目录；修正原因后同一命令**创建全新尝试**，不续用半成品、不覆盖旧回执。保留原始source/run依赖，不清理旧目录。如果run已有任何上传/推广/恢复写journal（包括空/截断文件）则拒绝，先按第6节只读对账，不能删日志后重跑。

### 单步命令与首次来源托管

R20新增 `publish-project-inventory`（只读观察10Worker）、`publish-assets-refresh`（新鲜公网资源字节/当前云模块）和 `publish-recovery-local-prepare`（当前云runtime + 新旧静态并集 + 实际loopback采样）。管理器自动输出本轮evidencePath/evidencePin，不再手写HTTP成功回执。它们不上传、不部署、不解锁CI或通用目标。

**尚无一键自动生成全部资源/恢复证据并从零建立可信来源的命令**：首次基线托管仍由维护者准备。ASSET_SOURCE/ASSET_SOURCE_PIN指已经验证的双owner旧资源来源，不是旧HTTP批准；新命令重新读取当前版本、比对历史game模块，并重采全部已登记的game/Main公网静态字节。来源过期即停止，没有“跳过来源”或直接approved标记。旧资源范围仍是已记录清单，不宣称完整Cloudflare资产清单。

RECOVERY_SOURCE/RECOVERY_SOURCE_PIN是固定game/Main来源树清单：`schemaVersion:1`、game及owners；每个owner包含当前公开versionId、可信旧`.open-next`的directory和完整artifactSHA256（来自artifactFiles规范JSON的SHA）。来源清单是字节身份输入，不是审批；命令将重新下载精确当前云模块替换**派生副本**的runtime，拒绝源树/UUID/静态冲突，验证旧JSON和三语言页面与当前精确版本一致。第一轮可使用已验历史制品；后续B必须指向当前公开A，不沿用最初O。不得直接复用R14/R15诊断UUID、publishable=false产物或合成回执。

### 首次/新版本登记与后续自动选择

R21新增只读`publish-source-register`/`publish-source-select`。首次取得可信资源、当前A的完整来源树、版本绑定baseline及实际本地恢复证据后，用**该来源run**登记一次；首次尚无目录时仍按本节原流程提供人工核实的来源，完成恢复采样后再登记，不循环调用select来“补齐”来源。

```sh
cms publish-source-register --run "$SOURCE_RUN" --pin "$SOURCE_PLAN_PIN" --retention "$SOURCE_RETENTION" --retention-pin "$SOURCE_RETENTION_PIN" --evidence "$SOURCE_RECOVERY_EVIDENCE" --evidence-pin "$SOURCE_RECOVERY_PIN"
```

注意register的evidence是已验**本地恢复回执**，资源来源从该run的retention回执读取，不能误传资源evidence。登记重新GET当前双owner精确版本模块及Main公开JSON，核对A而非导入O、来源树/HTTP回执/pin及前后七服务拓扑。固定目录`~/.gachia-cms-releases/source-catalog/<game>/<gameUUID>-<mainUUID>/`仅本机用户可读写，manifest最后排他写入，旧项/不完整项都不覆盖。

后续新候选可按第3节select提前检查，无需手工改清单；select重新校验来源、模块、当前JSON及本轮拓扑，**仍须为新候选执行assets-refresh、baseline-capture、recovery-local-prepare与全部云门禁**，前三项可由R26入口串联，云门禁不合并。目录是可信本机索引，不是外部签名批准，不包含全部副本；原始私有来源/回执被删除或篡改即失效，不可将旧release目录当垃圾清理。没有“latest”、原始O回退或部署后自动接续：game或Main发布新UUID后必须重新交接/登记，不能复用原条目；其他Worker的历史版本变化不等于这两个来源UUID变化，但每轮七服务前后漂移仍拒绝。

登记/选择可读取由诊断run取得的**当前公众基线来源**，不使诊断候选变为正式内容；productionReady保持false，诊断制品仍禁止上传。R21实机登记范围与证据见对应报告，不把隔离双游戏测试称作两游戏实际登记。

R22已为没有候选run的NTE历史基线完成一次性source-only交接：保留原树，派生副本仅替换为当前精确云runtime，重新采样本地HTTP及精确云响应，再由安装版模块登记/选择。证据见[R22报告](../reports/payload-nte-source-handoff-2026-11-02-r22/README.md)。这不是新增通用CLI或候选资格豁免；不要为登记造run/releaseKey，后续真实NTE候选仍按第3节执行select和全部门禁。game/Main新UUID出现后仍须新证据，不能复制此历史条目改UUID。

```sh
cms publish-project-inventory
cms publish-assets-refresh --run "$RUN" --pin "$PLAN_PIN" --evidence "$ASSET_SOURCE" --evidence-pin "$ASSET_SOURCE_PIN"
cms publish-retain --run "$RUN" --pin "$PLAN_PIN" --evidence "$ASSET_EVIDENCE" --evidence-pin "$ASSET_PIN"
cms publish-verify-retained --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-preview-retained --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-cloud-check --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-baseline-capture --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-recovery-local-prepare --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN" --baseline "$BASELINE_PATH" --baseline-pin "$BASELINE_PIN" --source "$RECOVERY_SOURCE" --source-pin "$RECOVERY_SOURCE_PIN"
cms publish-recovery-check --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN" --evidence "$BOUND_RECOVERY" --evidence-pin "$BOUND_RECOVERY_PIN"
cms publish-cloud-prepare --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-cloud-verify --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN"
cms publish-recovery-prepare-cloud --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN" --evidence "$BOUND_RECOVERY" --evidence-pin "$BOUND_RECOVERY_PIN"
cms publish-recovery-verify-cloud --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN"
```

输出映射：assets-refresh的evidencePath/evidencePin→ASSET_EVIDENCE/ASSET_PIN；retain的id/retentionPin；baseline-capture的baselinePath/baselinePin；recovery-local-prepare的evidencePath/evidencePin→BOUND_RECOVERY/BOUND_RECOVERY_PIN（已绑定上一公开基线）；cloud-prepare的id/bundlePin；recovery-prepare-cloud的id/recoveryBundlePin。逐项保存同一run的真实输出，不混用候选bundle、恢复bundle和receipt pin。旧baseline-bind保留给已有本地回执的兼容路径，不是新主流程必做步骤。

上一公开内容 A 与最初 Git 导入 O 必须分开。第二轮 B 的恢复必须恢复 A，不能默认为 O；baseline-capture 使用当前精确 Main UUID 内容并核查前后七服务拓扑。基线变化或静态路径同名异字节时停止并重新取证。

### 当前Mac的版本预览网络

R20发现当前系统对workers.dev的直连解析返回异常地址，Node默认不读取macOS PAC；既有系统PAC指向本机SOCKS5 `127.0.0.1:1080`。已用当前Node25.9.0验证，仅对本轮命令设置以下环境即可访问精确版本预览；没有改系统DNS/代理、启动新代理或关闭TLS校验。SOCKS支持仍为Node实验特性，其他机器须先验证，不盲用此端口。

```sh
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=socks5://127.0.0.1:1080 NO_PROXY=127.0.0.1,localhost,gachia.com cms publish-baseline-capture --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
```

同一环境可用于source-register/source-select、recovery-local-prepare及后续精确版本只读验收；R32成功实测API与workers.dev走既有代理，loopback/正式域名直连。Wrangler whoami及官方OAuth refresh单独取消HTTP_PROXY/HTTPS_PROXY/ALL_PROXY/NODE_USE_ENV_PROXY，认证凭据不得写报告；这不是修改系统代理或允许云写重试。先核验已有本地代理和精确预览HTTP，不自动发现或信任任意远程代理。已经出现上传/推广intent时仍先对账，不能借网络修复重跑写操作；不得用普通公网别名或本地响应代替精确版本证据。

## 5. 上传精确云预览与推广：以下会写云

用户已给予所需操作默认授权，不重复等待逐项确认；但仅接受真实编辑候选及它自己的完整证据。四个候选/兼容恢复版本的上传与预览均不能省略。

```sh
cms publish-cloud-upload-preview --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN" --release-key "$RELEASE_KEY"
cms publish-recovery-upload-preview --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --release-key "$RELEASE_KEY"
cms publish-recovery-receipt-check --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --release-key "$RELEASE_KEY" --receipt-pin "$RECEIPT_PIN"
cms publish-cloud-promote --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --release-key "$RELEASE_KEY" --receipt-pin "$RECEIPT_PIN" --journal-pin "$JOURNAL_PIN"
```

候选上传返回 journalSHA256 → JOURNAL_PIN；恢复上传返回 receiptPin → RECEIPT_PIN。上传创建非活动版本、不切流；最后的 promote 顺序切换游戏/Main 并验公网。精确 UUID、模块/runtime/bindings、HTTP 覆盖、noindex、15分钟时效和拓扑均重验；不接受普通 workers.dev 别名替代精确版本预览。

推广成功须看到 production_accepted，并保留精确 UUID、journal SHA、公网实际响应及对应 releaseKey；不能仅以 HTTP 200 或 CMS 的 published 判定完成。失败时不要继续执行本节下一条命令。

### 发布成功后：只读接续新 UUID 来源

R24新增显式`publish-source-advance`。仅在上述推广**完整成功**后，用该run的BUNDLE/BUNDLE_PIN及推广返回的journalSHA256（记为PROMOTION_JOURNAL_PIN，不能误用上传的JOURNAL_PIN）执行：

```sh
cms publish-source-advance --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN" --promotion-journal-pin "$PROMOTION_JOURNAL_PIN"
```

命令不上传或切流：重读完整发布journal、封存bundle及全部已保存公网正文，确认game/Main当前100% UUID，重验归档模块字节与新鲜精确UUID版本配置、全部封存静态和动态精确预览，取得当前公开A的JSON。保留原树，仅派生副本替换经验证的归档runtime，自动生成两owner资源来源、baseline和完整树pin，登记到新UUID固定目录。Main使用明确的本机发布bundle/journal来源，不捏造GitHub artifact ID；下一轮retain可直接使用返回的资源证据。

下一次B仍prepare新run、source-select，并执行全部新鲜资源/基线/兼容恢复/云门禁；旧A的发布journal可以作为历史来源，但不延长候选/恢复批准的15分钟时效。没有“latest”、原始O回退或部署后自动接续：本命令是发布成功后的显式只读交接，且目标仍是当前精确UUID；不是后台自动追踪。partial failure或恢复UUID不符合本命令，已知完整兼容恢复走第6节source-recover；外部部署、未知版本或缺完整本机封存来源仍走第4节维护者交接，不猜版本或重复部署。跨游戏共享Main变化使用下节受控交接，不能直接套用另一游戏条目。首次无可信来源也仍需维护者，不宣称一键从零发布。

### 另一游戏发布后：只读重绑定共享 Main

R25新增`publish-source-rebind`。例如Genshin成功发布并完成source-advance后，NTE游戏Worker UUID未变，但Main已更新；此时用**NTE的原始游戏来源**目录manifest及新Genshin来源目录manifest组合验证，不复制文件改game/UUID。

```sh
cms publish-source-rebind --source "$TARGET_SOURCE_MANIFEST" --source-pin "$TARGET_SOURCE_PIN" --main-source "$NEW_MAIN_SOURCE_MANIFEST" --main-source-pin "$NEW_MAIN_SOURCE_PIN"
```

四个值分别是目标游戏旧登记返回的manifestPath/manifestPin，以及另一游戏本次source-advance或source-recover返回的manifestPath/manifestPin。命令没有run、plan pin或releaseKey，不为NTE捏造候选。目标可为原始retained/recovery、R22历史source-only、已成功发布或完整兼容恢复来源；不接受重绑定结果作为父来源，重复交接仍引用同一**原始游戏来源**。Main必须来自另一游戏的完整本机成功发布或已知完整兼容恢复，不能用历史诊断、外部部署、原始旧UUID或未知UUID。若目标游戏自身UUID已变，应走该游戏source-advance/source-recover或维护者交接。

重读两方全部来源树/pin/历史HTTP、成功发布journal和公网证据；确认目标UUID未变、只有另一游戏/Main的历史部署变化且受保护配置不变。新Main源文件及新鲜精确版本JSON都必须仍等于目标上一公开A，而非O或另一套内容；三语言指南、body/metadata/JSON-LD/media、sitemap、账号禁用、已登记静态、双模块/版本配置和noindex/cookie/cache均重验。目标静态范围为已pin的当前游戏capture，不将本地恢复树的forward-only候选chunks冒称已在云端；新Main仍重验全部封存静态。未宣称完整未知云资源清单。原树/原目录不写，输出新固定目标game/Main条目和组合资源证据；已有/不完整条目不覆盖。返回的sourcePath/sourcePin与evidencePath/evidencePin只供后续source-select及第4节准备使用，不是新发布批准，也不延长15分钟批准。

全部采样正文、版本模块和诊断保存在`~/.gachia-cms-releases/source-rebind-<id>/`，依赖两方原始run/目录，不是自包含备份。失败保留诊断、停止，不回退latest/O或自动部署。R32已在真实Genshin成功发布/source-advance后完成NTE+新Main只读重绑定，并再次source-select通过；这不是实际NTE发布或双向交接全部通过。首次交接的robots合约失败目录保留，修复后使用新目录；精确预览robots只按既有noindex/deny-all合约验，不错误要求公网robots正文/缓存相同。非robots的body/metadata/JSON-LD/media/cache/静态字节及HTML robots仍严格验证。无完整成功发布或兼容恢复时不运行假交接。首次可信来源、外部部署/未知手工恢复仍由维护者处理。

四个历史staging别名不是Payload发布中转站，不要为本流程部署它们或用其HTTP替代精确候选UUID验收。R23已完成限定HTTP/已知自动构建入口调查：动态noindex/robots禁爬成立，但语言cookie与公开缓存差异仍保留，未降低本流程的正式门禁；也未在账户层强制只有本机能部署。详见[R23报告](../reports/payload-staging-inspection-2026-11-02-r23/README.md)。

## 6. 过期续验、部分失败与显式恢复

| 现象 | 处理 |
| --- | --- |
| no_changes | 停止，无需构建/上传；不是内容准确度问题 |
| 构建/本地预览失败 | 保留日志与产物，修原因后 prepare 新 run；不改原 state 或删锁凑成功 |
| 401/登录过期 | 仅在尚未开始写操作时用已有 Wrangler whoami 刷新认证；已有上传/推广 intent 先对账，不能自动重试 |
| 模块/资源/拓扑不一致 | 停止，保存观察；不能换 service/UUID/百分比或绕过校验 |
| 上传/推广响应丢失、第二目标失败 | 视为可能已经写入，只读对账；不重跑上传，不自动 rollback |
| 完整预览仅超过15分钟 | 同 UUID 只读续验，不修改旧 acceptedAt/journal |
| 已出现推广 intent | 不以续验绕过排他 journal；对账后决定完成运维调查或显式兼容恢复 |

```sh
cms publish-cloud-reconcile --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN"
cms publish-evidence-renew --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --journal-pin "$JOURNAL_PIN" --receipt-pin "$RECEIPT_PIN" --release-key "$RELEASE_KEY" --mode promote
cms publish-cloud-promote-renewed --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --journal-pin "$JOURNAL_PIN" --receipt-pin "$RECEIPT_PIN" --release-key "$RELEASE_KEY" --renewal "$RENEWAL" --renewal-pin "$RENEWAL_PIN"
```

上面的 reconcile/renew 只 GET；promote-renewed 会切流，只适用于尚未有推广 journal 的同一候选。renew 的 id/renewalPin 对应 RENEWAL/RENEWAL_PIN。

决定恢复时重新生成 **recover** 模式续验，替换 RENEWAL/RENEWAL_PIN；取原 `promotion-<retention>.jsonl` 当前完整文件 SHA-256 为 PROMOTION_JOURNAL_PIN，再执行：

```sh
cms publish-evidence-renew --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --journal-pin "$JOURNAL_PIN" --receipt-pin "$RECEIPT_PIN" --release-key "$RELEASE_KEY" --mode recover
cms publish-manual-recover --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --journal-pin "$JOURNAL_PIN" --receipt-pin "$RECEIPT_PIN" --release-key "$RELEASE_KEY" --renewal "$RENEWAL" --renewal-pin "$RENEWAL_PIN" --promotion-journal-pin "$PROMOTION_JOURNAL_PIN"
```

manual-recover 会切到**已经验收的兼容恢复 UUID**。原始旧 UUID 可能缺新 chunks，不准直接回退。撕裂 journal、未知版本/split 或恢复响应丢失均保留现场，不能删日志、改时间、补伪成功事件或自动重复写入。

### 兼容恢复成功后：只读接续来源

R28新增`publish-source-recover`。只接纳上述manual-recover完整成功且具有`recovery_accepted`的同一run；保存其返回journalSHA256为RECOVERY_JOURNAL_PIN，不能误用候选上传JOURNAL_PIN、恢复上传receipt或PROMOTION_JOURNAL_PIN。

```sh
cms publish-source-recover --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN" --journal-pin "$JOURNAL_PIN" --receipt-pin "$RECEIPT_PIN" --release-key "$RELEASE_KEY" --renewal "$RENEWAL" --renewal-pin "$RENEWAL_PIN" --promotion-journal-pin "$PROMOTION_JOURNAL_PIN" --recovery-journal-pin "$RECOVERY_JOURNAL_PIN"
```

命令只读云端、不上传/切流：重验原候选/封存兼容恢复、recover模式renewal、推广及完整恢复journal、历史multipart/版本配置/实际公网正文；重新读取当前双恢复UUID/模块/配置、全部封存静态和精确预览HTTP、公开A与七服务拓扑。派生副本仅替换runtime，原树不改；Main登记为明确的本机兼容恢复来源，不伪造成功推广或GitHub artifact身份。未知外部恢复、partial/torn journal、原始旧UUID、候选UUID、漂移或来源被篡改都拒绝。

历史证据按已pin的实际恢复完成时间核验当时的时效，**不延长实时15分钟门禁，也不授权再次推广/恢复**。返回manifestPath/manifestPin、sourcePath/sourcePin、evidencePath/evidencePin用于下一次全新run的source-select/prepare-evidence/retain；恢复的是上一公开A，不是导入O或失败候选B。另一游戏共享Main变化可用该新manifest执行source-rebind，但目标game UUID及公开A仍必须不变。保留原run与全部依赖，不重跑旧发布或清journal。双游戏磁盘链/loopback工程回归已覆盖；R31真实云恢复→来源接续→R32另建run成功再发已通过。独立正常下一次发布及实际NTE发布仍归C03/C04待验。

## 7. 交付与安全边界

- 当前生产依赖仍 1 low：deepmerge 返回对象 prototype poisoning 可复现；临时限定单用户 loopback 接受，复核截止2026-11-16。远程化、多不可信用户/导入、上游修复或风险升级时立即重评，见 [依赖风险决定](payload-dependency-risk-2026-11-02.md)。不是漏洞已修复或外网运行豁免。
- `payload-source-handoff.py` 的 pack/verify/extract 交付源码、锁、测试、文档和限定报告，不含 Git 历史、依赖、构建物、数据库、密钥、私有媒体或发布日志。外部 SHA 必须来自交付回执。
- 在新目录校验/解包后可验证源码；需要已有 Git baseCommit 和实际依赖安装才能重新构建发布。不得在真实 GachiaCMS 路径覆盖解包，也不执行 install/resume-install 覆盖已有安装。
- R18 已冻结源码并推送 `codex/payload-unified-maintenance`，实际 GitHub Linux 验证通过。prepare 应使用该已同步分支/精确提交，不使用旧 main 或未提交源码；不需要合并 main 来运行本机发布工具。
- 验证 workflow 仅允许该精确任务分支 push/手动运行，只有只读权限、不保留 checkout 凭据、不用 secrets、不能部署；两个 Cloudflare GitHub 部署开关保持 false。CI 不执行真实桌面 manager。
- R20资源刷新/本地兼容恢复已接入管理器；首次可信来源登记及每轮真实云预览/验收仍不可省略。R30本机应用恢复已验、跨机启动出范围，独立密钥托管仍单列；本机恢复不等于整机丢失可解密，Git/验证CI完成也不等于真实内容云发布已验收。
