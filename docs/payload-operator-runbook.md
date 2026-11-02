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
cms publish-build --run "$RUN" --pin "$PLAN_PIN"
cms publish-preview --run "$RUN" --pin "$PLAN_PIN"
cms publish-verify --run "$RUN" --pin "$PLAN_PIN"
```

- 正式导出不加 --preview；releaseKey 为返回值，候选在 `GachiaCMS/publish/<releaseKey>/`。preview=true 永不允许云上传。
- prepare 返回 runId、planSHA256，分别记为 RUN/PLAN_PIN；冻结指定 Git commit（默认 HEAD），不会把工作区未提交代码一起打包。工程包保存当前源码并不等于 Git 已交付。
- run 在 `~/.gachia-cms-releases/<runId>/`；证据/锁/日志不得删除重建。两个 owner 必须全部通过，不能只发游戏而遗留 Main 的公开 JSON。
- 本地预览是真实临时 Worker，响应正文、metadata/JSON-LD/引用/静态字节、sitemap 和 cache 保存到返回目录，不是长期预览站点或 Cloudflare 验收。

## 4. 维护者准备资源、上一公开基线和兼容恢复：不写云

这一步仍是维护者流程，**尚无一键自动生成全部资源/恢复证据的管理器命令**。不能让编辑者手填一个 approved=true 或重新签 JSON 来跳过。

维护者用 `desktop-release-assets.mjs` 的 captureGameAssets/verifyAssetEvidence，绑定当前游戏 UUID/deployment/etag、历史网络清单及真实静态字节，同时核对 Main 可信旧制品来源。使用保留制品、当前旧 runtime 与新旧静态资源并集，按 `desktop-release-readiness.mjs` 的 verifyRecoveryCompatibility 合同生成该 run 的本地恢复 HTTP 证据。参考 R14/R15 的实测与执行脚本，但不得直接复用其诊断 UUID、publishable=false 制品或合成回执。

```sh
cms publish-retain --run "$RUN" --pin "$PLAN_PIN" --evidence "$ASSET_EVIDENCE" --evidence-pin "$ASSET_PIN"
cms publish-verify-retained --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-preview-retained --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-cloud-check --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-baseline-capture --run "$RUN" --pin "$PLAN_PIN" --repo "$REPO" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-baseline-bind --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN" --evidence "$LOCAL_RECOVERY" --evidence-pin "$LOCAL_RECOVERY_PIN" --baseline "$BASELINE_PATH" --baseline-pin "$BASELINE_PIN"
cms publish-recovery-check --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN" --evidence "$BOUND_RECOVERY" --evidence-pin "$BOUND_RECOVERY_PIN"
cms publish-cloud-prepare --run "$RUN" --pin "$PLAN_PIN" --retention "$RETENTION" --retention-pin "$RETENTION_PIN"
cms publish-cloud-verify --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN"
cms publish-recovery-prepare-cloud --run "$RUN" --pin "$PLAN_PIN" --bundle "$BUNDLE" --bundle-pin "$BUNDLE_PIN" --evidence "$BOUND_RECOVERY" --evidence-pin "$BOUND_RECOVERY_PIN"
cms publish-recovery-verify-cloud --run "$RUN" --pin "$PLAN_PIN" --recovery "$RECOVERY" --recovery-pin "$RECOVERY_PIN"
```

输出映射：retain 的 id/retentionPin；baseline-capture 的 baselinePath/baselinePin；baseline-bind 的新 evidencePath/evidencePin；cloud-prepare 的 id/bundlePin；recovery-prepare-cloud 的 id/recoveryBundlePin。逐项保存为相应变量，不混用候选 bundle、恢复 bundle 和 receipt pin。

上一公开内容 A 与最初 Git 导入 O 必须分开。第二轮 B 的恢复必须恢复 A，不能默认为 O；baseline-capture 使用当前精确 Main UUID 内容并核查前后七服务拓扑。基线变化或静态路径同名异字节时停止并重新取证。

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
- 资源/兼容恢复证据命令化、独立密钥托管及跨机应用启动仍单列；私有R2密文往返通过不等于完整灾备完成，Git/验证CI完成也不等于真实内容云发布已验收。
