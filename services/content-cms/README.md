# Gachia Content CMS — 本机编辑后台

## 当前状态（2026-11-03，R26）

[R26本地发布前证据准备](../../reports/payload-evidence-preparation-2026-11-03-r26/README.md)新增`publish-prepare-evidence --run / --pin / --repo`：对已构建真实文字候选，单run锁串联来源→公网资源刷新→retain→固定导入O/公开A基线→本地兼容恢复→末次来源/拓扑重验。阶段回执/完整响应与辅助检查/日志整体pin，失败独立新尝试，有空/截断云写journal也拒绝；与当前公开A文字相同不发布。最终回归/安装/只读状态见报告。关闭本地编排工程子任务，不自动托管首次来源、build、上传或切流，不省略preview-retained/cloud-check/云预览和推广门禁；真实内容云发布仍未验收。首发继续优先实际Genshin文字编辑，不等待准确度。下方R25及更早为历史。

### R25 基线

[R25跨游戏Main来源重绑定](../../reports/payload-source-rebind-2026-11-03-r25/README.md)已实现并安装：`publish-source-rebind`用目标原始游戏来源与另一游戏完整成功发布的Main来源组合，只读重验固定UUID/公开A、pin/树/全部登记HTTP/模块/配置/拓扑，不造候选run/releaseKey、不覆盖原来源。47新增测试含实际loopback（云仍模拟），定向236、桌面547/Node304/Python49通过，23工具文件安装校验；CMS/PG健康、安全HTTP9/9、DB84draft/hold/0eligible及10Worker与R24不变，无内容/云写入或CMS重启。真实跨游戏云重绑定、首次/外部部署/恢复来源仍待验；下一无编辑工程项为现有本地发布前证据准备流程编排，减少手传pin，不自动上传/切流。下方R24及更早为历史，不覆盖本段。

### R24 基线

[R24发布后新UUID来源接续](../../reports/payload-source-advance-2026-11-03-r24/README.md)已实现并安装：`publish-source-advance`只读重验本机完整成功journal/封存来源、当前双UUID/模块/版本配置和全封存HTTP后登记新来源；Main下一轮retain可使用明确本机bundle/journal来源，无伪造GitHub artifact ID。33新增来源回归含真实loopback（云仍模拟），完整桌面495/Node304/Python49通过，22工具文件安装校验、安全HTTP9/9、DB84draft/hold/0eligible不变。无内容/云写入或CMS重启；真实云接续仍未验，首次/跨游戏共享Main/外部部署和恢复来源交接仍未全关。下一无编辑工程项为跨游戏Main新UUID的受控来源重绑定，不重复同游戏接续或staging调查。下方R23及更早为基线，不覆盖本段。

Payload/PostgreSQL已常驻本机；双游戏game/Main发布、续验及兼容恢复协议已安装，**真实编辑云预览/推广/恢复仍未验收**。内容准确度不作首发门槛，不制造演练变化。执行看[现行手册](../../docs/payload-operator-runbook.md)，状态看[R23 staging/外部入口核验](../../reports/payload-staging-inspection-2026-11-02-r23/README.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)，项目关系看[多Worker地图](../../docs/payload-project-worker-map.md)。

R23完成四历史staging限定调查：8origin/78完整响应，62动态noindex、8robots禁爬、30生产canonical HTML、12生产域名sitemap；20项NEXT_LOCALE cookie发现及公开cache差异原样记录，不放宽正式候选验收。GitHub部署变量false且无环境覆盖；Dashboard确认Main生产/预览builds关闭、另9Worker未连接Git。Builds/hooks API11次403及全账户hook/token未枚举边界保留，不能称账户级仅本机发布已强制。定向本地回归91/91、安全HTTP9/9、21安装文件未变、DB与10Worker不变；无安装/内容/云写入或CMS重启。下一无编辑可执行工程项为首次/新UUID来源交接与发布后接续，不重复staging调查。

R21来源命令保持；[R22](../../reports/payload-nte-source-handoff-2026-11-02-r22/README.md)补无候选历史来源的严格校验，当前两游戏game/Main来源均已登记。NTE实际刷新557公网静态/811本地响应/15精确版本HTTP，安装版模块source-only登记/选择通过，不捏造候选run/releaseKey或云发布回执。首次/新UUID仍需可信验证登记，没有latest或自动前移；每轮资源、基线、兼容恢复和云门禁保留。CMS163/typegen/typecheck、桌面458、既有Node304、Python49、Router35/typecheck、inventory为R22本机新鲜基线，非R23本机重跑；21工具文件一致，DB摘要不变、84draft/hold、0eligible。

R20已修复inventory漂移：当前版本在`inventory/2026-11-02`，2026-10-28历史输入不改；CI新增inventory与Router生成配置/映射/类型/测试，工程提交`a0634a9`已推送并通过实际CI41426588559。新鲜回归CMS163/typegen/typecheck、桌面387、既有Node304、Python49、Router35/typecheck通过；不是全站build/parity/浏览器重验。

R20新增并安装`publish-project-inventory`、`publish-assets-refresh`、`publish-recovery-local-prepare`，当轮20工具文件摘要一致；547份实际公网资源响应通过，恢复命令实际范围见R20。首次可信来源仍需维护者验证；R21新增登记/选择不等于一键从零发布。当前Mac精确workers.dev预览需既有本机SOCKS代理的单进程环境，见手册；未修改系统网络或关闭TLS。

CMS/PG健康，HTTP安全9/9；DB仍84draft/hold、0eligible，双游戏正式导出拒绝无合格记录，不是no_changes或发布成功。10Worker盘点前后无变化；推广保护仍7服务、每批仅game/Main。main未合并，两个云GitHub部署开关false；本轮无内容编辑、云写入或CMS重启。

私有R2密文与同机恢复仍沿用R17；R20补独立key复制校验工具/跨机清单，但缺独立可写介质/第二Mac，未复制真实key或验证跨机。见[灾备说明](../../docs/payload-offsite-recovery.md)。deepmerge仍1low、限定单用户loopback接受、11月16日前复核，沿用R19扫描，见[风险决定](../../docs/payload-dependency-risk-2026-11-02.md)。源码包不是运行数据/密钥备份。

## 历史实验与增量记录

本节以下全部为历史实验/增量说明。“未注册推广”“未接通执行器”“源码尚未提交/无CI”等为当批状态，不用于当前操作；SQLite与 `.local/<namespace>` 环境说明仅适用于隔离实验，不是当前桌面PostgreSQL运行设置。`inventory:check`已在R20修复，新生成仅写版本化当前清单，历史证据保留；临时HTTP测试拒绝占用正在运行的3100服务，不为复跑实验停机。

最新进展：兼容恢复制品已完成真实 Wrangler 封存及 762 个新 loopback 响应检查；公网验收模块已覆盖 Router 缓存/路由、托管 robots 前缀和页面原有索引政策。尚未上传恢复版本或注册生产推广，见 [恢复封存报告](../../reports/payload-recovery-seal-2026-11-01/README.md)。

最新续接进展：只读失败对账、兼容恢复检查、推广前证据检查已安装；独立推广续接协议不重新上传，模拟失败回归通过，但真实生产推广 transport 仍未注册。历史 757 份恢复 HTTP 证据重新核验，不是新的云端恢复。见 [推广续接报告](../../reports/payload-promotion-readiness-2026-11-01/README.md)。

最新发布进展：Genshin + Main 云预览适配器和三个持久命令已接通；真实 Wrangler dry-run 字节比对、762 个本地 HTTP 响应、68 项发布测试通过。尚无真实编辑变化，未上传/切流；生产推广仍待接通，不能把本地响应当作云候选验收。见 [云预览接入报告](../../reports/payload-cloud-transport-2026-11-01/README.md)。

本机发布增量：已安装候选检查、冻结源码、双目标构建与实际 loopback Worker 验收命令，见 [发布推进报告](../../reports/payload-local-publish-2026-11-01/README.md)。Genshin + Main 真实构建/14 个响应通过；尚无云端上传/推广，现有 CMS 内容未改动。

独立 Payload 3.92.1 / Next 16.4.2 / UI 3.92.1 应用。**已安装本机 PostgreSQL 编辑端；公众网站发布执行器尚未接通。** 不连接公众 D1/R2，不启用玩家账号。SQLite 仅保留给隔离实验，不是当前常驻数据库。

最新入口：[本机安装报告](../../reports/payload-local-install-2026-11-01/README.md)、[日常操作说明](deploy/desktop.md)。后台 `http://127.0.0.1:3100/admin`，84 条指南已原样导入；CMS 159/159、类型检查、15 项真实 HTTP/浏览器检查、联合备份恢复和服务重启持久性通过。内容准确度后置，GitHub 部署开关已关闭；本机候选导出不等于公众发布。T03/T04/T05 仍部分完成，全类型/全 owner 和平台权限收口不能据此关闭。

历史入口：[Payload 状态更新 R9](../../reports/payload-status-audit-2026-10-30/comprehensive-audit-2026-11-01-r9.md)。其真实切片、合成浏览器/Flight、220 个网络响应及旧 split fixture 121 个回归响应等证据保留，旧“PG 待实验/托管待选”状态已被本机方案替代；依赖风险未在本轮重扫。下文各批数据均为历史记录。

已具备五类限定草稿路径、三方审核及局部浏览器验收；合成协议覆盖 16 scope/5 owner，实际 Next loopback 接线验证 Main/NTE 分割归属和 Genshin 合成切片，不是全部 Worker 接入。真实 Worker 读侧、生产存储、激活、新游戏配置化及权威交接未完成。批量执行关闭，源码尚未提交/接入 CMS 专项 CI。

- [本地 shadow reader 运行契约与复跑说明](docs/shadow-reader-integration.md)
- [四任务执行、最终账本和 Main/NTE 网络证据](../../reports/payload-next-phase-2026-11-01/README.md)
- [T05 本地 ADR 第一版](../../docs/payload-production-adr-2026-11-01.md)
- [R9 真实切片、浏览器/网络及本地运行时证据](../../reports/payload-real-slice-2026-11-01/README.md)
- [T05 ADR v2 本地运行时实验边界](../../docs/payload-production-adr-2026-11-01-v2.md)

- [编辑浏览器夹具与清单](docs/browser-merge-acceptance.md)
- [合成 Snapshot/ReleaseMap 协议](docs/shadow-release-protocol.md)
- [序列化消费适配及边界](docs/shadow-consumer.md)
- [内容寻址文件与独立消费进程](docs/shadow-artifact-files.md)
- [真实材料类型预览与依赖缺口](docs/material-public-preview.md)
- [来源绑定的依赖核对计划](docs/dependency-review-plan.md)
- [关联角色摘要与媒体/链接依赖](docs/character-dependency-preview.md)
- [材料页面链接与 locale 策略](docs/material-link-policy.md)
- [材料类型 snapshot 边界](docs/material-snapshot.md)
- [媒体证据边界](docs/media-evidence.md)
- [完整材料依赖 Snapshot 边界](docs/material-complete-snapshot.md)
- [材料页面与 SEO 对账](docs/material-parity-audit.md)
- [本地材料路由 Probe](docs/material-parity-probe.md)
- [隔离材料 HTTP Probe](docs/material-http-probe.md)

## 隔离约束

- 在本目录运行 pnpm；此处有自己的 workspace 和 lock，不使用仓库根目录的 Next 补丁与 overrides。
- Node `^22.23.4 || >=24.22.1`；本批使用 Node 25.9.0。生产运行时须另行验证。
- 必须显式设置 `CMS_LOCAL_ONLY=1` 和至少 32 字符的临时 `PAYLOAD_SECRET`，否则拒绝启动。
- 数据仅位于本目录 `.local/<namespace>/`；namespace 不接受路径。数据库 URL 与媒体目录由代码构造，不接受远端地址。
- 禁止复用真实数据库、云凭据或真实玩家信息。本地 CLI 仅监听 `127.0.0.1:3100`；不要代理/转发到公网。
- SQLite `push: true` 仅适用于这里的可丢弃实验库，不是生产迁移策略。不要存放唯一副本的编辑成果。
- 本地适配器串行化同一进程的写事务，最多 64 个等待请求；不支持多进程同时写此库。schema push 计划事务执行并在提交前检查 FK，仅去除固定 Drizzle 版本连续重复的相同索引语句；生产须另建显式迁移，不能依赖这一开发态兼容层。

## 本地验证

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm inventory:check
```

媒体证据 manifest 可用以下命令校验；只要仍有 `rights: unverified`，命令会失败并保持 `publishable=false`：

```sh
pnpm media:check ../../reports/owner-media-manifest-2026-10-31.json
```

构建及 HTTP 验证需先按下一节设置 `CMS_LOCAL_ONLY` 和 `PAYLOAD_SECRET`，然后运行 `pnpm build && pnpm test:http`。HTTP 验证临时占用 3100 端口；已有服务时拒绝执行，完成后停止自己的进程。

第七批 77 项测试、类型检查、构建与 HTTP 验证通过。第五批 graphql-scalars 高危命中已通过限定 Payload GraphQL 依赖边至 2.0.1 处理并补回归；第七批锁文件未变，重新扫描仍有 1 低危（deepmerge 公告未提供修复版本），未取得生产放行。旧 drizzle-kit 加载器依赖边已精确移除，旧库升级/重启与原子 DDL 另有回归。安装或 CRUD 成功不等于安全审查通过。

集成测试自行生成临时 secret、独立测试 namespace 和合成账号，完成后关闭连接并删除自己的测试目录，不读取或删除 development 数据。

## 启动管理界面

先在当前终端设置隔离环境及临时密钥（不要把真实密钥提交到仓库）：

```sh
export CMS_LOCAL_ONLY=1
export PAYLOAD_SECRET="$(node -e 'console.log(require("crypto").randomBytes(48).toString("hex"))')"
export CMS_ADMIN_EMAIL='local-admin@example.invalid'
read -s 'CMS_ADMIN_PASSWORD?Local admin password (16+ characters): '
export CMS_ADMIN_PASSWORD
pnpm local:admin
unset CMS_ADMIN_PASSWORD
pnpm dev
```

密码输入示例适用于 macOS zsh。已存在用户时 bootstrap 拒绝更改账号；后续启动应使用同一开发 secret（更换会让已有会话失效）。通过 `http://127.0.0.1:3100/admin` 登录。默认首用户注册接口被覆盖为拒绝；初始化只通过本地 CLI。没有默认密码，没有接入邮件找回。

## 当前实验模型

- Users：admin 管理账号与游戏，editor 编辑草稿，reviewer 标记编辑出版状态。编辑者不能创建账号或提升自身角色。
- Games：稳定 key、独立 region、多语言名称和旧注册元数据；尚未导入真实游戏。
- Content records：关系、稳定标识、旧 URL、原始记录、原格式正文、多语言、证据/hold 和版本历史。通用 JSON 仅用于验证保真；生产必须按内容类型完成校验与字段设计。
- Media：仅本地 PNG/JPEG/WebP；全部读写需登录。媒体 HTTP 访问、图片处理、大小限制与 Workers/R2 行为还需完整验证。
- Migration sources：只读原文暂存，含来源路径、字节摘要和不可变快照身份；普通 API 即使管理员也不能写。所有游戏仍由旧来源维护，不提供网站发布能力。
- Migration records / batches：只读记录修订与完整导入批次；记录有稳定身份、显式语言字段、FAQ 数组、图片引用字段、原文和审阅信息。公共字段/结构化投影不是完整类型模型，普通 API 包括管理员均不能写，不允许从这里直接发布。
- 所有内容即使 published 也不提供匿名读取。审核状态不触发快照或网站发布；hold 默认 true，不因一次编辑出版而解除。

当前已验证本地编辑锁、审核者版本恢复、显式事务、合成数据的冷备恢复和原生队列只读探针；没有完成生产并发/完整备份验收。当前未实现：完整的全游戏类型化语义迁移、公开 DTO/快照、发布映射、生产审批、Worker 读侧、外部调度。不要把本地 CRUD 或记录候选通过当成统一维护已交付。

其中版本恢复验证针对原实验 Content records；第五批新 editorial-drafts 只保留历史读取，刻意禁用恢复，防止绕过来源和 hold 规则。下述工作台接收不会自动写入 Games 或原 Content records。

## 全游戏只读接收

```sh
pnpm intake:plan
```

该命令先检查库存，生成来源及字段画像，不写数据库。审阅 `reports/payload-migration-2026-10-28/intake-plan.json` 后，在已设置本地 opt-in/secret 的终端执行：

```sh
export CMS_LOCAL_NAMESPACE=migration
pnpm intake:local
pnpm intake:local
```

首批实际来源共 116 份：16 个注册记录、95 raw JSON、4 个独立 data.ts 和 1 个审阅门禁。只允许写入本应用的 migration namespace；不修改 development 或网站数据库。快照保留原文而非立即转换成文章；单来源最多 2 MiB，超限拒绝，不截断。该限额只是本地迁移区限制，不保证 D1 支持相同记录大小。

每个来源路径与字节摘要构成唯一身份，重跑复用完全相同记录，变更产生新快照。整批预检失败不开始写入；写入中途失败可能留下部分不可变快照，重跑可继续。全部完成后才在 `.local/migration/` 写出带 planDigest 的回执；不能把旧回执当作新计划成功。原来源删除不会自动删除暂存或撤回网站内容。没有永久双向同步。

实际本地迁移库未创建账号；要在管理界面检查暂存，可在相同 namespace 中使用 `local:admin` 初始化自己的本地账号，再启动 dev。不要使用真实站点管理员凭据。若切回常规试验，显式 `unset CMS_LOCAL_NAMESPACE`。

`pnpm test` 包含独立临时目录的冷备恢复测试，使用关闭数据库后复制的方式；它不是可直接用于线上数据库的备份命令，不读取或删除实际 migration 库。

## 记录候选与批次差异

完成来源接收后，在本目录执行：

```sh
pnpm records:plan
# 审阅 reports/payload-migration-2026-10-28/record-plan-v2.json，保留本地 opt-in/secret
export CMS_LOCAL_NAMESPACE=migration
pnpm records:local
pnpm records:local
pnpm records:diff <before-batch-key> <after-batch-key>
```

`records:plan` 不写数据库；`records:local` 要求计划完全匹配、引用来源已保存且能重算得到相同候选。稳定身份按游戏/类型/旧 ID 生成，不使用数组位置；兑换码额外包含地区。修订摘要包含规范化记录和映射/政策版本，其他记录更新或数组重排不会让未变记录生成新修订。所有写入是不可变候选，未改变原来源或网站。

第四批当前映射为 `legacy-records-v2`，实际保存 3,440 个候选单元：1,305 个公共字段、2,050 个仅身份、85 个结构化字段单元。该总数包含 34 个具名区块，不能全部算独立文章。绿梦有 51 个单元（13 个角色、7 个有 ID 核验项、31 个区块）。v1 的 3,206 条修订及 `record-plan.json` 保留，新计划写入 `record-plan-v2.json`；库中累计 6,646 条修订不是 6,646 个当前内容。

四个 data.ts 使用白名单 AST 提取，不执行模块、调用函数或加载其导入。只接受显式契约中的数据导出；未知导出、表达式、重复身份或缺失预期数据拒绝导入。有 ID 的数组逐条拆分，没有 ID 的列表按导出符号保留为具名区块，不用标题或数组下标伪造稳定身份。函数、重导出和派生常量单列 `reader-code`，不宣称已转换；内联模块任何字节变化都会附加来源复核，即便记录内容不变。

NTE 抽卡对象拆为 banner 候选及 FAQ 区块；图片来源按类别/旧 ID 拆分，空 URL 原样保留，不下载素材、不判定可用性或版权。攻略 FAQ 使用原始字段约定：无后缀 question/answer 是英文，Zh/Ja 分别是中文/日文；绿梦 FAQ 的无后缀字段是中文。未知 FAQ 字段直接要求适配，缺失/空字符串/不完整问答不自动补全。FAQ 来源位置用于追溯和区块内顺序，不是跨版本稳定条目 ID。

缺译保留缺失，不复制中文；候选路由只依据源码所有权推导，全部不可索引，不能当成真实 URL/别名保全证明。当前 116 份来源没有 deferred 不等于全部业务已覆盖：具名区块细分、未映射字段、派生逻辑以及页面 TSX 内联事实仍待逐类对账。

导入中断可能留下部分修订，但不会提前建立完整批次。重跑验证并复用已有修订，再创建完整批次标记。`records:diff` 仅比较已经完整保存且摘要有效的批次；同批次无差异，变更产生待审项，未变化的已有翻译可保守标记复核。完整空数组要求撤回审阅；来源缺失只要求来源审查，均不自动删除。映射/政策改变时拒绝直接比较，需显式重建比较基线。差异读取规范候选正文，不以管理界面中的重复展示字段作为判断依据。

计划保存来源覆盖与未映射字段，回执和差异保存在 `.local/migration/`。第五批新增下述差异审核 UI，但没有接管指针或公开发布动作；Migration batches 不是未来网站的 Snapshot/ReleaseMap。

## 统一审核与受控草稿

保持本地 opt-in/secret，在已经接收完整候选批次的 migration namespace 执行：

```sh
export CMS_LOCAL_NAMESPACE=migration
pnpm review:stage 7069991e56680742fbf9677d04596d7d70905092f7a14849333dcd775158a8f3
# 之后的同映射/政策版本比较：review:stage <target-complete-batch> <base-complete-batch>
```

该命令只暂存审核项与完整审核清单，不批准内容、不创建草稿。重复运行核验并复用已有项；部分写入后可继续。回执为 `.local/migration/review-<timestamp>.json`。不要用 v1/v2 不同映射版本直接做内容差异。

用自己的本地账号登录后，从 `Content review` 进入 `Review items`，按 gameKey/runKey/draftKind 筛选，检查字段差异与 blockers。reviewer/admin 可在条目详情的 Decisions 关联区创建决定，填写至少 10 字符的具体理由，选择 `accept-draft` 或 `reject`。editor 只能查看审核与编辑已接收草稿；暂缓即不创建决定。拒绝不会撤回网站内容，终态决定不能修改或删除，尚无纠正/重开流程。

`accept-draft` 只对四种受支持候选生效：guide、character 公共文本、faq-section、asset-reference。当前 v2 共 1,307 项有接收路径，2,133 项继续阻断。只有审核决定与草稿同时提交才成功；已有相同稳定身份草稿时返回 409，不覆盖人工修改。没有自动批量批准，真实库目前决定/草稿均为 0。

进入 `Editorial drafts` 编辑显式语言文本、FAQ、图片引用和备注。hold 始终 true、state 始终 draft，来源和类型不可改；版本可读但不能恢复。正文是原格式文本，默认 unclassified，不渲染 HTML；图片只保存 URL，不下载。未映射字段不丢弃，但仍未完成技能/数值等业务建模。接收为草稿不转交权威、不发布，也不说明内容事实已核验。

已有草稿的后续更新走下一节专用流程，不重复使用首次接收入口。仍缺：撤回处理、审核纠正/重开、批量操作、完整类型契约、正文安全转换、Snapshot/ReleaseMap、各 Worker 读侧及生产并发验收。

## 已有草稿的三方更新

1. 在迁移区接收新完整候选批次，再运行 `pnpm review:stage <target-complete-batch> <source-baseline-batch>`。目标差异的 beforeRevision 必须匹配草稿已接收的来源；跳过中间更新时需按当前来源重新生成比较，不能随意选一条历史审核项。
2. 在 `Draft Merge Proposals` 创建比较，选择已有 Draft 和目标 Review Item；也可从草稿或审核项的 Merge Proposals 关联区进入。editor 可以准备比较，保存不修改草稿。已有相同快照方案时使用已有记录，不重复创建。
3. 检查 Comparison：source-only 采用来源、editor-only 保留人工、converged 保留一致结果；conflict 必须逐项决定。FAQ 列表与图片引用分别整体比较，不能按位置混拼。
4. reviewer/admin 从方案的 Decisions 关联区创建决定。选择 apply 并填写理由，在 Choices 为每个 conflict 选择字段与 current/incoming；不要为非冲突字段增加选择。dismiss 仅否决这一比较方案，不改草稿或来源基线。editor 不能提交决定。
5. 应用成功后保留人工独立修改和编辑备注；新正文会重置格式为 unclassified。当前已接收来源通过只读 sourceReviewKey 与 mergeHead 追踪，原始 reviewKey/candidateRevision 不变。下一次比较以新的来源基线计算，仍保持 hold 和 draft。

比较后任何编辑都会使旧方案失效；遇到 409，应检查最新草稿和来源后重新准备方案，不重试覆盖。编辑锁会阻止应用；相同决定不能重复提交，并行分支只有一个能在原基线上应用。原审核项已明确 reject 时不能借合并绕过；已关闭或 dismissed 的合并方案可走下一节重新审核，但没有初次 intake reject 纠正、撤销已应用合并或版本恢复流程。正文差异按字段而非行合并；如要手工组合冲突内容，可保留 current 后正常编辑草稿，不能伪造审核载荷。

真实迁移库尚未人工接收任何草稿，因此真实合并方案/决定均为 0；本批验收只在独立合成库操作。不要把本地更新能力视为全游戏已接管、可上线或多 Worker 一致发布。

## 关闭过期方案与重新审核

在合并方案详情的 `Workflow Events` 关联区创建事件，或进入 `Merge Workflow Events` 选择 Proposal。只有 reviewer/admin 可以操作，必须填写具体理由；editor 只读事件历史。

- `close`：关闭尚未决定的方案，包括比较后已过期的方案。不编辑草稿、不推进来源、不生成版本；关闭后不能再 apply。已 dismiss 的方案无需再关闭。
- `reconsider`：仅允许 closed/dismissed 方案。重新读取最新草稿与来源并生成替代比较，事件的 Replacement 可进入新方案；原方案及其决定不改。草稿没变也可以重新比较，无需改备注来制造新身份。
- 新方案须重新检查所有冲突并创建新的 apply 决定；生成替代方案不代表批准。再次过期则关闭该新方案再重审。每个方案同类事件只能创建一次，重复操作返回 409。
- 如来源基线已被其他更新推进，重新比较仍会拒绝；需要准备与当前来源匹配的新差异。初次 Review Decision 已 reject 的内容保持阻断，不能用重审绕过。
- 已 apply 的方案不能 close/reconsider；撤销已应用内容和版本恢复尚未实现。关闭也不是撤回网站内容，网站权威源不变。

方案的历史比较、父方案键和事件链均保留；工作流事件不可修改或删除。HTTP 和真实本地适配器测试覆盖权限、并发、原子回滚及重试审核链。本批未增加批量状态看板或定时扫描，也未重复浏览器手工验证新入口。

## 本地任务队列边界

Payload 原生 `verifySource` 任务只验证已保存来源的存在性、摘要和字节数，不抓取外网、不更新内容、不发布。测试通过特权 Local API 显式入队和执行，默认不会自动执行；成功日志保留，来源缺失报错，最多重试一次（共两次尝试，50ms 本地测试退避）。这些参数不是生产调度策略。

HTTP run/queue/cancel 权限全部关闭，连管理员也不能通过 HTTP 执行任务；未配置 autoRun、cron 或外部调度。生产去重、分布式抢占、死信处理、告警及运行时选型仍待实现，不能把本地顺序执行成功当成多 Worker 队列可用。

## 清单

`pnpm inventory` 从仓库已跟踪文件生成全游戏文件覆盖表。使用 TypeScript AST 读取字面量注册表，不执行仓库业务模块。遇到未知表达式或未注册 scope 失败。`pnpm inventory:check` 检测已记录文件/摘要漂移，保留捕获时的 commit 来源，不因无关文档提交失败；新增未跟踪业务文件在纳入 Git 之前不在扫描范围，不能以检查通过证明语义覆盖。

完整计划见 [实施计划](../../plans/payload-unified-maintenance.md)；最新验证证据见 [第七批记录](../../reports/payload-migration-2026-10-29/batch7.md)，前六批报告保留历史结果。

## 跨游戏维护规划（第八批）

最新：[第八批批次规划](../../reports/payload-migration-2026-10-29/batch8.md)。在已设置本地环境变量并停止其他写入进程后运行：

```sh
export CMS_LOCAL_NAMESPACE=migration
pnpm maintenance:plan <完整审核runKey> all 50
pnpm maintenance:plan <完整审核runKey> nte,genshin 20
```

输出 `.local/migration/maintenance-<planKey>.json`，按游戏 scope、内容类型和状态分组，以 1–200 条组成稳定身份的清单。未知游戏、非法大小、不完整批次、损坏的审核投影拒绝生成。分页读取完整集合，并在同一事务内核验来源及状态；只适用于单进程本地库，运行前保留冷备。Payload 启动仍可能执行开发 schema push，因此不应把 CLI 启动视为文件级只读。

状态为 intake-review（等待人工接收审核）、existing-draft-review（已有草稿，需更新复核）、blocked（缺适配器或撤回流程）、accepted-held、rejected。已有草稿不代表可合并；比较、冲突和批准仍走已有验证流程。未映射来源另列 sourceBacklog，不因零候选而消失。

这是 **不可执行的规划快照**，不是队列、不自动批准、不创建合并提案、不发布、不更新 Worker。数据变化后重新生成；planKey 不是执行授权。当前没有原生 UI 看板和多 Worker 协调器。真实数据库验证使用副本，原库不启动、不写入。

## 共享材料契约与覆盖检查（第九批）

在已配置本地环境、保留备份并停止其他写入进程后：

```sh
export CMS_LOCAL_NAMESPACE=migration
pnpm contracts:coverage <完整候选batchKey>
```

输出 `.local/migration/contracts-<coverageKey>.json`，包括游戏/类型矩阵和逐条保真预览。`contract-preview` 仅表示契约转换通过，**不是 draft intake 支持**。材料仍保持历史审核阻断，不可自动批准。完整来源在单事务内核验，CLI 启动仍可能开发态 schema push；真实验证只启动副本。

共享 `material-contract-v1` 覆盖本次 12 个非空 scope、537 条材料。未知字段或类型错误阻断；缺失/null/空字符串/空数组、多语言和数组顺序均保留。参见[契约字段与接入门槛](../../docs/payload-material-contract.md)、[第九批报告](../../reports/payload-migration-2026-10-29/batch9.md)。

## 材料接收与更新（第十批，显式 v2）

先备份并停止其他进程，再为指定的完整候选批次生成新策略审核项：

```sh
export CMS_LOCAL_NAMESPACE=migration
pnpm review:stage --materials-v2 <完整目标batchKey>
pnpm review:stage --materials-v2 <完整目标batchKey> <完整基线batchKey>
```

不带开关仍按 review-v1 运行。v2 不覆写旧审核项，不自动创建草稿；首次接收须由 reviewer/admin 在 Review Decisions 中批准为 held 草稿。相同修订在其他策略被 reject 后不能靠 v2 放行。重复暂存复用同一批次；首次生成 v2 会新增整批审核项，不代表内容数量翻倍。

在 Editorial Drafts 的 material 草稿中编辑 Material Fields：保留 25 个不同 field 行，选择 absent/null/value；value 使用对应的 Text、Number（rarity）或 Entries（有序列表）。空字符串使用 value+空 Text，空列表使用 value+无条目，清除值时同时清空不适用的值槽。id、游戏及来源不在这里编辑。

来源更新后，用对应基线/目标生成 v2 差异，再创建 Draft Merge Proposal。材料冲突字段形如 `material.name`、`material.uses`；每个冲突选择 current 或 incoming，由 reviewer/admin 应用。有序列表按整个字段比较，不自动猜测条目配对。过期方案可 close/reconsider；所有结果继续 hold，不发布。

本批只在真实迁移库副本暂存 v2，原迁移库未升级或新增 v2 项。副本 v2 支持 1,844 条（原 1,307 + 材料 537），阻断 1,596；真实内容获批数仍为 0。详见[第十批](../../reports/payload-migration-2026-10-29/batch10.md)。第九批 `contracts:coverage` 仍是契约预览报告，不是审核策略的实时支持数。

### 材料空文本表示（第十二批）

文本字段 state=value 时，空 Text 槽（包括 Payload 未触碰时的 null/缺失）表示空字符串，无需输入后再清空。state=null 才表示语义 null，state=absent 表示源字段缺失；名称/类型等必填字段仍拒绝空字符串。此规则不适用于数字槽，列表仍用 value+空条目列表表示空数组。
