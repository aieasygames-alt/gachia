# Payload 最短操作手册

更新：2026-11-02，适用已安装的 Mac 单用户 CMS 与 Genshin/NTE guides。公众网站仍由 Cloudflare 多 Worker 服务，不回源 Mac。本文替代旧部署说明中的过时状态；历史验收看各轮报告。

**当前已安装发布/恢复能力，但首次真实编辑的云端验收尚未完成。保存或 published 不等于公网更新。** 不要求事实准确度审稿；保留发布意图、身份/版本、安全和新媒体权利边界。

## 1. 编辑者只需做什么

1. 打开 `http://127.0.0.1:3100/admin` 并登录，进入内容记录，筛选游戏与 guides。账号密码只在本机私有文件中保存，不复制进报告或聊天。
2. 选一条既有指南，切换 zh/en/ja locale，只修改后台的 **title / body**（导出时对应原文 title / content）。保留 ID、slug、URL、顺序、bodyFormat、sourceRecord 来源基线、媒体及其他字段；缺译不自动补齐。不要批量解除 hold。
3. 查看差异，确认这是你希望公开的实际编辑。需要发布时将**这一条**记录 hold 设为 false，再用发布动作保存为 published。该动作要求 admin/reviewer 身份，editor 只能保存草稿；这是操作资格，不是事实准确度审稿。草稿或 hold=true 不进入正式导出。
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

数据根目录 `~/Library/Application Support/GachiaCMS`，仅 loopback PostgreSQL 54329/CMS 3100；不启用 Tunnel、端口映射或远程编辑。R17已在独立私有R2完成新密文上传/下载、认证解密和同机隔离恢复；独立密钥托管及跨机应用启动仍未验，见[异地备份与恢复](payload-offsite-recovery.md)。源码交付包不替代运行备份。

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
- 已登记来源时，source-select在build前按当前game/Main UUID自动选择；输出evidencePath/evidencePin→ASSET_SOURCE/ASSET_SOURCE_PIN、sourcePath/sourcePin→RECOVERY_SOURCE/RECOVERY_SOURCE_PIN。不需要为新releaseKey手拼旧来源路径。未登记或当前UUID已变化则停止，先走第4节的首次/新版本来源交接，不可跳过拒绝后照常上传。
- run 在 `~/.gachia-cms-releases/<runId>/`；证据/锁/日志不得删除重建。两个 owner 必须全部通过，不能只发游戏而遗留 Main 的公开 JSON。
- 本地预览是真实临时 Worker，响应正文、metadata/JSON-LD/引用/静态字节、sitemap 和 cache 保存到返回目录，不是长期预览站点或 Cloudflare 验收。

## 4. 维护者准备资源、上一公开基线和兼容恢复：不写云

R20新增 `publish-project-inventory`（只读观察10Worker）、`publish-assets-refresh`（新鲜公网资源字节/当前云模块）和 `publish-recovery-local-prepare`（当前云runtime + 新旧静态并集 + 实际loopback采样）。管理器自动输出本轮evidencePath/evidencePin，不再手写HTTP成功回执。它们不上传、不部署、不解锁CI或通用目标。

**尚无一键自动生成全部资源/恢复证据并从零建立可信来源的命令**：首次基线托管仍由维护者准备。ASSET_SOURCE/ASSET_SOURCE_PIN指已经验证的双owner旧资源来源，不是旧HTTP批准；新命令重新读取当前版本、比对历史game模块，并重采全部已登记的game/Main公网静态字节。来源过期即停止，没有“跳过来源”或直接approved标记。旧资源范围仍是已记录清单，不宣称完整Cloudflare资产清单。

RECOVERY_SOURCE/RECOVERY_SOURCE_PIN是固定game/Main来源树清单：`schemaVersion:1`、game及owners；每个owner包含当前公开versionId、可信旧`.open-next`的directory和完整artifactSHA256（来自artifactFiles规范JSON的SHA）。来源清单是字节身份输入，不是审批；命令将重新下载精确当前云模块替换**派生副本**的runtime，拒绝源树/UUID/静态冲突，验证旧JSON和三语言页面与当前精确版本一致。第一轮可使用已验历史制品；后续B必须指向当前公开A，不沿用最初O。不得直接复用R14/R15诊断UUID、publishable=false产物或合成回执。

### 首次/新版本登记与后续自动选择

R21新增只读`publish-source-register`/`publish-source-select`。首次取得可信资源、当前A的完整来源树、版本绑定baseline及实际本地恢复证据后，用**该来源run**登记一次；首次尚无目录时仍按本节原流程提供人工核实的来源，完成恢复采样后再登记，不循环调用select来“补齐”来源。

```sh
cms publish-source-register --run "$SOURCE_RUN" --pin "$SOURCE_PLAN_PIN" --retention "$SOURCE_RETENTION" --retention-pin "$SOURCE_RETENTION_PIN" --evidence "$SOURCE_RECOVERY_EVIDENCE" --evidence-pin "$SOURCE_RECOVERY_PIN"
```

注意register的evidence是已验**本地恢复回执**，资源来源从该run的retention回执读取，不能误传资源evidence。登记重新GET当前双owner精确版本模块及Main公开JSON，核对A而非导入O、来源树/HTTP回执/pin及前后七服务拓扑。固定目录`~/.gachia-cms-releases/source-catalog/<game>/<gameUUID>-<mainUUID>/`仅本机用户可读写，manifest最后排他写入，旧项/不完整项都不覆盖。

后续新候选按第3节select，无需手工改清单；select重新校验来源、模块、当前JSON及本轮拓扑，**仍须为新候选执行assets-refresh、baseline-capture、recovery-local-prepare与全部云门禁**。目录是可信本机索引，不是外部签名批准，不包含全部副本；原始私有来源/回执被删除或篡改即失效，不可将旧release目录当垃圾清理。没有“latest”、原始O回退或部署后自动接续：game或Main发布新UUID后必须重新交接/登记，不能复用原条目；其他Worker的历史版本变化不等于这两个来源UUID变化，但每轮七服务前后漂移仍拒绝。

登记/选择可读取由诊断run取得的**当前公众基线来源**，不使诊断候选变为正式内容；productionReady保持false，诊断制品仍禁止上传。R21实机登记范围与证据见对应报告，不把隔离双游戏测试称作两游戏实际登记。

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
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=socks5://127.0.0.1:1080 NO_PROXY=127.0.0.1,localhost,api.cloudflare.com,gachia.com cms publish-baseline-capture --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
```

同一环境可用于source-register/source-select、recovery-local-prepare及后续精确版本只读验收；loopback/API/正式域名保持直连。先核验已有本地代理和精确预览HTTP，不自动发现或信任任意远程代理。已经出现上传/推广intent时仍先对账，不能借网络修复重跑写操作；不得用普通公网别名或本地响应代替精确版本证据。

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

## 7. 交付与安全边界

- 当前生产依赖仍 1 low：deepmerge 返回对象 prototype poisoning 可复现；临时限定单用户 loopback 接受，复核截止2026-11-16。远程化、多不可信用户/导入、上游修复或风险升级时立即重评，见 [依赖风险决定](payload-dependency-risk-2026-11-02.md)。不是漏洞已修复或外网运行豁免。
- `payload-source-handoff.py` 的 pack/verify/extract 交付源码、锁、测试、文档和限定报告，不含 Git 历史、依赖、构建物、数据库、密钥、私有媒体或发布日志。外部 SHA 必须来自交付回执。
- 在新目录校验/解包后可验证源码；需要已有 Git baseCommit 和实际依赖安装才能重新构建发布。不得在真实 GachiaCMS 路径覆盖解包，也不执行 install/resume-install 覆盖已有安装。
- R18 已冻结源码并推送 `codex/payload-unified-maintenance`，实际 GitHub Linux 验证通过。prepare 应使用该已同步分支/精确提交，不使用旧 main 或未提交源码；不需要合并 main 来运行本机发布工具。
- 验证 workflow 仅允许该精确任务分支 push/手动运行，只有只读权限、不保留 checkout 凭据、不用 secrets、不能部署；两个 Cloudflare GitHub 部署开关保持 false。CI 不执行真实桌面 manager。
- R20资源刷新/本地兼容恢复已接入管理器；首次可信来源登记及每轮真实云预览/验收仍不可省略。独立密钥托管及跨机应用启动仍单列；私有R2密文往返通过不等于完整灾备完成，Git/验证CI完成也不等于真实内容云发布已验收。
