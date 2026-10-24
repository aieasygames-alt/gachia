# S2.17 蓝色星原发布溯源、旧资源保留与隔离验收

日期：2026-10-24，Asia/Shanghai。

范围：独立 owner 蓝色星原；不合并 Worker、不改路由/切流开关、不恢复登录、不修改数据库或游戏事实、不删除历史证据。本阶段已完成发布前安全工具、真实双模式本地验收及一次隔离 staging；生产单独放行。源码封存提交为 `56fbafc1d71df3a4082ac6c002652c2df14f96d2`；随后仅追加现场对账与文档，不把 staging 通过视为生产发布。

## 1. 生产来源调查

只读 API 确认蓝色星原生产仍为唯一 100% 版本：

- Worker：`gachia-game-azur-promilia`。
- 部署：`06712d57-5067-4ceb-b039-bfe710b66126`。
- 版本：`472903c2-3fca-43c0-a613-8c54f108bf73`，number 79。
- 创建：`2026-10-15T09:52:48.720592Z`。
- 脚本 ETag：`899d776c53b6a0a932201ca7ab8caf3b0312ddeab547fd825ecee059900ef8d2`。
- 实际绑定只有 ASSETS 和两个公开环境变量，无数据库、R2 或服务绑定。没有状态迁移不代表无需回滚验收。

通过官方 `content/v2` 只读接口保存当前权威脚本；前后部署读取相同，返回 ETag 与版本元数据一致。multipart 共 5,283,903 字节，SHA-256：
`86788832e7ee41a817e3a21a12a28451ebb66ab7160095deae8e9aab38326191`。
唯一 `worker.js` 模块为 5,283,652 字节，SHA-256：
`cff8e093a8f4ceb39a26c9330e3ed47c8db9bb9a159992d7b723864d0beba1a3`。
云端 ETag、multipart 摘要和模块摘要是三种不同标识，不能互换。

历史 Wrangler 日志包含相同 Worker、部署版本 UUID 和实际上传资源列表。其隔离临时工作区已不存在；实际 BUILD_ID 为 `lrBjX3R43Sm4lpAmnGfM9`。日志中的 19 个新文件加 18 个既有文件共 37 个，其中 35 个 `_next/static`、一个 BUILD_ID 和一个 logo。基于实际日志清单，通过公网 Router GET 35 个静态文件，全部要求 200 且 debug owner 为蓝色星原，保存原始字节与摘要；共 863,724 字节，采集结束后再次 API 对账，生产版本/脚本未变。

### 证据限制

- `sourceCommit = not_attested`：版本注释没有 Git commit，历史上传请求也没有保留完整来源。
- GitHub 同时间的 `ca23910`、`4589a9b` 工作流部署的是 Main，不能据此绑定该游戏。这里只把 `ca23910` 当候选源码比较基线，不称为旧生产来源。
- 原主工作区的历史 `.open-next` BUILD_ID 与真实生产日志不同，未使用它补齐来源，也没有改动原主工作区。
- multipart 仅是脚本备份；路径日志加公网字节不是 Cloudflare 的完整 asset manifest，`cloudAssetManifestCompleteness = not_asserted`。
- 历史版本和证据目前存在，不代表已经执行过回滚，也不能保证平台无限期保留旧资源。

## 2. 累计待发范围与回滚风险

相对上述比较基线，蓝色星原页面、组件、planner 与本游戏数据源码没有改动；应用自身变更集中在 preview-safe 默认索引保护、preview 全局响应头、sitemap 去重、隔离 staging、受控发布脚本和运行时依赖升级。共享 core/UI/data 的累计变更也纳入检查，但不能把其他游戏事实更新解释为本游戏数据更新。

新构建实际使用 Next 15.5.28、OpenNext 1.20.13、Wrangler 4.148.0；旧 package 的范围声明不能证明旧生产实际安装版本。不能把本次累计发布描述成“只删六条 XML”。

旧 planner 静态 chunk 实际包含 `gachia-azur-planner-v1` 和既有字段名；本地新运行时以相同 shape 的隔离测试数据检查读取、保存、刷新、删除和保留旧记录，不触碰真实用户 localStorage。该测试是兼容证据，不是对旧 Git 来源的证明，也不是未知损坏数据的完整鲁棒性验收。

本阶段发现额外 P1 风险：旧受控入口只保留新构建资源，新部署可能使已经打开的旧页面在延迟加载时遇到 chunk 404。新旧路径不能直接覆盖；因此在任何生产更新前先补资源保留。

## 3. 工程交付

`scripts/retain-game-assets.mjs`：

1. 只允许蓝色星原，校验操作者保存的版本/部署/ETag 前后观察、脚本 archive、历史静态清单和全部字节摘要。
2. 生产 deploy 必须提供与回滚 UUID 一致的 `--previous-assets-receipt`；本地 verify 不依赖线上凭据，staging 可带真实 receipt 做验证。
3. 只保留登记 JS/CSS/字体到原路径和游戏命名空间，不带旧代码、HTML、数据、图片或 BUILD_ID。
4. 拒绝符号链接、路径穿越、重复、非登记资源、尺寸超限、摘要漂移和不同字节碰撞；先全部预检再复制，不覆盖新构建。
5. receipt 摘要进入 release plan，构建前后和部署前重读所有引用，文件被换掉不能沿用旧计划。

本地 Worker 冒烟对两种路径的全部旧文件逐字节 GET。独立 staging 验收增加重复/跨 owner sitemap 拒绝，可用 `--expected-sitemap` 对照本地候选完整 URL 集合，用 `--previous-assets-receipt` 对照全部旧资源；仍固定隔离 workers.dev origin、GET、无凭据、不跟随重定向。完整 XML 图的严格门禁未删除或放宽。

操作、receipt 字段及信任边界见[独立发布规范](../docs/game-release-safety.md)。本机 receipt 证明内部完整性，不自动证明实时云状态或旧 Git 来源。

## 4. 本地验证

- 发布回归：Node 165 项，Python 旧资源 9 / XML 合同 11 / 发布 XML 7，全通过。
- 全仓类型检查强制重跑：9 个任务；全仓测试强制重跑：Web 354、Router 35、Data 162、Admin 265 通过和 17 个既有显式跳过。
- lint 强制重跑：0 错误、1 个既有停用 auth-dialog hooks 警告；部署配置 4 个游戏、内容 release gate 通过。
- preview 真实 OpenNext 构建和 dry-run：5,273.62 KiB，gzip 1,046.06 KiB，无上传；35 个旧文件，复制 66 条新路径，另 4 条已存在且字节相同。
- preview 本地：既有 HTTP 11 + 全量旧资源 HTTP 70、浏览器 14、planner 兼容场景 6，全通过；sitemap 为 150 条且唯一集合与公网旧版的 150 条完全一致。
- production-mode 实际构建和 dry-run：5,273.26 KiB，gzip 1,039.77 KiB，无上传；同组 HTTP 11 + 旧资源 70、浏览器 14、planner 6 通过，150 个唯一 URL 与公开旧版唯一集合相同。两种模式分开构建验收，不把 preview 通过代替生产模式检查。

本地构建期间源码尚未封存，记录诚实标记 `dirty: true`，仅作为开发验证，不作为云端源码版本。云端 staging 必须在提交后从干净源码执行受控入口，重新构建并保留独立发布记录。

## 5. 实际云端 staging 与退出结果

实际执行一次蓝色星原隔离 staging，0 次生产部署、0 次 push / Actions；本地 deploy 不耗 GitHub Actions 分钟，但有 Cloudflare 请求/存储/构建配额风险。未重新核实 Actions 剩余额度，不据此判断 Main 发布预算充足。

部署前再次读取全部服务，确认没有外部变更；先探测远端可达性。直接 Node 请求 workers.dev 失败，采用本机已有系统代理 `127.0.0.1:7890` 后 robots 读取成功；没有改系统网络、禁用 TLS 校验或修改认证权限。

通过既有 `release:game deploy --environment staging` 从上述干净 HEAD 重新构建，receipt 同步重验，部署记录 `dirty: false`。实际新版本为 `c6b46257-2441-4cc2-b9c6-c31d4d4d1cca`，部署 `95c17034-e3af-4b21-ae7b-f504e59e0fd4`，2026-10-24 10:49:52 UTC 创建。API 确认唯一 100% 承载、模式 preview、仅原 ASSETS 和公开变量。上传包体 5,273.62 KiB / gzip 1,050.80 KiB，与本地 preview dry-run 的压缩结果分开记录。

远端验收在 10:50:25–10:51:12 UTC 完成：

| 检查 | 实际结果 |
|---|---|
| 正文/索引/canonical/robots/当前 JS-CSS/404 | 16 个 HTTP 检查通过 |
| 候选 sitemap | 150 条且唯一，与实际本地 staging 构建 URL 集合完全相同 |
| 旧静态资源 | 两种命名空间共 70 次 GET，全部 200 且字节摘要一致 |
| 浏览器 | 三语 × 桌面/手机 × 有/无 JS，共 12 例通过；含筛选、客户端详情导航和返回 |
| 浏览器资源/水合 | 147 次同源 GET/HEAD 请求，0 水合错误、0 JS/CSS 失败 |
| 生产隔离 | Main、Router 和四个独立游戏生产版本/部署均未变；路由、域名未变 |
| 收尾版本 | 10:52:15 UTC 再读 API，staging 仍为该候选，六个生产服务仍未变 |

本地 staging 完整构建树另存清单：1,531 个普通文件、31,998,254 字节、19 个可移植链接；清单 SHA-256 为 `e8b66d6e89dc032dcfca0f17873a52efadbf0af1951fee0d1289372eeefa9a88`。该值是部署后本地构建树摘要，不是云端上传 bundle 的 ETag，也不是之后生产模式产物的摘要。

原始发布记录仍为 `deployment_command_succeeded_verification_pending`、`cloudVerification: not_performed`，未篡改入口记账。独立 API/远端验收报告补充实测结果，明确 `productionAccepted: false`；不能把两类记录混写成入口自动完成了云端放行。

当前公网仍为 156 条 / 150 唯一 URL，重复项是三语言 kibo/world 共六条。新候选集合相同，不能因本地去重就宣称线上已修复。

## 6. 后续运营与生产放行

1. 对旧 Git 来源缺口作明确处置：找回版本绑定源码/制品，或者形成接受“权威脚本 + 已知静态集合”有限证据的正式风险决策；不能默认为已证明。
2. 确认旧版本真实可用、平台回滚/asset 保留能力和 planner 兼容边界。旧代码不能当作已纠错内容的自动恢复方案。
3. staging 实测完成后，独立核对生产模式候选、源码/制品关联、当前版本、预算和 rollback，再执行受控生产步骤并通过统一域名重验 150 唯一 URL、资源、页面及其他 owner 不变。
4. 生产观察关闭后，再解除 Main 的蓝色星原重复依赖；Main 继续走自己的迁移差分、内容门禁和同封存 artifact 的 staging→production，不借独立游戏验证绕过。
5. 后续游戏独立发布都需登记源码、完整制品摘要、版本关联、旧静态保留和保留期，减少再次从历史日志反推的维护成本。资源保留设容量预算和观察窗口，先完成可恢复证明再清理，不删除唯一证据以节省磁盘。

本阶段已达到“独立游戏发布安全补齐 + 隔离 staging 验收”的退出标准，不是全站上线验收或 S2 整体完成。

机器摘要：`reports/release-integrity/s2-17-game-release-provenance-2026-10-24.json`。
原始来源、捕获字节、构建、清单和云 API 记录：`.release-records/s2-17/`。
远端验收：`.release-records/staging-azur-promilia-24fbf92a-db26-4bca-a188-f22e2fa27bef/result.json`。
不提交 OAuth、账户元数据、脚本正文、旧静态二进制或历史原日志。未清理构建或证据，后续需按保留期和可恢复性单独处理。
