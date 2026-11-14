# Payload 与 Gachia 多 Worker 项目地图

<!-- BEGIN R120 CURRENT -->
## 当前完成状态（2026-11-14 R120）

异环单 Worker 真实 CMS 正式更新闭环已完成。57 个材料的 171 个三语详情 URL 迁入异环，公开 JSON、搜索切片和 Main 聚合接通独立读取；一次性 NTE → Router → Main 迁移完成后，常驻 CMS 娜娜莉记录 1327 的英文简介完成草稿、审核、仅 NTE 构建、云预览和正式发布。日常内容发布仅改变 `gachia-game-nte`，最终版本 `963f4629-9b0f-4992-8373-fcb536508c81`。

精确提交 `cc0fdd18638b88d30dd42911055ae56b006b19bd` 的完整 CI [43450568989](https://github.com/aieasygames-alt/gachia/actions/runs/43450568989) 全部通过、无跳过；候选/恢复云预览、完整公网合同、三语桌面/手机六场景、无 JS 材料和最终只读控制面/模块复核通过。其余 2,879 条 CMS 记录保持。恢复已云预览，本批未实际生产回滚；本批仅证明既有角色文本资格。

当前完整来源为 `reports/nte-independent-delivery-2026-11-12-r120/independent-sources-01/source-index.json`，SHA256 `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`，115 份来源相对 R119 仅异环角色 raw 变化，胡桃修改及五份攻略增量保留。下一批使用 `readNteSourceIndex` 接续此索引，不回退旧来源或重放完成日志。后续顺序：蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。详细证据见 R120 `EXECUTION.md` 和 `delivery.json`。下方旧轮次均为历史状态。
<!-- END R120 CURRENT -->

**历史入口：2026-11-05 R39。** Genshin中文新建攻略已完成一次真实正常发布；NTE仍为既有攻略维护，新建切片尚未验收。公开Genshin32/NTE53，Git原始O为31/53，差异属于CMS叠加。见[R39](../reports/payload-new-guide-launch-2026-11-05-r39/README.md)、[全面审计](../reports/project-audit-2026-11-05/README.md)和[后续计划](../plans/project-next-development-2026-11-05.md)。以下R36/R37的计数、UUID与“新增未接通”均为当时历史状态；新发布必须重读当前来源/控制面，不使用本文历史值授权。请求归属和顺序双owner发布边界没有改变。

**公众发布基线：2026-11-04 R36。** 由代理规划→认证Payload草稿/批准→本机双owner发布的真实路径已执行，NTE与独立Genshin更新、公网/source-advance、双向共享Main交接均通过，修订后的限定V1运行里程碑完成。架构仍为本机Payload/PG、Cloudflare公众多Worker，无Tunnel/Mac回源。C05b独立key用户暂缓，完整灾备不宣称完成。证据见[R36](../reports/payload-agent-live-publish-2026-11-04-r36/README.md)，操作见[工作流](payload-agent-publishing-workflow.md)与[V1清单](../plans/payload-v1-completion-2026-11-03.md)。

**2026-11-05 R37运维复核：** 10Worker/7服务及额外staging前后新鲜重读，与R36最终UUID/部署/settings一致。新私有备份对象生成、下载认证和隔离DB/媒体恢复通过，r2.dev/自定义域名关闭且七服务无备份桶binding；没有Worker版本上传/部署、Router改动或内容编辑。最新备份/保留/依赖复核见[R37](../reports/payload-postlaunch-operations-2026-11-05-r37/README.md)，不改变下面公众请求归属或限定写入范围。

本轮实际重查10Worker/7服务，Router/staging及其他服务保持，单次仍只写game+Main。最终Main UUID为`63b9b839-5ad7-4f61-9add-5df5ee336bc4`，Genshin为`347eb5c8-36d5-4f9c-b548-bb19c8617304`，NTE为`c1247d65-734d-42a9-8f6f-16d6ab0a1173`；两游戏当前来源已分别绑定最终Main，后续新候选仍要新鲜取证。R33编辑资格、R35隐式回退拒绝保持；R36新上传首次精确元数据404有界可见性等待和同步验证pass已安装，精确代码CI成功，28工具/698应用文件验摘要。

R35最小fail-closed门禁逐字段比较O/A/B，拒绝A→O隐式回退，连同刻意精确重置也拒绝；不自动改写导出、不实现完整reset-intent、不改变恢复reader。C03/C04已由R36真实验收关闭，后续按内容需求进入新批次，不重发旧run。当前只接管两游戏既有指南6个本地化title/body字段，不是全16scope/所有类型；后台published不是部署，顺序双owner切流不是原子ReleaseMap激活。单Mac为既定范围，第二Mac/准确度/翻译均不作门槛。以下轮次增量保留为历史，冲突以本节与V1清单为准。

2026-11-03 R28当前增量：[恢复来源接续报告](../reports/payload-recovery-source-2026-11-03-r28/README.md)、[有限完成计划](../plans/payload-v1-completion-2026-11-03.md)。安装版双游戏当前来源选择通过，10Worker前后与R27一致，仍保护7服务、单次只写game/Main；本轮无云/内容写入、无CMS重启或架构变更。24publisher模块+manager+2TS helper共27文件验摘要，不影响公众应用bundle。

**恢复后的来源连续性工程子项已关闭**：显式source-recover仅接纳本机已知完整兼容恢复，原始封存链/renewal/推广与恢复journal/实际HTTP及当前双UUID重验；下一候选准备/retain与另一游戏共享Main rebind已覆盖。历史时钟不延长实时门禁；未知外部部署仍拒绝。完整NTE磁盘链还修复旧preview reader硬编码Genshin。下一优先级为C03真实Genshin首发/连续/恢复，随后C04 NTE共享Main及C05独立key/跨机；都仍未完成真实验收。下方轮次为历史，不作为继续扩建工具的顺序。

2026-11-03 R26增量：[本地证据准备编排](../reports/payload-evidence-preparation-2026-11-03-r26/README.md)。已构建候选可用`publish-prepare-evidence`只读云控制面/HTTP并准备本地资源、公开A与兼容恢复证据；全程同run锁，开始/结束重验来源与7服务拓扑，失败不续用半成品，有云写journal拒绝。没有新增Worker/Tunnel/数据库绑定或云写入能力，公众请求不依赖Mac；10服务观察/7服务保护/每次game+Main写入边界不变。来源目录仍按双UUID索引，首次/未知/外部或恢复版本不自动接纳。只关闭本地编排实现/隔离验收/安装子项，不称真实云上线完成；本轮实际状态见R26报告。下方R25及更早为历史。

2026-11-03 R25增量：[跨游戏Main只读重绑定](../reports/payload-source-rebind-2026-11-03-r25/README.md)。`publish-source-rebind`保持目标game UUID/公开A，组合原始游戏来源与另一游戏完整本机成功发布的新Main；固定双UUID新条目，父pin/历史与新鲜HTTP/模块/版本配置/七服务拓扑重验，不造候选run/releaseKey、改旧条目或自动切流。47隔离回归含实际loopback，23工具文件安装；真实云重绑定未验。10Worker与R24一致，仍只保护7服务、发布写入game+Main，不扩展Router/staging或Mac公网依赖。无内容/云写入或CMS重启；下一工程项为现有本地证据准备流程编排。下方R24及更早为历史。

2026-11-03 R24增量：[发布后来源接续](../reports/payload-source-advance-2026-11-03-r24/README.md)。显式`publish-source-advance`仅接受本机完整成功推广的同游戏game/Main封存来源；新精确UUID/模块/静态/动态HTTP重验后生成资源/来源并登记。Main来源使用真实本机bundle/journal而非伪造GitHub artifact ID，22工具文件已安装。无内容/云写入或CMS重启；仍10Worker观察/7服务保护/game+Main写入，不扩展Router或staging权限。真实云接续未验，跨游戏共享Main新UUID不能自动套另一游戏条目，后续受控重绑定另列。

核验日期：2026-11-02，R20复核。工程基线 `a0634a9b2939f4933508c54c88d97caf7f773f11`。这是源码与实际控制面/公网采样的对照，不把 Wrangler 模板当作已部署事实。详细底图见 [R19 全面审计](../reports/payload-status-audit-2026-11-02-r19/README.md)，本轮命令与复核见 [R20执行报告](../reports/payload-launch-closeout-2026-11-02-r20/README.md)。

R21来源交接增量：[报告](../reports/payload-source-catalog-2026-11-02-r21/README.md)。已安装的来源目录严格按game/Main当前UUID索引，Genshin登记及选择重新读取双模块/Main JSON与本轮七服务拓扑；只读准备，不切换服务或扩展保护范围。新UUID缺目录即停止，不能认为Main共享就允许复用另一游戏来源；每个game分别登记。新候选仍需全套新鲜证据，NTE本轮未实机登记，真实云内容发布仍未验。

R22当前增量：[NTE来源交接报告](../reports/payload-nte-source-handoff-2026-11-02-r22/README.md)。已补NTE当前game/Main登记与安装版模块source-only选择；557份公网静态、811份本地响应、15份精确版本HTTP通过，历史树未改，派生副本仅替换当前云runtime。无NTE候选run/releaseKey，不冒充manager候选或真实云发布验收。10Worker/7服务保护/game+Main写入边界不变，四staging实际HTTP与外部入口仍是下一核验项。

R23当前权威增量：[staging/外部入口报告](../reports/payload-staging-inspection-2026-11-02-r23/README.md)。四staging别名/当前UUID共78实际响应、62动态noindex、8robots禁爬，完成限定HTTP/已知自动构建入口调查，替代下文R19未验结论。10Worker前后/最终及R22一致；没有重部署、安装、内容编辑或CMS重启。真实候选发布与账户级仅本机发布仍未验/未强制；无真实编辑时下一工程项转首次/新UUID来源交接，不重复历史staging调查。

## 1. 三个系统边界

| 系统 | 位置与职责 | 不能混淆的边界 |
| --- | --- | --- |
| 公众网站 | `apps/web`、四个 `apps/game-*`、`apps/router`；Next 15.5.28/OpenNext 与 Cloudflare Workers | 公众请求不访问本机 CMS；网站 D1/R2 不是 CMS 数据库/私有媒体 |
| Payload | 独立 `services/content-cms`，自己的 workspace/lock；Payload 3.92.1、Next 16.4.2、React 19.2.6 | 安装在 `~/Library/Application Support/GachiaCMS`，Node/PostgreSQL；只监听 127.0.0.1:3100/54329，无 Tunnel |
| 旧本地工作台 | `apps/admin`，HI3 intake/review/preview，SQLite、bearer、127.0.0.1:4317 | 不是 Payload，也不是额外的公网 Worker；不删除其他工作的草稿/入口，后续按接管单元退出双权威 |

根 workspace 仅包含 `apps/*` 与 `packages/*`；CMS 依赖不能泄漏到公众站点。`packages/core` 提供游戏/路径归属及协议，`packages/data` 保留当前公开原始内容，`apps/web/public/data` 有公开 JSON 镜像。文件镜像相同不等于已转交编辑权威。

维护分支为 `codex/payload-unified-maintenance`。`/Users/robert/Documents/gachia` 是另一份旧且有修改的 checkout，不能作为最新 Payload 发布源码，也不能在审计中覆盖或重置。prepare 使用已同步的精确 Git commit，不包含工作区未提交改动。

## 2. 已观测部署：6 个生产服务 + 4 个 staging

服务清单与保护边界由R36控制面重新只读核对，Payload能力列更新至R36；不以本地Wrangler模板补造新服务。

| Worker | 角色 | 当前 Payload 写入范围 | 控制面核验范围 |
| --- | --- | --- | --- |
| `gachia-router` | 正式域名入口/路径分流 | 不部署 | 七服务保护集 |
| `gachia` | Main：共享页面、其余游戏、公开 JSON、账号停用接口、共享资源 | 每批 guides 与对应 game 组成双目标 | 七服务保护集 |
| `gachia-game-genshin` | Genshin 专属路径 | R32首发、R36独立正常指南更新及Main交接通过 | 七服务保护集 |
| `gachia-game-nte` | NTE 部分路径 | R36真实指南更新及双向共享Main交接通过 | 七服务保护集 |
| `gachia-game-azur-promilia` | Azur Promilia 专属路径 | 暂不接管 | 七服务保护集 |
| `gachia-game-lvmeng` | Lvmeng zh 专属路径 | 暂不接管 | 七服务保护集 |
| `gachia-staging` | Main staging | 不部署 | 七服务保护集 |
| `gachia-router-staging` | 历史 staging Router | 不部署 | R19 另行只读盘点，未纳入七服务部署/settings 保护 |
| `gachia-game-genshin-staging` | Genshin staging | 不部署 | 同上 |
| `gachia-game-azur-promilia-staging` | Azur staging | 不部署 | 同上 |

本次账号脚本清单发现上述 **10 个 Gachia Worker**，未发现已部署的 `gachia-game-nte-staging`。不能从仓库存在 env 配置推断对应服务已部署。

`scripts/desktop-cloud-release.mjs` 的 SERVICES 固定为六生产 + Main staging。它还比较脚本名清单，但**没有重读另外三个 staging 的部署/settings**。因此“七服务前后无变化”成立，“全项目十服务完全受保护”不成立。R20新增并安装`publish-project-inventory`，实际读到10服务/3额外staging，secrets值脱敏；R23前后/最终及R22一致。它只观察，不扩展推广保护/写入目标。R23补限定staging HTTP与已知自动入口调查，非全站/全账户安全验收。

### staging 实际值不等于源码模板

- Genshin staging 的实际 `GENSHIN_DEPLOYMENT_MODE=production`；可能来自同制品推广策略，不能仅凭名称判为漏洞，也不能据此宣称隔离/索引策略已验。
- Azur staging 实际 mode 为 preview。
- Router staging 实际仅 MAIN_SITE 指向 `gachia-staging`，`NTE_ENABLED=false`，NTE_SITE 的 service 为空且已删除，`PREVIEW_MODE=true`，workers.dev 开启。仓库 staging 模板的其他生产 game bindings **不是本次观察到的实际部署**。
- R19四个staging robots fetch failed由R23实际网络证据替代：别名/精确版本8个robots均禁爬，62动态响应均noindex，30HTML为生产canonical、12XML为生产域名sitemap。20份Main/Router语言偏好cookie原始发现保留，正式无cookie验收门禁不改。
- 上述历史staging观察中Main/Router HTML为1小时公开缓存/1天SWR、Genshin指南s-maxage一年；不是当前全部公网响应的统一缓存策略。R34普通公网两篇指南实测为private/no-cache/no-store，公开JSON为public,max-age=0,must-revalidate，根图1小时、NTE图1小时+SWR。noindex不代表private或访问控制。Payload发布走game/Main精确候选UUID，不通过四个历史staging别名；不为此擅自统一缓存或重部署Router staging。

## 3. 正式请求路径与所有权

```text
gachia.com/*、www.gachia.com/*
                   |
              gachia-router
                   |
       +-----------+-------------------------------+
       |           |            |          |       |
     Main       Genshin        NTE        Azur   Lvmeng
    gachia      专属路径       部分路径     专属路径  zh专属
```

这两个 zone routes 均指向 `gachia-router`；未发现 Gachia 自定义 Worker domain。各服务 workers.dev/版本预览开启，不等于另一个正式发布入口已经获准。Router 的 MAIN_SITE 与四个 game service bindings 对应实际生产服务；NTE 的启用条件是有 binding 且 flag 不为 false，未配置 NTE_ENABLED 不等于禁用。

路由权威为 `packages/core/route-ownership.json`、生成后的 Router 配置与 `apps/router/src/index.ts`。16 个技术 scope 约对应 15 款游戏（roco/roco-cn 是地区分拆）；四个专属 owner，其他 12 scope 默认 Main。**游戏不等于一个 Worker，不能按游戏前缀整站接管。**

| 路径示例 | 实际 owner / 改写 |
| --- | --- |
| `/zh/genshin/guides/<id>` | Genshin；zh/en/ja |
| `/zh/nte/items` | NTE；NTE 专属页面覆盖 zh/en/ja |
| `/zh/nte/items/annulith` | Main；不能归给 NTE 专属应用 |
| `/zh/azur-promilia/guides` | Azur；zh/en/ja |
| `/zh/lvmeng/guides` | Lvmeng；独立 owner 只覆盖 zh |
| `/data/<game>/raw-guides.json` | Main，即使对应 HTML 由 game Worker 服务 |
| `/_games/<game>/_next/*` | 对应 game Worker，转为其本地 `/_next/*` |
| `/sitemaps/<game>/index.xml` | 对应 game Worker `/sitemap.xml` |
| `/robots.txt`、`/sitemap.xml`、账号 API、非命名空间共享图片 | Main；账号仍停用 |

Main 当前有网站 D1、`gachia-images` R2、自引用及已有 secret bindings；四游戏主要是 assets/vars，Router 是 service bindings。没有 Worker 绑定本机 Payload。私有 CMS 备份桶 `gachia-cms-private-backups` 独立于网站图片桶，r2.dev 关闭、无 custom domain、未绑定七个网站服务。

## 4. Payload 当前如何发布

```text
本机编辑 draft -> 显式 published/hold=false -> 受限 guides 导出
  -> 精确 Git 源码 + 内容覆盖 -> game/Main 双构建/封存
  -> 当前公开基线 + 旧资源保留 + 兼容恢复制品
  -> 两候选和两恢复制品的精确 UUID 云预览
  -> 按序推广同 UUID -> Router 公网验收/留证
```

- 第一条指南文字发布仅变更 `[genshin, main]`；NTE 为 `[nte, main]`。不部署 Router、不动另两游戏、不批量发全部 Worker。
- CMS的published是编辑状态，不是公网激活。R36最终DB84条：Genshin30 draft/hold与1 published/eligible，NTE52 draft/hold与1 published/eligible；两篇均已公网验收。其余82条hold不表示现有网站页面消失，不批量解除hold。
- 导出只允许既有Genshin/NTE指南title/body（zh/en/ja共6个旧JSON字段）；新增/删除、ID/URL/顺序/media/summary/FAQ等固定字段及其他内容类型未接通。R35已安装同游戏隐式O回退的前向拒绝门禁；导出器不自动保留A，显式重置/网站撤回契约仍未实现。跨游戏保留及其真实双向交接本轮通过，不等于通用全类型激活。
- 发布是**顺序双目标**，不是跨 Worker 原子事务。第二目标失败可能留下混合状态；保留 journal、停止写入、只读对账，再显式决定兼容恢复，不自动重试或回退。
- 原始旧 UUID 可能没有新页面已引用的 chunks；兼容恢复必须是“上一公开 runtime + 新旧静态并集”，不能直接 rollback 到旧 UUID。
- releaseKey 已绑定 manifest、制品摘要、UUID 和 HTTP 指纹；没有注入每一个普通公开响应。旧格式 reader + 封存 build 不等于全站 Snapshot/ReleaseMap 请求上下文已接管。
- R20已安装资源刷新/兼容恢复准备命令并返回真实pin；547份公网资源、760份本地恢复响应（759个200及账号停用404）、7份精确云版本对照实测通过。诊断候选未上传，不等于真实云恢复验收。首次可信来源登记仍需维护者，云证据15分钟时效保留，不是一键从零发布。

## 5. 自动入口与执行方案约束

R23实际读取GitHub两个部署变量均false，staging/production环境无变量覆盖，独立Genshin preview workflow disabled；main的9份workflow与维护分支相同，Payload CI仅验证。Cloudflare公开Builds/hooks API实际11次403，不是空列表；现有登录Dashboard确认仅Main连接Git且生产/预览builds关闭，另9Worker未连接Git，Main明确无deploy hooks。其余hook/token未独立完整枚举，不能声称十服务所有凭据入口封堵或账户级“只有本机发布”。普通生产deploy/promote/rollback继续fail-closed；持凭据或Dashboard权限的人仍可能绕过仓库命令人工部署。

当前限定双游戏日常文字发布、恢复后再发与双向共享Main交接均已验，不再重复。下一批由代理规划并先入CMS，仍完整发布/验收；C05b暂缓，不要求第二台Mac。首次无可信来源/外部未知UUID继续显式交接，不自动接纳。内容准确度、翻译、全类型/全scope迁移、通用队列和免重建快照后置。没有真实编辑时不造内容或重复演练凑发布；运行数据、密钥、私有媒体与原始日志不入Git。
