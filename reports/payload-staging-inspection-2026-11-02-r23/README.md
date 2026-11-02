# R23：staging 实际 HTTP 与外部发布入口核验

日期：2026-11-02。承接[R22](../payload-nte-source-handoff-2026-11-02-r22/README.md)的下一可执行工程项，以尽快交付本机 Payload 发布为目标。本轮只读取现有云服务、GitHub 和本机状态，不编辑内容、不重启/覆盖 CMS、不安装工具、不上传或切换 Worker。

**完成四个历史 staging 的限定 HTTP/索引/cache 检查与已知自动发布入口调查；不等于真实候选发布验收，也不等于账户级“只有这台 Mac 可以发布”。** 本机仍84条 draft/hold、0 eligible；真实编辑的首次/第二次云发布、partial failure 和兼容恢复未完成。P/T总体等级不因此提升。

## 1. 四服务实际网络证据

对每个服务同时访问 workers.dev 别名和控制面当前 UUID 的精确版本地址，共8个 origin、**78份完整 GET 响应**；逐份保存正文、状态、headers、长度和 SHA，汇总前再次校验实际字节。不是只有 HEAD/状态码，也不是 fixture。

| 服务 | 当前版本 UUID | 响应数 |
| --- | --- | --- |
| `gachia-staging` | `f142070d-ffb0-4b99-a204-49af0c265baa` | 22 |
| `gachia-router-staging` | `1a3947c6-c70f-4dde-a0ca-51303fd34922` | 22 |
| `gachia-game-genshin-staging` | `303724eb-5b16-4fd4-a2ff-01765a2d81d9` | 18 |
| `gachia-game-azur-promilia-staging` | `440ed712-bdbf-47eb-9f6c-17cca4416a41` | 16 |

- 66个200、12个预期404；无网络/解析错误。404包含4份停用账号接口与8份缺失页面。
- **62/62动态响应带 noindex**，**8/8 robots 阻止通配爬虫**；16份JS/CSS实际返回200。不把静态资源计入动态 noindex 分母。
- **30份HTML**核对生产 canonical、正文/metadata/JSON-LD/media引用指纹；**12份XML sitemap**为不重复的生产域名URL。media引用检查不是重新下载所有图片或媒体权利批准。
- Main/Router的4份账号 GET 均为404、`ACCOUNT_FEATURES_DISABLED`、no-store、无cookie；不是完整账号方法/浏览器矩阵验收。

### 必须保留的 cookie 与缓存差异

原始严格无cookie检查产生**20项发现**，均来自Main/Router的HTML或缺失页面，完整值严格为与路径语言一致的`NEXT_LOCALE=<zh|en|ja>; Path=/; SameSite=lax`。未观察到账号cookie；但不能将20项原始失败改写为“严格无cookie全部通过”。动态响应严格无cookie仅42/62，全部响应58/78。本轮只分类解释，**没有放宽候选/公网正式验收的无cookie门禁**。

Main/Router HTML实际缓存为`public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400`；Genshin首页为private/no-store，指南为`s-maxage=31536000`；Azur采样HTML为private/no-store。JS/CSS沿用各自公开缓存。因此不能声称staging全部private/no-store；noindex/robots也不是身份认证或隐私隔离。Genshin staging的`mode=production`不单独构成索引漏洞，实际响应仍有上述禁爬策略。

范围是当前历史部署的限定路径采样，不是全站爬取、浏览器交互或新候选E2E。Payload流程使用game/Main的**精确候选版本预览**，不经这四个历史staging别名部署；不为首条文字发布新增“全部staging重建/统一缓存”的前置任务。

## 2. 外部发布入口：实际可证与不可证

### GitHub

只读查询10个workflow；Genshin preview仍`disabled_manually`。两个Cloudflare部署变量均为`false`，staging/production环境各0变量、无同名覆盖。实际读取默认main的9份workflow源文件，与维护分支逐字节相同：生产/staging部署受false开关限制，退休入口在部署前拒绝，Azur preview仅验证/构建，Payload专用分支CI只验证不部署。workflow为active本身不代表能部署。

默认main仍`71a52728be2c9612d0b39be47092b7d85a320ac3`。本轮仅向专用维护分支同步报告/现行文档；精确交付commit及实际验证CI身份留于本地`delivery.json`，不将R22的成功run套给本轮。

### Cloudflare Builds / hooks

按Cloudflare公开API schema，实际GET账户Builds triggers及10个Worker的deploy hooks：**11次均403/code10000**。这不是“空列表”，没有申请新token/grants或读取hook秘密。

随后使用现有已登录Chrome Dashboard，仅读取10个Worker的构建配置：

- 仅`gachia`连接Git，生产分支为main；**Disable builds开关aria-checked=true**，预览分支构建开关`aria-checked=false`。
- Main明确显示`No deploy hooks defined`。其余9个Worker均显示Git仓库“连接”，未连接Git；这些页面没有独立列出hook，不宣称全账户所有hook均为0。
- 仅读DOM/可访问性状态，不提取会话或重放后台私有API，不点击部署、创建token或改设置。两页静态资源加载失败经普通重载恢复。

**已知Git自动构建入口当前不活跃；全账户hook/token/人工部署能力未完整枚举，也未技术强制“仅本机发布”。** 持Cloudflare凭据或Dashboard权限的人仍可能手动部署。403边界保留，不为补齐这项证明而扩大权限。

## 3. 本机、云拓扑与验证

| 项目 | 本轮结果与边界 |
| --- | --- |
| 项目清单 | 实际安装版manager读取10Worker；采样前/后/最终及R22一致。推广保护仍7服务，发布写入仍game/Main，不扩大为十服务 |
| 本机CMS/PG | healthy/loaded，安全HTTP **9/9**；只读DB摘要不变，84draft/hold、0 eligible |
| 已安装工具 | **21/21文件**与本轮开始、R22安装和已测源码一致；没有安装、CMS应用覆盖或重启 |
| 定向本地回归 | staging/runtime/web策略/production gate/手册 **91/91** |
| 全集基线 | R22的CMS163/typegen/typecheck、桌面458、既有Node304、Python49、Router35/typecheck沿用；本机本轮不冒称重跑 |
| Git交付 | 仅报告、脱敏摘要和现行文档；精确提交的实际只验证CI另存回执，不合并main、不部署 |

DB逻辑摘要：`c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`。没有新的正式导出，R20的无合格记录拒绝沿用。未重跑全站build/parity/应用浏览器或依赖audit；deepmerge 1low沿用既有风险决定。旧脏checkout不改动。

首次控制面GET在采样前401，保留失败日志；执行现有`wrangler whoami`刷新当前OAuth后，新建独立取证目录完成78份采样，没有新授权。精确workers.dev沿用本机既有SOCKS的单进程环境，不修改系统网络/TLS/timeout。

## 4. 状态更新与下一优先级

1. **关闭L06的限定staging HTTP/已知自动构建入口调查子任务**。R19“四个robots fetch failed”的未验状态由本轮实际证据替代；全账户入口封锁不在本轮关闭范围。
2. **有真实Genshin编辑立即执行L04首次/第二次云发布及兼容恢复，再L05 NTE**。无需内容准确度审查或再次逐项授权；但不能制造演练文字、批量清hold或发布无变化候选。
3. **无真实编辑时，下一可执行工程项转为首次/新UUID来源交接与发布后来源接续**。复用已验目录/命令，减少首发和第二次发布的手工衔接；不重复历史staging、全站重建或既有本地A/B。新UUID仍须重新验明当前公开A及完整来源，不能仅改UUID或自动回退O。
4. L03独立密钥介质/第二Mac仍缺，具备时完成跨机恢复；不重复同机/R2往返代替。普通请求全程releaseKey、真实云partial failure及全scope权威接管仍待验。

P0–P5/P7部分完成，P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。整体CMS迁移/上线未因这轮审计标记完成。

## 5. 证据索引

入Git仅本报告、`verification-summary.json`及现行文档。以下原始证据留本机，不提交正文、账号信息、部署原始配置、日志、数据库、私有媒体或密钥：

- `http-result.json`、`work-uaA0nt.json`、私有work中78份正文/观察及前后项目快照；`evidence-summary.json`保留cookie/cache分类与覆盖分母。
- `github-workflows.json`、部署/环境变量观察、9份远端workflow源对比、`cloudflare-builds.json`及其403原始响应、`dashboard-builds-observations.json`。
- `project-inventory-final.json`、`cloud-final-check.json`、`installed-before.json`、`installed-integrity.json`、`local-final.json`、`local-http.json`、`staging-policy-tests.log`。
- 后续`documentation-links.json`、实际CI回执、`delivery.json`与排除自身的非循环`evidence-index.json`。

执行入口：[现行手册](../../docs/payload-operator-runbook.md)；状态：[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)、[多Worker地图](../../docs/payload-project-worker-map.md)。
