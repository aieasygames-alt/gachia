# 移动端导航修复发布门禁（2026-10-26）

## 当前结论（北京时间 2026-10-27）

**修复已上线，独立视觉复验通过，但正式发布运行仍为 failure，不能标为全面通过。** 只触发一次 [40348527117](https://github.com/aieasygames-alt/gachia/actions/runs/40348527117)，build 与 staging 成功，production 在部署完成后的新增绘制测试失败。没有重跑 job、再次部署或自动回滚。Main 当前 100% 为 `3efd4103-7156-484b-86d8-a28853a668c8`。

失败根因是测试主动拦截的第三方 Cloudflare beacon 被计为 JS 加载故障，不是导航透底。测试修正 `12218b76ec8d4cabad908a0fe32a5629c2abb363` 只保存在 `codex/mobile-header-fix` 分支，尚未合入 main、未跑新 Linux CI。修正后的独立公网 42 场景、补充 6 场景通过，截图已复核；这些结果不改写原 Actions 失败，也不是正式恢复回执。下一步是测试修正的合入/验证，以及包含新绘制门禁的受控只读恢复验收，不是重发生产。

机器摘要见 `release-result.json`。下方发布前和本地阶段记录按时间保留，其中“尚未发布”只描述当时状态。

本轮只推进 Main 移动端 sticky header 修复，不发布四游戏或 Router。初始基线为 `71d7851`，与本轮开始时重新 fetch 的 `origin/main` 一致。前一轮本地修复证据见 `reports/mobile-header-fix-2026-10-26/README.md`；原始线上发现保留在 `reports/online-verification-2026-10-26/README.md`。

## 验收门禁补齐

- `.github/workflows/deploy.yml` 增加 staging/production 的实际已发布 header 绘制测试，每侧 42 场景、明确零重试。staging 作业失败阻断 production，不设置 continue-on-error，不自动重试、回滚或重发。
- 两侧既有验收 artifact 追加 JUnit 结果与失败截图目录；不额外上传所有成功场景的大体积截图。原来同一 artifact/内层摘要、旧静态资源保留、内容/XML、版本重读和账号停用门禁不变。
- 新增发布契约测试检查固定 origin、阶段依赖、零重试及 always 保存结果；本地发布测试为 Node 301 + Python 31 通过。

## 当前执行边界

本节为初始发布前记录，后续按实际结果追加，不以本地通过代替云端验收。账号删除保持取消；没有真实账号/分享/R2 业务数据操作、数据库迁移或缓存清除。公网 NUL/点段契约差异不属于本次修复，继续保留。

## 干净提交与本地 Worker 门禁

- 功能提交 `146a8425bddaa6471c981a47f8c8f605c12b1f0b`，分支 `codex/mobile-header-fix`；已推送该分支并快进远端 main，没有重置或覆盖原目录的未提交修改。
- 构建前后 Git 均干净，Node 22.22.2 下重新执行 Main OpenNext build 与 dry-run，gzip 2880.50 KiB；初始可移植性 3146 文件/19 链接通过。
- 新 Worker 的隔离无凭据验收：32 HTTP、18 既有运行时浏览器、42 新增绘制浏览器场景通过；另以独立合成 D1/R2 完成 22 条边界检查。Main fallback sitemap 171/171，内容门禁 90/90 镜像一致、无 pending/hold。
- 当前生产对应旧 artifact `12645502112` 的来源/成功 deploy 日志/活跃 UUID/ZIP 实际摘要均已复核。保留 437 文件、11,129,450 bytes，其中 350 个补入新候选；全部 437 个资源通过本地 Worker HTTP 字节校验。保留后可移植性为 3497 文件/19 链接。
- 初次直连下载旧 ZIP 在 300 秒超时，失败日志保留；随后仅改用已配置的本地代理 `127.0.0.1:7890` 完成下载，未关闭 TLS 校验、未扩展权限或放宽摘要/来源门禁。这不是部署失败或生产重试。
- 新鲜公网只读预检 15 基础 GET、19 owner/静态资源检查通过。控制面确认 Main 仍为 `9addf3a5-ff70-4ad5-9419-eb82b115ec92` 单版本 100%，四游戏及 Router deployment 与上次发布一致。
- production environment 保护规则为空；两个部署开关开启。Actions 剩余额度因当前凭据无 billing user scope 无法观测，已披露，未刷新权限。生产请求会在 staging 完整通过后自动进入 production，不把环境名称当作人工审批证明。

机器摘要见 `local-gates.json`；原始构建、测试、控制面、下载和本地 HTTP 记录在 `.release-records/mobile-header-release-2026-10-26/`。

## 首次 CI 阻断与真实溢出补修

- main push 验证 `40338798567` 在浏览器门禁失败，未进入部署：50 通过、8 失败、8 跳过。失败为英文 390px 的正常/延迟脚本/无 JS，以及 768px 正常脚本，分别在两种 Chromium 模拟配置复现；宽度分别为 410px/769px。原始失败记录保留，不重跑旧 job 或改写为通过。
- 根因不是透明 header：武器卡片头部将较长的资料标签、名称和类型放在不可换行的 flex 行中，grid item 的自动最小宽度随 Linux 字体指标变宽，撑出视口。本地 macOS 默认字体没有触发，但使用 Verdana 后稳定复现 411px；新增宽字体断言先失败，证明不是 CI 开发工具误报。
- `WeaponCard` 增加 `min-w-0`，头部允许 flex-wrap，标题允许收缩与 break-words；没有使用 overflow hidden 掩盖内容、删减提示文字或放宽原来的视口宽度断言。该组件仍仅属于 Main，不改变独立 Worker。
- 在原 42 场景内，英文 390/768px 正常模式追加宽字体滚动/返回检查；本地开发模式最终 42/42，零重试通过。新增 build 浏览器失败归档保留截图/trace 7 天；发布测试新增契约后为 Node 302 + Python 31 通过。
- 首次干净提交/Worker 记录仅证明对应源码在当时本地环境通过，不能代表 Linux 已通过或为补修后的新代码背书。补修须重新干净构建、Worker 验收和新 CI，仍未发起 production workflow。

## 补修后的独立重验

- 补修提交 `a7d52c6b1d1f0475c3bdeecbe05b8b15127993cb` 已推送分支与 main；新 push CI 为 `40343990122`，没有重跑或覆盖失败的第一次 CI。
- 从该干净提交重新构建 Main OpenNext，dry-run gzip 2891.34 KiB；32 HTTP、18 既有运行时浏览器、42 新绘制/宽字体浏览器、22 合成 D1/R2 边界检查全部通过。
- 再次执行旧 artifact 来源/下载摘要验证，437 个保留资源全部通过新 Worker HTTP 字节校验；可移植性、内容与 171/171 fallback sitemap 门禁通过。
- Web 438 测试、Web/新浏览器测试类型、两个修改组件 ESLint、Node 302 + Python 31 发布合约通过。机器摘要见 `font-fix-gates.json`，该记录与首个候选分别保存。
- 复核 `mobile-zh-scrolled.png`、`mobile-zh-returned-list.png`、`mobile-en-wide-font-returned-list.png`、`tablet-en-wide-font-returned-list.png`：导航不透底，卡片完整换行，没有通过裁切隐藏提示内容。这里仍是本地 Worker 截图，不是新版本线上截图。

## 新 CI 通过

main push 验证 [40343990122](https://github.com/aieasygames-alt/gachia/actions/runs/40343990122) 成功，源提交 `a7d52c6`。Linux 浏览器 58 通过、8 跳过、0 失败；build 成功，deploy-staging/deploy 均因 push 事件跳过，没有产生部署。元数据见 `ci-success.json`。

该验证 artifact 不含正式 production 请求的旧资源保留步骤，不能直接推广，也不是当前生产旧资源的来源。正式发布仍必须由新的 production workflow 按当前 UUID 与 artifact `12645502112`/精确 ZIP 摘要重新构建和封存，经 staging 验收同一制品后再发布；不复用本地目录或把跳过的部署算作完成。

后续本段证据与任务表采用文档提交 `[skip ci]`，不改动已验收功能源码、workflow 或测试。Actions 剩余额度仍不可观测，未额外授权凭据或配置环境保护规则。

## 正式发布与生产失败对账

- 发布源码 `12c1c6b843f4972fcd46132bdd7363f76dcbe0b3` 与成功 CI 的运行时代码相同；发布前重新核验干净 main、无并发发布、七个 deployment、旧 artifact 来源及实际 ZIP 摘要、两个部署开关。使用显式 `RELEASE_MAIN_ONLY`、旧 Main UUID `9addf3a5-ff70-4ad5-9419-eb82b115ec92` 与旧 artifact `12645502112` 发起一次 production 请求。
- 新 Worker artifact `12662818947`，ZIP SHA-256 `cb1192aeda6b45f49a9af4fdcd8f931e93a4113e6098d5874b4cd79c1ec5a00b`；内层 tar SHA-256 `abbebb44a39dd7bf3f438f9b7ba4555e233eba365a017bf8e3c97ad5b5715b2c`。两侧实际下载/恢复日志使用同一 ID、ZIP 摘要与内层摘要；没有在 production 重建。
- 保留 437 个旧静态文件、11,129,450 bytes。来源和封存前完整验证通过；云端仅有界字节抽样，不宣称所有静态文件已线上逐字节验证。
- staging 当前 100% 为 `f142070d-ffb0-4b99-a204-49af0c265baa`，deployment `77b45460-05a3-4435-95cd-89077c6750e1`。生产 Main deployment 为 `6300eb50-e8ed-491b-b9cd-26a59ad11d36`，北京时间 10-27 00:07 部署。
- 发布后和独立复验后均重读七个 deployment：Main/staging 为本轮新版本；四游戏及 Router 的 deployment ID、版本和 100% 比例不变。Main 新旧版本 bindings 深比较一致，只读取 secret 名称，不读取值。此结论不扩展到未查询的 zone routes/domains、可变 settings 或其他 staging。

| 实际门禁 | 结果 |
|---|---|
| build 浏览器 | 58 通过、8 跳过；其余构建/封存门禁通过 |
| staging 基础/运行时 | 32 HTTP、18 browser 通过 |
| staging 新绘制门禁 | 42 通过、0 失败/跳过，零重试 |
| production 基础/运行时 | 32 HTTP、18 browser 通过 |
| 每侧受管内容 | 23 HTTP、171 fallback HTTP、7 JSON、3 search、520 browser、1 未认证 IndexNow 拒绝、12 旧资源抽样通过 |
| production 新绘制门禁 | **36 失败、6 通过**；36 个失败均为主动拦截的第三方 beacon |
| staging XML / 跨 owner 导航 | 6 文档、6653 URL、171 fallback 无遗漏；8 导航场景通过 |
| production 后续 XML / HI3 smoke workflow 步骤 | 因前一步失败而跳过，不计为通过 |

已下载并校验 staging 验收 ZIP `12664699549`，SHA-256 `62d5710d641c66736a917c2d5d8a27e01b70345058cfeafc219b769eafbefe7c`；production 验收 ZIP `12666446764`，SHA-256 `0720479cdaf4ecdfcefb6415b72d3cb744d809b53a9a5817a0b6f1bd1b76e9dd`。读取有界 JSON/JUnit，确认 production 常规验收成功先于绘制门禁失败；不执行归档代码。production JUnit 的 42 条中，36 条失败文本均包含 `static.cloudflareinsights.com/beacon.min.js`。

## 测试误报修正与独立公网复验

初次全新公网浏览器执行原测试同样失败：6 通过、36 失败。其中 35 条仅因主动拦截 beacon；另 1 条英文延迟脚本场景在两次绘制采样间加载完 Logo。两张探针 PNG 的差异框仅为物理像素 `(48, 52, 132, 134)`，对应 Logo，游戏导航行没有变化。原始 JSON、失败截图及两张探针保留，不覆盖为绿。

`12218b7` 仅修正测试：记录实际被测试主动拦截的 Request 对象，排除这些主动拒绝的第三方请求，仍单独保存 URL 证据；采样前等待 Header 图片 decode 和字体就绪。没有放宽 PNG 完全相等、视口宽度、运行时错误、同源 JS/CSS 或账号请求断言，也没有改动应用或 workflow。

| 独立只读验证 | 结果 |
|---|---|
| 公网基础 GET / owner、JS/CSS、sitemap 抽查 | 15/15、19/19 |
| 修正后公网绘制/返回/宽字体矩阵 | 42/42，0 跳过/失败/重试；仍为 Chromium 两种模拟配置、五宽度、三语言与指定脚本模式 |
| 第三方隔离证据 | 36 个有脚本场景记录主动拦截 beacon；第三方分析服务不属于本次验收 |
| 补充卡片视觉 | 390/768px、三语言正常脚本共 6/6；英文两场景收起隐私面板后以 Verdana、scroll 600px 截图，未允许分析服务 |
| 负向验证 | 透明背景变体触发绘制失败；注入同源不存在 JS 的变体触发资源失败；2 项预期失败证明断言仍有效 |
| 公网 XML 补验 | 6 文档、6653 唯一 URL，owner 集合与已校验的 staging 验收制品完全一致；171 fallback 缺漏为 0 |
| 修正测试的类型 / 相关合约 | 浏览器 TypeScript 通过；相关 Node 12 测试通过，未冒称重新跑完整发布/应用测试或 Linux CI |

截图为本轮实际生产结果：`online-mobile-zh-top.png`、`online-mobile-zh-scrolled.png`、`online-mobile-zh-returned-list.png`、`online-mobile-en-wide-font-returned-list.png`、`online-tablet-en-wide-font-returned-list.png`；补充卡片截图为 `online-mobile-en-wide-font-card.png`、`online-tablet-en-wide-font-card.png`。逐张复核导航不透底，卡片内容换行而非裁切。隐私面板未收起的原截图也保留，不将被遮挡区域当作已完整可视检查。

公网 XML 补验将当前 graph 与已校验摘要的 staging 验收 ZIP 比较，后者已证明 Main 与封存制品一致；不是将本地其他构建冒充正式 sealed artifact。Python urllib 首次请求被边缘返回 403，失败日志保留；改用本轮基础 GET 已使用的 curl/显式本地代理完成相同只读请求，未关闭 TLS。一次控制面直连超时及首次类型检查缺少 typeRoots 的调用错误同样单列保留，后续正确命令通过。

## 尚未收口与边界

产品侧原导航透底与英文卡片溢出在当前生产的定向独立复验中未复现，但**正式发布流程未全面通过，未签发只读恢复回执**。测试修正未合入 main；后续应先验证/合入测试修正，再审查包含这 42 项新门禁的只读恢复路径并绑定当前 UUID、原失败运行及封存制品。不把既有不含新绘制门禁的恢复绿灯当作本次证明，也不重新触发 deployment 来“洗绿”。

账号删除保持取消，登录仍关闭；未读取真实用户分享、未执行账号业务操作、真实地图 R2 命中/写入验证、迁移或清缓存。workflow 的账号探针仅为匿名停用拒绝校验，不是实际用户操作。NUL/点段公网契约仍未解决，未在本轮修正中重新验明；此前隔离 D1/R2 也不算本轮线上数据端到端覆盖。没有验证全站穷举、所有真实设备/浏览器或全球节点长期稳定性。Actions 剩余额度依旧不可观测，未扩大凭据权限。
