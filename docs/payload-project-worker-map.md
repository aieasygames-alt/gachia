# Payload 与 Gachia 多 Worker 项目地图

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

## 2. 实际部署：6 个生产服务 + 4 个 staging

| Worker | 角色 | 当前 Payload 写入范围 | 控制面核验范围 |
| --- | --- | --- | --- |
| `gachia-router` | 正式域名入口/路径分流 | 不部署 | 七服务保护集 |
| `gachia` | Main：共享页面、其余游戏、公开 JSON、账号停用接口、共享资源 | 每批 guides 与对应 game 组成双目标 | 七服务保护集 |
| `gachia-game-genshin` | Genshin 专属路径 | 已安装受控发布协议，真实编辑云 E2E 未验 | 七服务保护集 |
| `gachia-game-nte` | NTE 部分路径 | 已安装受控发布协议，真实编辑云 E2E 未验 | 七服务保护集 |
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
- Main/Router HTML为1小时公开缓存/1天SWR，Genshin指南s-maxage一年；noindex不代表private或访问控制。Payload发布走game/Main精确候选UUID，不通过四个历史staging别名；无须为首发擅自统一缓存或重部署Router staging。

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
- CMS 的 published 是编辑状态，不是公网激活。当前 84 条记录全为 draft/hold、0 条 eligible published，没有真实编辑候选。
- 发布是**顺序双目标**，不是跨 Worker 原子事务。第二目标失败可能留下混合状态；保留 journal、停止写入、只读对账，再显式决定兼容恢复，不自动重试或回退。
- 原始旧 UUID 可能没有新页面已引用的 chunks；兼容恢复必须是“上一公开 runtime + 新旧静态并集”，不能直接 rollback 到旧 UUID。
- releaseKey 已绑定 manifest、制品摘要、UUID 和 HTTP 指纹；没有注入每一个普通公开响应。旧格式 reader + 封存 build 不等于全站 Snapshot/ReleaseMap 请求上下文已接管。
- R20已安装资源刷新/兼容恢复准备命令并返回真实pin；547份公网资源、760份本地恢复响应（759个200及账号停用404）、7份精确云版本对照实测通过。诊断候选未上传，不等于真实云恢复验收。首次可信来源登记仍需维护者，云证据15分钟时效保留，不是一键从零发布。

## 5. 自动入口与执行方案约束

R23实际读取GitHub两个部署变量均false，staging/production环境无变量覆盖，独立Genshin preview workflow disabled；main的9份workflow与维护分支相同，Payload CI仅验证。Cloudflare公开Builds/hooks API实际11次403，不是空列表；现有登录Dashboard确认仅Main连接Git且生产/预览builds关闭，另9Worker未连接Git，Main明确无deploy hooks。其余hook/token未独立完整枚举，不能声称十服务所有凭据入口封堵或账户级“只有本机发布”。普通生产deploy/promote/rollback继续fail-closed；持凭据或Dashboard权限的人仍可能绕过仓库命令人工部署。

当前清单/CI与准备命令已交付；后续实际Genshin编辑就绪即优先首次/第二次云发布及恢复，再沿用NTE；独立介质/第二台Mac具备即验独立key/跨机恢复，首次来源交接继续减手工。内容准确度、全类型/全scope迁移、通用队列和免重建快照后置。没有真实编辑时不造内容或重复演练凑发布；运行数据、密钥、私有媒体与原始日志不入Git。
