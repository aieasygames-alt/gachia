# Gachia / Payload 全面再审计

日期：2026-11-05，Asia/Shanghai。接续未完成对话，先核对实际工作树、源码、既有交付证据，再执行新鲜回归和只读 HTTP 检查。下一阶段执行见[开发计划](../../plans/project-next-development-2026-11-05.md)。本报告不修改业务代码，不批准新的内容或生产发布。

## 1. 已确认发现

### F01 / P1：既有攻略的 JSON-LD 存在 HTML 注入边界缺口

- 位置：[Genshin 指南详情](../../apps/game-genshin/app/[lang]/genshin/guides/[slug]/page.tsx#L15)、[NTE 指南详情](../../apps/game-nte/app/[lang]/nte/guides/[slug]/page.tsx#L10)。两者直接把 `JSON.stringify(...)` 放进 `dangerouslySetInnerHTML` 的 JSON-LD script。
- 既有记录的 [editedGuide](../../services/content-cms/src/desktop-guides.ts#L24) 和 [validateGuideOverlay](../../scripts/desktop-publish.mjs#L31) 接受任意字符串标题。JSON 转义不会转义 `<`，HTML 对 script 闭合标签大小写不敏感，因此标题中的 `</SCRIPT>` 可以逃出 script 数据上下文。正文作为 React 文本输出与此问题不同，不应误改为 HTML 渲染。
- 新增记录的 `validateNewGuide` 已禁止 `<`，但该限制没有覆盖既有指南；单用户、可信编辑降低输入风险，不构成 HTML 输出编码。
- 本轮[离线探针](security-probe.mts)调用真实 export/overlay/fingerprint 函数，并用与两页相同的 React 输出方式和 Chromium 解析**无事件处理器、无外部 URL 的惰性 span**。三道函数接受；浏览器在 JSON-LD 外识别到 1 个注入节点。把 `<` 编为 `\u003c` 后节点为 0，JSON 语义不变，见 [结果](security-probe.json)。这不是完整页面组件、真实 CMS 写入或生产主动脚本利用测试，没有发现线上已遭利用的证据。
- `pageFingerprint` 使用大小写敏感的正则读取 script，HTML 解析器却大小写不敏感；因此指纹一致性不能作为内容安全证明。当前镜像/预览与公网比较即使全部一致，也可能一致地包含不安全输出。
- 建议：优先给两个已接入 CMS 的指南消费者使用安全 JSON-LD 序列化，复用主站 [serializeJsonLd](../../apps/web/lib/jsonld-script.ts) 的策略；补真实消费者和浏览器 DOM 回归、混合大小写闭合标签及指纹拒绝测试，再审查其余游戏相同输出模式。不要仅靠 CMS 禁字或降低发布门禁修补。
- 探针首次使用带引号的 data 属性，JSON 转义使精确 CSS 值选择器不匹配；修正为无引号惰性标记后通过。该失败不记作已修复安全漏洞，业务代码仍未改。

### F02 / P2：依赖安全基线已变化，不能沿用旧“0 命中”结论

- 新鲜 `pnpm audit --prod --json`：公众 workspace **1 critical / 2 high / 3 low**；CMS **1 low**。两次命令都以 1 退出，属于发现公告，不是扫描失败或清零。原始结果随本报告保存。
- 公众命中来自 Better Auth 1.6.22；6 个包级命中对应 4 个不同公告，不能称为 6 个独立线上漏洞。
- `GHSA-965c-763c-88jm` 的 critical 需要 Magic Link 与 OAuth 等组合；`GHSA-r4xp-prcw-77qf` 的 high 需要 OAuth Proxy 等条件；`GHSA-q84f-53jg-9ppm` 的 high 需要 deviceAuthorization；`GHSA-44jh-23m7-hpcf` 的 low 涉及 PostgreSQL 数据库存储限流。
- 当前 [auth.ts](../../apps/web/lib/auth.ts#L12) 只配置 nextCookies 和可能的 Google provider，没有上述三个可选插件；adapter 为 SQLite/D1，不是该公告要求的 PostgreSQL 限流路径。[账号开关](../../apps/web/site-features.json) 为 false，handler 在创建 auth 前返回停用；本轮公网 `/api/auth/get-session` 为 404/no-store。**未证实这些公告在当前部署可达，不能定性为已存在公网账号接管。** 重新启用账号前必须重新审查；账号关闭也不等于依赖已修复。
- CMS deepmerge 的既有限定接受仍未修复，继续保留单用户 loopback 边界，按[风险决定](../../docs/payload-dependency-risk-2026-11-02.md)在 **2026-11-16 前复核**，不因本轮再扫描顺延。
- 建议：建立逐公告适用性/修复可用性记录；补配置回归，出现可用修复后做隔离升级。公告中的计划修复版本不能直接当作已发布可安装版本，也不运行盲目的 `audit fix`。

### F03 / P2：NTE 语言消费者阻断中文-only 新增

- 位置：[语言索引判定](../../apps/game-nte/lib/data.ts#L111)、[metadata alternates](../../apps/game-nte/lib/seo.ts#L25)、[指南详情](../../apps/game-nte/app/[lang]/nte/guides/[slug]/page.tsx#L9)、[sitemap](../../apps/game-nte/app/sitemap.ts#L15)。
- `isNteLocaleIndexable` 对 en 无条件放行；sitemap 把所有指南加入 en，alternates 也无条件给出 en。英文详情直接读取 `titleEn/contentEn`，日文缺失时主要回退英文；`??` 不会把空字符串当作缺译。
- Git 来源的现有 53 篇 NTE 指南均有非空英文/日文字段，本轮没有确认当前 53 篇出现空英文详情。**这是扩范围阻塞，不是宣称当前全站空页。** NTE 新增仍被契约主动拒绝，保护有效。
- 建议：先统一“可阅读回退”和“可索引本地化正文”两个判定，应用于详情、列表、metadata/JSON-LD、hreflang、sitemap 和发布验收，然后单独开放 NTE 中文新增。不要为了上线复制中文到翻译字段或撤掉 noindex。

### F04 / P2：磁盘预算没有落实到构建入口

- 本轮 `df -h` 观察可用约 **11 GiB**，数据卷使用率 **95%**。R37 的约 39.15 GiB 发布目录盘点只是历史观测，本轮没有重新遍历或做全引用 GC 证明。
- [保留策略](../../docs/payload-storage-retention.md)规定 10 GiB 预警、8 GiB 停止新双 owner 构建；[buildUnlocked](../../scripts/desktop-publish.mjs#L220)却先标记 building 并开始离线安装/构建，没有同等自动空间检查。安装器的 5 GiB 检查不能保护日常发布构建。
- 影响：可耗尽磁盘、留下不可重放的失败 run，并影响同卷 CMS/PG 和备份可用性。这是容量与可恢复性风险，不是已发现数据库损坏。
- 建议：准备/构建/恢复前做可测试的空间门禁，先拒绝再变更 run 状态，按任务实际临时占用预留；先交付 pin 感知的只读清理清单，删除仍需单独审阅，不把失败目录或未跟踪证据当垃圾。

### F05 / P2：CMS 分支 CI 没有覆盖实际公众消费者的完整回归

- [payload-verify.yml](../../.github/workflows/payload-verify.yml#L33)目前验证 CMS、inventory、Router 和发布工具，没有执行 Web/Data 单测、公众应用类型检查或两游戏实际编译消费者检查。
- [主站 workflow](../../.github/workflows/deploy.yml)有较广验证，但只在 main/面向 main 的 PR 等场景触发，不能替代当前维护分支 push 的门禁。`pnpm test:release` 有消费者相关工具回归，但不等于运行全部 Web/Data 测试或构建实际页面。
- 本轮手动补跑 Web/Data/Router 和九包类型均通过；这是覆盖缺口，不是已有公众测试失败。F01 在现有全绿结果下仍成立，说明应补风险对应测试，不能只增加测试总数。
- 建议：为维护分支加入受影响公众类型/单测及有界消费者验收，继续无云凭据、无部署；重型生产构建按发布切片触发，不让文档更新重复完整构建。

### F06 / P2：操作入口文档仍有过期“当前状态”及版本身份

- [CMS README](../../services/content-cms/README.md#L3)仍以 R28 为当前状态，称真实首发待验、没有 eligible 记录、下一步需要 C03 和跨机验收。
- [项目地图](../../docs/payload-project-worker-map.md#L3)顶部仍以 R36/R37 为当前公众基线，列旧 Main/Genshin UUID，并声称新增未接通；与 R39 原神新增交付不符。不能把这些旧 UUID 用作下一批恢复/来源身份。
- [任务总表](../../plans/project-task-status-current.md)的最高优先级 R39 节与[工作流](../../docs/payload-agent-publishing-workflow.md)较新，底部已注明历史；本轮不把整个历史区都定性为错误，也不重写封存记录。
- 建议：运行文档只保留简洁当前入口/能力表，历史移至明确历史章节或链接；运行身份仍以新鲜控制面和可信来源为准，不将文档常量作为发布授权。本轮仅给任务表增加本审计入口，不修改旧交付结论。

## 2. 正确基线与项目结构

| 项目 | 本轮核对 |
| --- | --- |
| 原始 checkout | `/Users/robert/Documents/gachia`，HEAD `e6d6bb9`，有大量原有未提交内容；没有覆盖、reset 或清理 |
| 审计工作树 | `/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia` |
| 精确源码 | `816a453b2d2165264d8a4dd6a9c660d2f7f1d90f`，分支 `codex/payload-unified-maintenance`；开始时 tracked clean，已有大量未跟踪私有运行证据 |
| 远端只读核对 | 维护分支同上；main 为 `71a52728be2c9612d0b39be47092b7d85a320ac3`，CMS 尚未合入 main；没有 fetch/切分支/提交/推送 |
| 本机工具链 | Node 25.9.0、pnpm 10.10.0；CI 指定 Node 22.23.4，不声称环境等价 |
| 公众层 | pnpm/Turbo monorepo，Web + 四 game + Router；Next 15.5.28/OpenNext/Cloudflare，三语；共享 core/data/db/ui |
| CMS 层 | 独立 workspace/lock，Payload 3.92.1、Next 16.4.2、React 19.2.6；仅本机 PostgreSQL/私有媒体，不与公众依赖合并 |
| 旧工作台 | `apps/admin` 的 Node/SQLite HI3 intake/review/preview，仍存在，不等于 Payload 或已全部退役 |

公开请求由 Router 按精确路由所有权分给 Main/游戏 Worker。游戏 HTML 与公开 JSON 不属于同一个 owner：例如 Genshin/NTE 指南 HTML 在 game，`/data/<game>/raw-guides.json` 在 Main。一次文字更新仍需双 owner 发布。16 scope 不等于 16 Worker，也不代表全 scope 已迁移。

既定路径仍合理：**代理策划 -> 认证写 CMS 草稿 -> 重读/批准 -> 本机冻结源码/导出 -> game/Main 构建与四版本精确预览 -> 顺序推广 -> 公网/来源交接**。Mac 离线不影响已发布网站；不建议重新选择云 CMS、不加 Tunnel，不为当前文字维护建设通用 Agent 平台。

## 3. 当前进度，避免重复开工

- R36 已完成 Genshin/NTE 既有指南 title/body 的真实 CMS-first 更新、连续发布和双向共享 Main 来源交接，限定 V1 完成。C01/C02/C03/C04/C05a 不重开。
- R39 已完成原神中文新增的常驻安装、首篇真实新增、正常推广/来源交接和新异地包恢复核验。不是只做 fixture，也不是仅后台点过 published。
- 本轮 HTTP 新采样确认原神新增三语言阅读 URL 为 200，NTE 新手指南为 200；线上原神 JSON 为 **32 篇**、NTE 为 **53 篇**，含已发布 CMS 新增 ID。NTE JSON SHA 与 R39 记录一致。
- Git 原始 O 仍为 Genshin31/NTE53；本轮 **90/90** 源文件/公开静态镜像语义相等。Git O 与线上 A 的 CMS 增量不同属于预期，不能用 Git 文件覆盖线上 A 来“同步”。
- R39 记录 CMS85 条、82 draft/hold、原神2及NTE1 published/eligible；本轮未认证枚举数据库，不把该计数冒称新查询。健康接口新鲜 200/ready，匿名内容接口与跨 Origin 请求新鲜 403。
- R39 的私有 R2 新包下载/认证/隔离恢复有历史证据；本轮没有再下载、解密或恢复。独立 key 按用户决定暂缓，单机与 key 同时丢失仍可能不可恢复，不要求第二台 Mac。
- 新增场景真实 partial/实际回滚尚未验；已有两 owner 顺序切流，不是跨 Worker 原子事务。已实现失败停止、journal、兼容恢复和可信来源接续，不需要主动制造生产事故补验收。

## 4. 原始任务状态

沿用 R39 全范围口径，不以本轮测试数提升进度。能力存在、隔离通过、已安装和真实上线分别判定。

| 阶段 | 状态 | 主要剩余 |
| --- | --- | --- |
| P0 迁移基线 | 部分完成 | 全类型语义、责任/权利与内容账本 |
| P1 编辑路径 | 部分完成 | 本轮安全缺口、完整角色/异常/并发矩阵 |
| P2 导入对账 | 部分完成 | 全类型保真、内联事实与关联依赖闭包 |
| P3 批次发布 | 部分完成 | 全关联类型与 owner，非仅 guides |
| P4 读侧接管 | 部分完成 | 普通请求全链版本上下文、通用 Snapshot/ReleaseMap 激活 |
| P5 持续更新 | 部分完成 | 受控批量、调度/重试/死信/告警；当前人工监督单批可用 |
| P6 新游戏扩展 | 未完成 | 配置驱动导航/搜索/SEO/路由与验收 |
| P7 恢复与退役 | 部分完成 | 完整灾备、权威转交、旧入口停写/退役 |

| 任务 | 状态 | 本轮解释 |
| --- | --- | --- |
| T01 | 完成 | 保留状态优先级/决定链回归，不重复开发 |
| T02 | 限定本地完成 | 不泛化为所有生产存储及 reader |
| T03 | 部分完成 | 类型/关联/媒体权利台账不足；新媒体仍需使用前权利依据 |
| T04 | 部分完成 | 双游戏实际发布已通；普通请求全链 releaseKey、全 owner 一致性未交付 |
| T05 | 部分完成 | 本机 PG 架构已定并运行；安全运维仍需收口，不再重选托管 |
| T06 | 部分完成 | 双 owner 实发、恢复/来源链已有；全 owner/全类型执行器未完成 |
| T07 | 部分完成 | 角色/锁/批准有实现与测试；完整异常/并发、网站撤回未完成 |
| T08 | 部分完成 | 单批持续发布可用；通用受控批量/队列未完成 |
| T09 | 未完成 | 标准新游戏配置化 |
| T10 | 部分完成 | 只接管两游戏 guides 限定文字及原神中文新增，非全 scope 权威接管 |
| T11 | 部分完成 | 本机/异地密文恢复有证据；完整重建、保留与灾备余项未关 |
| T12 | 部分完成 | Git/验证 CI 已交付；全入口停写、平台权限与任意外部 UUID 交接未关 |

## 5. 本轮实际验证

| 验证 | 新鲜结果 |
| --- | --- |
| CMS 默认测试 | 179/179 通过，0 跳过 |
| 发布工具 | 814/814 Node 通过 |
| 其余发布 Node | 304/304 通过 |
| 发布 Python | 7+4+14+3+9+11+8 = 56 通过 |
| Web | 82 文件、440/440 通过 |
| Router | 4 文件、35/35 通过 |
| Data | 14 文件、168/168 通过 |
| 旧 Admin 默认测试 | 282 总数，265 通过、17 按默认条件跳过、0 失败；不是浏览器验收 |
| 类型检查 | CMS + Web/四游戏/Router/core/data/db 九包通过；均禁用 incremental；UI 无独立检查，不虚计 |
| Web ESLint | 0 error、1 既有 warning：auth-dialog.tsx:25 的 cleanup ref |
| inventory / Router / 部署配置 | 16 scope inventory、4 个生成部署与4个部署契约通过 |
| 数据 | validate、verify:manifests 通过；90/90 静态镜像语义一致 |
| Next 补丁 | 已安装15.5.28的4文件 patched；不等于本轮生产水合验收 |
| HTML 注入探针 | 惰性 Chromium DOM 复现，安全编码对照通过；**发现成立，不是漏洞已修复** |
| HTTP | 12/12 状态符合预期：3本机边界+9公网；正文/headers/SHA已保存 |
| 依赖 | 公众1critical/2high/3low；CMS1low，适用性见F02 |

本轮未执行：全量 Next/OpenNext 构建、部署/上传/回滚、全站爬取、游戏交互/跨 Worker 浏览器回归、CMS 认证写入/运行安装完整性校验、真实备份重演、Cloudflare 控制面/账户权限与账单重查、GitHub 新 CI。R39 的 UUID/安装/备份证据仅按原记录描述，没有冒称新鲜验证。

测试日志使用 `gachia-payload-resumed-*` 前缀保存于本目录；原未完成对话的 `/tmp/gachia-payload-audit-20261105-8pYiZv` 不作为本轮新鲜证据。`collect-readonly.mjs` 只发 GET，HTTP结果在 [http-observations.json](http-observations.json)，正文在 `http/`；脚本拒绝覆盖既有输出，复跑应使用新目录。

## 6. 审计结论

当前不是“CMS 尚未接通”，而是**单机编辑、双游戏指南更新及原神中文新增已可用，完整平台迁移尚未完成**。应先修公众内容输出安全、固化空间/CI/依赖门禁，再推进 NTE 缺译文与新增切片。接着完善公开 A 保留和显式撤回语义，按实际内容需求接入下一类型/游戏；普通请求一致性和全量权威移交作为独立架构里程碑，不用重复 R36/R39 验收替代。
