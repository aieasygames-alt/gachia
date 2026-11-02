# Payload 全面审计 R19：项目、多 Worker 与剩余任务

日期：2026-11-02。目标：尽快交付可持续使用的**本机编辑、仅本机发布**链路；不以内容事实准确度、全类型清洗或全游戏迁移阻塞首发。

## 结论与问题（按推进优先级）

**本机编辑端可用，双游戏发布工具已安装，完整真实云发布闭环仍未验收。不能宣告 Payload 全面完成，也不应重复已完成的选型、构建及同机备份演练。**

1. **工程基线有真实漂移，绿色 CI 未覆盖。** 本轮 `inventory:check` 失败：Genshin/NTE 新增 11 个已跟踪 shadow/reader 文件、4 个候选文件摘要变化、8 个资源路径尚未反映在旧清单。raw 来源、镜像、sharedCandidates、review 合同没有变化。`services/content-cms/scripts/inventory.ts` 固定输出到 2026-10-28 历史报告，不能直接覆盖旧 evidence 来“修绿”。现行 `.github/workflows/payload-verify.yml` 既未跑 inventory，也未跑 Router 专属测试。应先做小范围的当前清单版本化与 CI 补口，不是内容审稿。
2. **项目实际有 10 个 Worker，七服务保护集不是全项目清单。** 六生产 + 四 staging；另三个 staging 只有脚本名参与发布器比较，其部署/settings 不在保护集。R19 已额外读取它们，发现 Router staging 与源码模板不同，但不能自动部署修齐。首发继续限定 game/Main 两目标，补齐观察范围不等于扩大发布范围。见 [项目地图](../../docs/payload-project-worker-map.md)。
3. **首发操作仍太依赖维护者，资源/兼容恢复证据命令化是主瓶颈。** `docs/payload-operator-runbook.md` 第4节明确没有完整生成命令；多 run/pin 手工衔接，云证据仅15分钟。下一主要实现应固定 game/Main、当前可信 UUID 和真实资源来源，自动生成/校验本地证据；不接受 fabricated approval，不自动重复写云，不删除失败 journal。
4. **真实编辑候选的云 E2E 仍为空。** 本机仍为 Genshin31 + NTE53，共84 draft/hold，0 eligible published。R14 的连续编辑/构建/恢复、R15 的 NTE 本地恢复、R12 的模拟 partial failure 成立；都不能代替真实候选的云上传/精确版本预览/推广/公网留证、连续云发布、云 partial failure 及恢复。已有默认操作授权，不再重复等授权；但不能制造演练变更或批量清 hold。
5. **灾备只完成了异地密文与同机恢复，独立密钥和跨机启动未验。** R17 私有 R2 真实上传/下载/AES认证/隔离PG媒体恢复有效；密钥仍只有本机已知位置。Mac 整机丢失后的重建没有证据。不能重复一次备份往返就关闭 L03/T11/P7。
6. **剩余风险应分层，不扩大首发范围。** deepmerge 仍1 low、无已公布修复版；R16仅接受可信单用户loopback风险，2026-11-16前复核。全类型语义、媒体权利、多人 UI、批量运营、新游戏配置、全 scope 权威交接仍未完成；事实准确度后置不等于批准第三方媒体或取消权限/版本/恢复边界。

## 1. 审计范围与源码身份

- 工作区：`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`；分支 `codex/payload-unified-maintenance`，代码基线 `84b3c47f9915d4ad5ad4d25bc1bb93035c96ca34`，远端任务分支一致。
- 远端 main 仍为 `71a52728be2c9612d0b39be47092b7d85a320ac3`。R18 后续冻结提交对应实际 CI [41398657261](https://github.com/aieasygames-alt/gachia/actions/runs/41398657261) 成功；本轮只读取其结果，**未重新触发 GitHub CI**。
- 环境默认目录 `/Users/robert/Documents/gachia` 是不同 checkout：HEAD `e6d6bb9`，相对 origin/main 1 ahead/81 behind、14个已有 tracked 修改。本轮未动，不作为最新发布源、不合并或重置。
- 本轮为只读运行/控制面审计与文档更新；没有 CMS 编辑/重启/覆盖安装、网站上传/部署/切流、R2写入或 Git commit/push。仅为 Router 本地验证补齐已锁定的离线依赖链接，未改源码/lock。
- 不是全仓安全审计、全游戏浏览器回归或账单审计；未重新构建公众 Next 应用、未进行新全量 parity/媒体权利审查。

## 2. 项目与多 Worker 理解

公众站点是根 pnpm monorepo 的 Main + 四独立游戏 + Router，Next15.5.28/OpenNext；CMS是独立依赖环境的 Payload3.92.1/Next16.4.2/React19.2.6，Mac Node/PG。`apps/admin` 是另一套本地 HI3 SQLite 工作台，不是 Payload、不是公网 Worker。CMS 不接管玩家账号，不回连网站 D1。

### 实际生产拓扑

`gachia.com/*`、`www.gachia.com/*` 均进 `gachia-router`，再经 MAIN_SITE/四 game bindings 分流。16技术scope约15游戏，四专属owner、其他12默认Main。NTE有分割归属：`/zh/nte/items` 是NTE、`/zh/nte/items/annulith` 是Main。独立owner Genshin/NTE/Azur覆盖zh/en/ja，Lvmeng仅zh。

Main仍承担 `/data/<game>/raw-guides.json`、root sitemap/robots、账号停用接口和非命名空间共享图片；game静态经 `/_games/<game>/_next/*`，game sitemap经 `/sitemaps/<game>/index.xml` 改写。Main有网站D1/图片R2/自引用，game主要assets/vars，Router为service bindings。**任何线上Worker都不实时访问本机CMS。** Mac离线不影响已有公网内容。

| 服务 | 当前活动版本 | 备注 |
| --- | --- | --- |
| gachia | 3efd4103-7156-484b-86d8-a28853a668c8 | Main，保护集 |
| gachia-router | 239bb325-998c-4893-98e5-ddd24d50c99a | 正式域名入口，保护集 |
| gachia-game-genshin | c0dba6f4-878a-467e-91e9-f32508e59e82 | 保护集 |
| gachia-game-nte | cb854ebe-544d-40b6-9217-5df329a8a1cb | 保护集 |
| gachia-game-azur-promilia | 86353da1-7aa9-40e1-836c-a344eeb4dad0 | 保护集 |
| gachia-game-lvmeng | 7e62c798-d454-48d7-8bee-1bce6660550b | 保护集 |
| gachia-staging | f142070d-ffb0-4b99-a204-49af0c265baa | Main staging，保护集 |
| gachia-game-genshin-staging | 97f3bae6-3e9f-423f-a2c7-8a460f9911f4 | 额外盘点，实际mode=production |
| gachia-game-azur-promilia-staging | c6b46257-2441-4cc2-b9c6-c31d4d4d1cca | 额外盘点，实际mode=preview |
| gachia-router-staging | 7b78ea79-6d5d-4df7-83df-f5c5f8953501 | 额外盘点，不等于源码env模板 |

未发现已部署NTE staging。实际Router staging MAIN_SITE→gachia-staging、NTE_ENABLED=false、NTE_SITE为空/已删除、PREVIEW_MODE=true、workers.dev开启。四staging robots探测均 fetch failed，**未取得HTTP/noindex验收结论**；也没有核验十服务所有外部构建/凭据入口。七保护服务前后部署/拓扑一致、与R18一致，另三服务只做新增观察，不声称历史对比已通过。

### 发布方案影响

首发仅Genshin/Main；NTE随后用NTE/Main，同一批不动Router和其他游戏。已实现同制品精确UUID上传/预览与顺序推广；跨Worker**非原子**，混合状态需停写对账。回退使用上一公开runtime+新旧静态并集，不直接旧UUID。当前releaseKey绑定manifest→制品→UUID→实际HTTP指纹，**没有让每个普通公开请求都使用ReleaseMap上下文**；完整T04/P4语义仍未关闭。无需为首条指南文字发布先重构所有reader或改为远程CMS。

## 3. 新鲜验证结果与历史证据

| 项目 | 本轮结果 | 边界/证据 |
| --- | --- | --- |
| CMS typegen/typecheck | 通过 | `cms-tests.log` |
| CMS测试 | **161/161** | 新重跑，不沿用137旧基线 |
| 桌面发布测试 | **359/359** | CI环境本地重跑，含模拟故障；不是云E2E |
| 既有Node发布测试 | **304/304** | `release-router-tests.log` |
| Python发布/恢复测试 | **45/45** | 同日志；14+3+9+11+8 |
| Router生成配置/部署映射校验 | 通过 | 同日志 |
| Router typecheck/测试 | 通过，**35/35** | 初次因缺node_modules失败；固定锁离线安装后通过，失败日志保留 |
| inventory:check | **失败，未修复** | `inventory-check.log` / `inventory-drift-summary.json`；不是raw内容变化 |
| CMS生产依赖audit | **1 low，0 moderate/high/critical** | fresh `dependency-audit.json`，exit1；deepmerge GHSA-gcqx-w48m-w2h4，暂无修复版本 |
| 本机HTTP安全/健康 | **9/9** | 登录/健康200；匿名集合/私有媒体、错误Host/Origin/跨站403 |
| 安装完整性 | **19/19工具、62/62 CMS源文件** | 与维护分支一致；源文件比较不证明已编译build字节身份 |
| 当前公网采样 | 基本HTTP/路由 **19/19**；当前guides发布相关 **15/15** | 不是编辑候选发布验收；下段保留统一探针失败 |
| GitHub CI | HEAD84b3c47的既有真实run成功 | 本轮GET，不是新运行；workflow漏inventory/Router |
| 文档相关回归/链接 | **63/63**、**127个本地链接无缺失** | `documentation-regression.log` / `documentation-links.json`；`git diff --check`通过 |
| 全Next build/parity/浏览器 | **本轮未重跑** | R5/R9/R14/R15原证据仍可查，不能算本轮新结果 |

### 公网采样没有全部“严格绿”

统一探针严格合同仅 **16/19**。Main `/zh`、`/zh/nte/items/annulith` 带NEXT_LOCALE，是next-intl语言cookie，不是Payload会话/玩家登录cookie；独立解析得到正确canonical/metadata及各4个JSON-LD。它们不在现行guides-only Main JSON/static验收内，不能把“禁止所有cookie”误报成新的安全缺陷。

Lvmeng `/zh/lvmeng/guides` 为200、正确owner/cache/canonical/H1，但JSON-LD为0，源码页也没有JSON-LD。保留为以后接管Lvmeng时的owner专属SEO合同缺口，尚无证据证明本次回归，也不阻塞Genshin/NTE首发。原始失败和正文均保留，未修改统一探针日志来凑通过。额外staging HTTP探测失败另记，不计入19个生产采样。

### 本机持久状态

Payload/PG LaunchAgents loaded；仅127.0.0.1:3100/54329。1admin、84内容、1私有媒体；Genshin31/NTE53全部draft/hold，eligible published=0。84条sourceRecord与维护分支原文一致。DB逻辑摘要 `c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`，与R18一致。源/镜像四文件与HEAD一致。

根/data/key目录700，settings/initial-admin600；本机5个备份目录。私有R2备份桶r2.dev关闭、custom domains为空、未绑定七个网站服务。本轮只读复核隐私设置，没有新做R2往返或跨机恢复。

### 沿用但不重复计数的成果

- R14：真实克隆PG/Payload O→A→B导出、四次Worker build、28候选/327恢复响应，恢复A而非O。不是云拓扑。
- R15：NTE当前UUID绑定116旧资源/公网字节，Main441资源；前向/恢复各811本地响应及8公网对照，严格双游戏协议与持久安装。
- R16：现行手册、限定依赖风险决定、无密钥源码包/新目录回归。没有一键全部证据生成。
- R17：独立私有R2真实密文上传/下载、AES认证、文件校验及同机隔离PG/媒体恢复。独立key/cross-Mac未验。
- R18：代码/锁/fixtures安全Git冻结、推送、真实Linux验证CI。不是main合并、网站部署或本轮文档的远端验证。

## 4. 当前任务状态（替代旧表）

### P0–P7

| 阶段 | 当前状态 | 未完成范围 |
| --- | --- | --- |
| P0 全游戏基线 | 部分完成 | 新inventory漂移修复；全类型/责任/权利账本，准确度后置 |
| P1 本地编辑与安全 | 部分完成 | 本机已交付；完整UI/并发/密钥生命周期及跨机保障 |
| P2 全游戏导入 | 部分完成 | 84指南可编辑，其余范围仅只读盘点/局部类型契约 |
| P3 批次与影子发布 | 部分完成 | 本地协议/封存已验；真实候选与全关联类型未验 |
| P4 多owner读侧/接管 | 部分完成 | 首发旧reader封存路线；真实云及完整请求版本上下文未验 |
| P5 持续更新 | **部分完成（由局部原型更新）** | R14本地连续发布、续验/恢复已实测；真实云、队列/批量/告警未验 |
| P6 新游戏配置化 | 未完成 | 通用配置/导航/搜索/SEO/扩展能力后置 |
| P7 恢复与退役 | 部分完成 | 私有异地密文及同机恢复已有；独立key、跨机、云恢复/全范围退役未验 |

P5/T08提升只承认本地持续发布子任务，**不是**宣布调度、批量运营或整个持续更新系统可用；其他未完成项保留。

### T01–T12

| 任务 | 状态 | 已有成果与剩余 |
| --- | --- | --- |
| T01 状态/历史优先级 | 完成 | 保留回归，不重开 |
| T02 文件制品/消费者 | 限定本地完成 | 生产保留与全应用语义归T04/T05，不扩大本项结论 |
| T03 DTO/依赖闭包 | 部分完成 | 84原文guides和局部契约；全类型/内联/新媒体权利未关，事实校对后置 |
| T04 实际reader/一致性 | 部分完成 | shadow fixture和双游戏本地封存/恢复已验；真实候选云E2E、连续发布、partial failure、全请求releaseKey仍未验 |
| T05 生产架构ADR | 部分完成 | 本机Node/PG已决定并运行；不再比较云CMS/D1；完整运维/恢复/保留与安全余项 |
| T06 批准与激活协调 | 部分完成 | 双游戏精确UUID推广、续验、人工兼容恢复与日志已安装；真实云验收及通用协调未关 |
| T07 编辑资格/UI | 部分完成 | 本机编辑/显式发布意图及手册已有；完整异常、多角色/设备/withdraw/correct/revoke未关 |
| T08 持续更新/受控批量 | **部分完成（限定本地持续发布）** | R14连续发布及恢复成立；云连续发布、计划恢复/队列/死信/告警/吞吐未关 |
| T09 配置驱动新游戏 | 未完成 | 后置，不影响首条既有guides文字发布 |
| T10 全scope权威移交 | 部分完成（准备） | 只读盘点/部分导入，公开仍旧来源；尚未完成停写/最终同步/接管与交还 |
| T11 完整恢复/旧入口退役 | 部分完成 | 本机与私有R2同机恢复已有；独立key/跨机启动、云兼容恢复、完整退役未关 |
| T12 Git/CI可复现交付 | 部分完成 | Git同步/实际CI/源码包已完成；inventory+CI补口、证据命令化与完整交接未关 |

### 首发 L01–L06

| ID | 状态 | 下一关闭条件 |
| --- | --- | --- |
| L01 连续发布基线 | 本地完成，云未验 | 真实A/B云发布后恢复A，资源完整；不重复本地演练 |
| L02 续验/人工恢复 | 实现/隔离组合/安装完成，云未验 | 同UUID真实续验、失败对账与兼容恢复留证 |
| L03 最低灾备 | 部分完成 | 独立key保管和第二台Mac应用重建/启动，不重复R2往返 |
| L04 Genshin首发 | 工具已安装，无真实候选 | 实际预期文本编辑→双云预览→顺序推广→公网留证 |
| L05 NTE云链路 | 协议/资源/本地恢复/安装完成 | 真实候选云预览/推广与云故障恢复，跟随Genshin验证模式 |
| L06 工程交付/操作 | 部分完成 | 当前inventory/CI、固定资源/恢复证据命令、完整交接；旧Git/CI成果不重做 |

## 5. 下一轮执行计划

1. **先修小型工程漂移：L06/T12。** 建立版本化的当前inventory、保留2026-10-28旧清单及其消费fixtures；审查差异并增加回归。CI加入当前inventory检查及Router生成配置/映射/typecheck/测试，仍无部署权限。补充十Worker观察清单，区分保护集/发布集，另三staging策略需显式定义，不自动扩写。
2. **主线：L06资源/恢复证据命令化。** 固定Genshin/Main、NTE/Main，验证可信当前基线与旧资源来源；把capture/retain/兼容恢复本地采样接进manager，返回清晰可续接输出。验收包含第二轮B→恢复A、跨game错配、资源/UUID/时效漂移、网络失败保留证据和零意外云写入。已有续验/对账协议复用，不重写所有reader。云写入前先验证现有Wrangler登录；本轮曾401，刷新现有登录后GET成功，失败日志保留。
3. **灾备余项：L03。** 选择真正独立的密钥保管位置，验证可找回；用第二台Mac/独立恢复环境按交付文档启动CMS并核验PG、媒体、管理员与工具。没有第二台机器/保管位置时可先完善可执行流程，但不得冒称验收完成。
4. **实际编辑就绪即进入L04，再L05。** 仅真实打算公开的既有指南文本，不事实审稿、不批量解hold、不制造变化；完成Genshin首次/第二次云发布、同UUID续验、兼容恢复及受控故障验证，再沿用到NTE。真实生产partial failure不能靠故意破坏另一目标制造；先验证隔离故障策略，再在受控环境取证并如实记录范围。

不作为首发前置：全游戏全部类型、事实准确度/翻译/命名整理、全媒体重新批准、通用新游戏配置、完整队列运营、免重建Snapshot读侧。**不新增未经批准公开媒体**与不泄漏草稿/密钥仍是约束，不因准确度后置而取消。不开启玩家账号、不用Tunnel、不重新选云CMS、不为了首发合并旧脏main。

## 6. 证据与后续文档

- 本机：`local-state.json`、`local-final.json`、`local-http.json`、`listeners.txt`、`installed-integrity.json`、`local-storage.json`。文档更新后最终只读复核健康、DB及安装文件仍一致。
- 工程：`cms-tests.log`、`release-router-tests.log`、`router-tests.log`、`router-dependencies.log`、`inventory-check.log`、`inventory-drift-summary.json`、`dependency-audit.json`。
- 代码/CI：`git-context.json`、`github-ci-baseline.json`、`github-deploy-guards.json`、`github-workflows.json`。
- 云/公网：`cloud-before.json`、`cloud-after.json`、`cloud-final-check.json`、`cloud-summary.json`、`additional-staging.json`、`public-samples.json`、`public-interpretation.json`、`staging-robots.json`及`http/*.body`。统一探针/认证初始失败均保留。
- 本轮汇总与文件摘要：`verification-summary.json`、`evidence-index.json`。原始响应/运行日志保留本地，不自动纳入源码交付或Git；报告不包含登录token、密码或备份密钥。
- 当前执行入口：[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)、[项目地图](../../docs/payload-project-worker-map.md)、[操作手册](../../docs/payload-operator-runbook.md)。
