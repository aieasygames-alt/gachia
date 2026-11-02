# Payload R22：NTE 当前版本来源交接

日期：2026-11-02。继续R21之后的下一可执行工程项，缩短真实编辑出现后的发布准备；不以事实准确度、翻译补齐或全类型迁移阻塞首发。

**NTE当前game/Main来源已实际登记，安装版模块source-only选择通过。L05/L06当前来源交接子任务完成，真实编辑云发布仍未验收。** 没有创建候选run、releaseKey或编辑输入，未上传诊断制品，未改变网站Worker或在线内容。

## 1. 解决的问题

R15的NTE保留了实际资源/HTTP/恢复证据，但没有可供R21普通登记CLI使用的候选run。不能为复用该证据伪造候选、retention回执或releaseKey。另核实R15两份`worker.js`均为2278字节的构建入口，而非当前Cloudflare上传后的完整runtime；不能仅凭入口文件pin将其登记为当前云模块。

新增内部`registerHistoricalSourceCatalog`，配合既有`selectSourceCatalog`，允许严格的`historical_local_recovery`来源：

- 原始R15 proof、inventory、完整树及资产证据逐一验pin；历史文件不改。派生副本仅允许`worker.js`差异，替换为当前精确云UUID下载的runtime。
- 对派生副本重新启动真实loopback Worker，保存HTTP正文/状态/长度/SHA，核对完整已登记静态、三语言指南、body/metadata/JSON-LD/media引用、robots/cache、sitemap、Main JSON及账号停用接口。
- Main来源必须匹配当前版本绑定的公开A，而非仅匹配导入O；登记/选择都再次下载双模块，读取精确版本Main JSON及六份动态对照，比较HTML指纹、索引规则、cache、状态/类型和非HTML正文。
- 使用原固定UUID私有目录，manifest最后排他写入；所有来源/pin/HTTP/当前模块及前后七服务拓扑均重验。不新增通用CLI，不允许没有真实编辑的候选，不扩大写入范围。

源目录仍依赖私有历史证据，不是自包含备份或外部签名批准；`productionReady=false`、`cloudWrites=false`，不代表后续候选资源/恢复/云预览门禁已通过。

## 2. 本轮实际网络与本地证据

| 项目 | 实际结果 | 限定范围 |
| --- | --- | --- |
| 当前UUID | NTE `cb854ebe-544d-40b6-9217-5df329a8a1cb`；Main `3efd4103-7156-484b-86d8-a28853a668c8` | 不是新上传版本 |
| 静态资源刷新 | **557/557**，NTE116 + Main441 | 公网Router实际GET，核对已登记字节；不是完整Cloudflare资产清单 |
| 新loopback采样 | **811/811**，NTE295 + Main516；810个200 + 1个预期账号停用404 | 使用下载runtime及可信历史静态派生树，无应用重建 |
| 精确版本HTTP | **15份**，baseline1 + 登记7 + 选择7 | 三语言指南、双sitemap、Main JSON、账号停用；不算新候选验收 |
| 完成的云模块下载 | **7次**，资源刷新1 + runtime准备2 + 登记2 + 选择2 | multipart/body保存于私有诊断目录，失败读取不计入通过数量 |
| 来源实际登记/选择 | 安装版模块通过，source/manifest pin一致 | source-only inspection，无NTE候选run；不是manager真实候选CLI验收 |
| 本机状态 | healthy/loaded、安全HTTP **9/9**、DB摘要不变 | 84draft/hold、0 eligible，不重启CMS、不写内容 |
| 项目观察 | 10Worker前后及与R21一致 | 推广保护仍7服务，写入目标仍game/Main；另3staging仅观察 |

当前Main NTE JSON为600219字节、53篇指南，SHA为`0f2427eb8d971895220b28ccce923acf2bd9c214055eba1dfd2a5964c4ed3c3e`。实际A仍等于O；本轮没有制造云A/B，A≠O只由隔离测试证明。三张本地PNG随原HTTP证据核对；页面media引用比较不等于重新抓取/批准第三方图片权利。

当前runtime SHA：NTE `49c71c73771ede2f16c1fe9ebd3baab21b86f88371a3f34eb863248226d08fc3`；Main `4448b3ccc07aa87781dacbd6e5e7c585356f994f787d9fbcfbeeed4d07d97cb4`。派生树摘要分别为`dff8b1e2222a0836188a203f7d47bcc2be2ce0374ed0dd24a4592dd0307d2402`和`13449beec80e1b4d856184df4beaf66a2caf9097ea2ab0eacd2cfbeb15750c69`。

### 失败与续接

首次流水线在557静态/811本地响应通过之后，登记前控制面读取超时；随后安装版登记在NTE模块正文读取超时。两次均保留独立diagnostic，没有写入可选择条目。最后一轮仅重新做只读登记/选择并通过，不重采557/811、不放宽30秒网络限制、不关TLS或改系统网络，不把失败的HTTP headers视为完整模块成功。

精确workers.dev沿用当前Mac既有SOCKS5代理的单进程环境，API/正式域名/loopback直连；没有新增OAuth grants。来源manifest及原始multipart/正文均留在私有目录，详见本地`command-evidence-summary.json`，不入Git。

## 3. 测试、安装与交付

| 验证 | 本轮新鲜结果 |
| --- | --- |
| 来源目录隔离回归 | **63/63**，比R21新增24项历史来源/原树与派生树/正文/runtime/覆盖/当前云对照拒绝测试 |
| 桌面发布全集 | **458/458** |
| 既有Node发布测试 | **304/304** |
| Python发布/恢复测试 | **49/49** |
| CMS | **163/163**，typegen/typecheck通过 |
| Router/inventory | **35/35**、typecheck、生成配置/映射、当前inventory通过 |
| 安装 | **20模块+manager=21文件**，维护锁/备份/原子替换/导入及缺参拒绝smoke；最终逐文件SHA匹配已测源码 |
| 真实GitHub工程CI | 提交`0120e79edf1e130a72f4b9acf870a46b85c3e5a8`，[41439936620](https://github.com/aieasygames-alt/gachia/actions/runs/41439936620)成功 |

首次focused测试是缺少描述性长度报错导致断言不匹配；原门禁已拒绝异常正文，补明确信息后通过，失败日志保留。没有放宽生产校验。最后文档/来源回归另留`source-runbook-final.log`；文档提交及其真实CI身份记录于`delivery.json`，不将工程CI套给后续提交。

只推`codex/payload-unified-maintenance`，main未合并、两GitHub部署变量仍false。没有CMS应用覆盖/重启、内容写入、云上传/部署/切流。没有重跑公众应用build、全站parity、浏览器或依赖audit；deepmerge的1low沿用R19风险决定，不宣称已修复。旧脏checkout未修改。

DB逻辑摘要仍为`c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`。没有合格真实候选，R20正式导出拒绝继续有效，本轮不重复导出或制造文字变化。

## 4. 任务状态与下一步

1. **完成L05/L06当前NTE来源交接子任务**：两游戏当前game/Main来源均已登记；Genshin安装版manager实测沿用R21，NTE本轮是安装版模块source-only实测，不冒称真实候选操作。
2. **下一可执行工程项：四个staging的实际HTTP/robots/noindex/cache与外部入口核验**。R19的fetch failed不能算验收通过；只读调查，不擅自重部署或扩大七服务保护集。
3. **真实Genshin编辑就绪即优先首次/第二次云发布及兼容恢复，再NTE**。既有指南实际预期公开的title/body编辑即可，不等待事实校对、全类型接管；默认操作授权不等于编辑输入或第三方媒体权利。
4. **独立key/第二Mac就绪即做L03剩余灾备验收**。不重复同机/R2往返代替跨机启动；新UUID来源交接仍需新证据，没有自动前移。

P0–P5/P7仍部分完成、P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。真实候选云端E2E、连续版本、partial failure/兼容恢复及普通公开请求全程releaseKey仍未验；目录登记不关闭T04/T06或整体上线。

## 5. 证据索引

- 入Git：本报告与`verification-summary.json`；代码只含来源校验与隔离测试，现行任务表/首发清单/手册/项目地图/README同步更新。
- 原始链：本地`historical-pins.json`、`work.json`、`handoff.log`、`handoff.json`，私有work中的origin、source-local-proof、557/811正文及全部树清单。
- 安装与选择：`source-register-installed.json`、`source-select-installed.json`、`register-installed-network.jsonl`、两次安装版尝试日志、`command-evidence-summary.json`、`installation.json`、`installed-integrity.json`、`local-final.json`、`local-http.json`。
- 回归与云/Git：`release-tests.log`、`cms-router-verification.log`、`source-runbook-final.log`、`project-inventory-final.json`、`cloud-final-check.json`、两次真实CI结果及后续`delivery.json`、非循环`evidence-index.json`。

不提交私有原始日志、正文、数据库、媒体、凭据或key。完整状态见[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)与[多Worker地图](../../docs/payload-project-worker-map.md)。
