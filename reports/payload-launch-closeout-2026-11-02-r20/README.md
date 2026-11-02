# Payload R20：四项首发任务执行与收口

日期：2026-11-02。遵循R19建议顺序，优先交付可用的本机编辑/发布链路；内容事实准确度、全类型迁移不作首发门槛。**四项均已推进，但只有前两项的本轮工程子任务完成；独立灾备和真实内容云发布不能虚报完成。**

## 1. 当前清单、CI和多Worker口径：本轮子任务完成

- `services/content-cms/scripts/inventory.ts`改为版本化当前清单`services/content-cms/inventory/2026-11-02`；`--check`复用捕获时sourceCommit，不因文档提交产生假漂移。来源、文件新增及修改仍重算；两项回归验证漂移拒绝、旧报告不被改写。
- 2026-10-28历史inventory/coverage摘要逐一对照不变；没有覆盖fixture输入来凑绿。新清单承认11个shadow/reader、4个候选摘要及8个资源路径的既有差异，不是本轮内容编辑。
- `.github/workflows/payload-verify.yml`加入inventory检查、Router生成配置/部署映射/typecheck/测试；精确维护分支、只读权限、无secrets/部署/真实manager约束保留。
- 工程16文件提交`a0634a9b2939f4933508c54c88d97caf7f773f11`已推送`codex/payload-unified-maintenance`；真实Linux CI [41426588559](https://github.com/aieasygames-alt/gachia/actions/runs/41426588559)成功，新增步骤实际执行，不沿用旧绿灯。
- `publish-project-inventory`实际观察**10 Worker**、3个额外staging，前后状态一致；推广保护仍固定**7服务**，写入组仍仅`[genshin,main]`或`[nte,main]`。观测不扩权，也不证明另三staging的全部HTTP/noindex或外部构建入口已验。

## 2. 资源与兼容恢复证据命令化：本轮实现/安装/限定实测完成

新增`scripts/desktop-local-evidence.mjs`，接入Python manager和固定安装依赖闭包：

| 命令 | 作用 | 实际结果 |
| --- | --- | --- |
| `publish-project-inventory` | 固定账号/服务GET、秘密值脱敏；无写方法或任意目标 | 源码及安装版实际运行通过，10服务前后无变化 |
| `publish-assets-refresh` | 核验旧来源/当前UUID/远端game模块；重新采样已登记game/Main静态字节 | **547份实际公网响应**，status/大小/SHA/无cookie及前后拓扑通过；返回新evidencePath/pin |
| `publish-baseline-capture`（复用） | 精确当前Main UUID JSON与导入O分离 | 实际275079字节、绑定当前Genshin/Main UUID的公开基线通过 |
| `publish-recovery-local-prepare` | 复制可信旧树、下载精确当前云runtime替换派生副本、保留新旧静态并集；实际loopback及精确版本对照 | **760份本地响应**和**7份精确版本网络对照**通过，返回新恢复证据/pin；云写入为0 |

恢复计数：Genshin262静态+三语言指南/站点图=266个200；Main491静态+JSON/站点图=493个200，另有停用账号API404并核验`ACCOUNT_FEATURES_DISABLED`/no-store。合计759个200+1个预期404=760本地响应；7份对应动态精确版本响应另计，不混成767个本地200。metadata/JSON-LD/正文指纹、robots、静态字节和上一公开JSON均校验，实际body留存在私有release目录。

本轮复用既有Genshin**诊断候选**以验证新命令，未重新构建公众应用。它仍`productionReady=false`/`cloudRecoveryAccepted=false`，**绝不可上传为正式编辑**。当前实际公开内容与导入O相同，本轮没有制造A/B；恢复A而非O由新增双游戏隔离测试及R14历史演练共同覆盖，不冒称新的云A/B验收。NTE新命令路径有隔离回归，尚未本轮重新执行NTE实际云/loopback准备。

新增回归覆盖两游戏A≠O、跨game/UUID错配、源树篡改、immutable冲突、第二目标失败、内容/拓扑变化、网络/cookie/hash/module拒绝及零云写能力。失败保留diagnostic，不自动重试或覆盖旧证据。首次可信资源/完整旧树来源登记仍需维护者，**不是从零一键发布**；后续真实候选还需双候选+双恢复的精确UUID云预览、时效、推广及公网验收。

### 网络故障及实际修正

首次资源刷新已采547份后，末尾只读Cloudflare快照返回500，因此该轮仍判失败，body/diagnostic保留。随后显式启动新只读观察轮，完整刷新通过，没有重放云写入。

精确workers.dev直连失败：Node记录`UND_ERR_CONNECT_TIMEOUT`，系统解析返回非预期地址；macOS已配置PAC，但Node默认不使用。读取既有本机PAC仅确认SOCKS5 `127.0.0.1:1080`；curl和当前Node25.9.0通过该现有代理均取得精确版本200。实际基线/恢复命令只在自身进程使用`NODE_USE_ENV_PROXY=1`、`HTTPS_PROXY=socks5://127.0.0.1:1080`及loopback/API/正式域名NO_PROXY。未改系统DNS/代理、未开新代理、未关TLS校验；Node SOCKS支持仍实验性质，其他机器/版本须重新核验。手册记录此环境，不默认所有机器同端口。

最初同时执行同一run的两个只读操作，被operation.lock拒绝；随后串行执行。安装脚本初次在持有维护锁时调用manager smoke，同样被锁拒绝，脚本回滚自身工具替换；修正为锁内Node smoke、锁外manager smoke后安装成功。没有删除锁、日志或伪造成功。

### 持久安装

在既有maintenance.lock下备份原文件、暂存校验全部依赖、原子替换并重新核对。**19模块+manager共20文件**摘要与已测试源码一致，安装版缺参拒绝/固定目标smoke通过。CMS应用未覆盖、未重启，运行数据未改；回滚/最终安装日志均保留。

## 3. 独立密钥与跨Mac：工具/流程推进，实际验收未完成

实际只发现只读应用DMG，无独立可写密钥介质或第二Mac执行上下文。未复制真实key，未将其放入iCloud、聊天、报告或密文桶。

新增`payload-key-custody.py copy|verify`：拒绝同文件系统、链接、公开权限、非32字节及覆盖；排他写入、fsync并重新核对，不输出key字节。4项隔离测试通过；仅不同文件系统的副本也不等于物理独立/离线异地保管或跨机启动。灾备文档补第二Mac重建、路径重定位、PG/媒体/管理员/loopback/持久性验收清单。

R17私有R2实际密文往返与同机隔离恢复仍有效，本轮不重复。**L03/T11/P7保留部分完成**；需真实独立介质与另一物理Mac后才能补验，默认授权不等于设备存在。

## 4. Genshin首次/第二次，再NTE：正式候选检查完成，发布未执行

安装版manager分别实际执行两个游戏的正式`content-export`，均以**`No eligible records`**拒绝（exit1）。这不是`no_changes`成功结果，也不是构建或云发布成功。只读DB确认84条仍draft/hold、eligible published=0，逻辑摘要不变。

没有真实预期编辑输入，故未制造文案、批量清hold、上传诊断制品或故意破坏第二Worker。真实云preview/promotion、连续发布、云partial failure/兼容恢复、真实普通请求全程releaseKey仍未验。**L01/L02/L04/L05及T04/T06整体不关闭。**

## 5. 验证与项目边界

| 验证 | 本轮结果 |
| --- | --- |
| CMS typegen/typecheck与测试 | 通过，**163/163** |
| 桌面发布测试 | **387/387** |
| 既有Node发布测试 | **304/304** |
| Python发布/恢复测试 | **49/49**（4+14+3+9+11+8） |
| Router生成配置/部署映射/typecheck/测试 | 通过，**35/35** |
| 当前inventory与历史摘要 | check通过；旧两文件摘要未变 |
| 实际GitHub CI | `a0634a9`，41426588559成功，新增步骤已执行 |
| 安装与本机服务 | **20/20**工具文件；CMS/PG healthy/loaded，安全HTTP **9/9** |
| DB | `c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`，84draft/hold、0eligible，与R18/R19不变 |
| 云 | 10Worker只读盘点前后一致；0云写入；main未合并、GitHub两部署变量false |
| 未新重跑 | 全Next build/全量parity/浏览器、CMS依赖audit、全站SEO；R19的1low依赖风险沿用至11月16日前复核 |

维护工作区仍为`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`；默认旧脏checkout`/Users/robert/Documents/gachia`未修改/合并/重置。本轮Git仅推专用维护分支，没改main、部署开关或扩大生产权限。工具源码/锁/测试已交付，但R17密文与R16源码包不会自动包含本轮升级；需要新机恢复时用R20可信Git提交/完整交付，不把旧包当最新代码。

## 6. 剩余任务与最快执行顺序

1. **真实编辑就绪即优先Genshin云验收。** 一条实际打算公开的既有指南文字即可，不等待事实准确度或全类型迁移；只解该条hold并显式published，随后按手册新run/备份/基线/资源/兼容恢复/双UUID预览/推广/公网取证。再做真实第二次及恢复，沿用到NTE。没有编辑输入时不空跑构建/上传。
2. **独立介质/第二Mac一旦具备，完成L03。** 独立找回key、认证解密、实际应用启动/管理员/媒体/PG/重启验收；不重做同机或R2往返代替。
3. **减少首次可信来源交接成本。** 当前命令已代替手填HTTP成功回执，但首次来源登记与新版本来源接续仍需维护者；需要完整交付前再做限定自动化，不重写整个reader。
4. **后续平台范围保留但不阻塞首条文本发布。** 全类型/媒体权利账本、所有scope交接、完整UI/队列/告警、新游戏配置化、完整请求ReleaseMap及旧入口退役；不新增未经批准的媒体、不启用玩家账号、不远程暴露CMS。

P0–P5/P7仍部分完成，P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。T12/L06本轮工程子任务提升，不因测试增长将完整平台标为完成。详见[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)、[多Worker地图](../../docs/payload-project-worker-map.md)、[操作手册](../../docs/payload-operator-runbook.md)。

## 7. 证据索引

- 工程：`release-tests-final.log`、`cms-router-verification.log`、`inventory-after-freeze.log`、`historical-inventory-before.json`、`github-ci-success.json`/`.log`。
- 实际命令：`assets-refresh-contextual.json`、`baseline-capture-proxy.json`、`recovery-source.json`、`recovery-local-prepare.json`、`command-evidence-summary.json`；body及规范pin留在返回的私有release目录。
- 安装/本机：`installation.json`、`installed-manager-smoke.json`、`installed-integrity.json`、`local-final.json`、`local-http.json`。初次锁拒绝及修复日志保留。
- 云/环境/候选：`project-inventory.json`、`project-inventory-installed.json`、`cloud-final-check.json`、`preview-network-diagnostic.json`、`preview-node-existing-proxy.json`、`disaster-recovery-environment.json`、两个`export-*.log`。
- 汇总：`verification-summary.json`及非循环`evidence-index.json`。原始响应/日志仅本地保存，不把密钥、DB、私有媒体、原始发布日志纳入Git；报告不包含token/密码/key值。后续文档提交的CI身份另存交付记录，不能把a0634a9的run误认成验证未来提交。
