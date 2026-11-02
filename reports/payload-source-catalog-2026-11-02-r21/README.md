# Payload R21：当前版本来源登记与自动选择

日期：2026-11-02。目标是减少首条真实发布的手工交接，不扩大CMS/生产写入范围，不把内容事实准确度重新加成上线门槛。

**本轮L06来源目录子任务已实现、安装并完成Genshin限定实测；真实内容云发布仍未完成。** 开始时只读DB确认84条draft/hold、0 eligible，现有标题/正文相对导入源没有修改。没有真实编辑输入，故不制造文案、清hold、重复构建或上传诊断候选。

## 1. 交付内容

新增`scripts/desktop-source-catalog.mjs`，接入现有Python manager及固定安装依赖闭包：

| 命令 | 作用 | 边界 |
| --- | --- | --- |
| `publish-source-register` | 从已验retention/资源/版本绑定baseline/本地恢复回执登记来源，自动生成双owner来源profile和pin | GET当前双模块和精确MainJSON，核对当前game/Main UUID、A而非O、来源树/回执/HTTP字节/pin与前后七服务拓扑；目录排他，manifest最后写 |
| `publish-source-select` | 新候选在build前按当前game/Main UUID选择已登记来源，输出资源及恢复source路径/pin | 重验全部引用、当前模块/JSON/本轮拓扑，拒绝过期版本、链接、公开权限、篡改或失败条目；无latest/回退O |

目录固定为`~/.gachia-cms-releases/source-catalog/<game>/<gameUUID>-<mainUUID>/`，只允许本机用户访问。manifest是可信私有本机索引，不是外部签名批准；原始retained inventory、资源、baseline body、恢复树和HTTP回执仍是依赖，删除/篡改即失效。它**不是自包含备份**，不代替独立key或跨机恢复。

登记/选择不会将diagnostic run批准为正式候选，返回仍`cloudWrites=false`、`productionReady=false`。选择另有`freshAssetHTTPStillRequired=true`、`freshCandidateRecoveryStillRequired=true`：每个新候选仍需assets-refresh、新baseline、本地兼容恢复、双候选/双恢复精确UUID云预览、时效、推广和公网验收。

game或Main任一UUID改变后不会自动前移，缺少新目录即停止，维护者必须重新验证/登记。其他受保护Worker在历史上的合法变化不强制使未变的game/Main来源失效，但每轮观察中的七服务部署/配置漂移仍拒绝。NTE与Genshin分别登记，不能跨game借来源。

## 2. 实际验证与失败处理

- Genshin当前版本`c0dba6f4-878a-467e-91e9-f32508e59e82`、Main`3efd4103-7156-484b-86d8-a28853a668c8`登记成功，随后**安装版manager**选择成功，source/manifest pin一致。
- 两次各重新下载两个当前精确云模块及一份精确MainJSON：合计**4次模块下载、2份JSON实际HTTP响应**。每份JSON275079字节，SHA为`8d0c81f541218f4df90fb9766fa13351bd8ca1147f012be36bb694db3accc310`。multipart/body和diagnostic留在私有run目录；不是本轮又采了547份静态或760份loopback。
- 实测复用R20诊断run，仅索引其已验**当前公众基线来源**。实际当前A=O，没有新造云A/B；另一releaseKey、新候选复用及A≠O由两游戏隔离测试证明，不冒称实机新候选验收。NTE本轮没有实际来源登记。
- 首次登记被现有OAuth token过期以401拒绝，未写入可选择manifest；原失败diagnostic保留。使用既有Wrangler登录刷新后，开启新只读轮通过；没有新增OAuth grants或扩大权限。
- 精确workers.dev仍沿用R20确认的当前Mac既有SOCKS5代理，仅当前进程设置环境；TLS保留，系统DNS/代理不改。Node25.9.0的SOCKS支持仍实验性质，不推广为其他机器的默认配置。
- 最终安装版10Worker只读盘点与R20逐项比较，七受保护服务和另三staging前后均未改变。保护仍7服务，写入仍只可能game/Main；本轮云写入0，没有Router/其他游戏部署。

## 3. 测试、安装与工程交付

| 验证 | 新鲜结果 |
| --- | --- |
| 来源目录隔离测试 | **39/39**；双游戏/另一releaseKey/A≠O、版本/来源/pin/runtime/回执/正文篡改、第二owner失败、HTTP/cookie/type、拓扑漂移、链接/权限、旧项/失败项拒绝 |
| 桌面发布全集 | **434/434**，含两命令的参数/真实缺参CLI/manager转发/依赖闭包与手册检查 |
| 既有Node发布测试 | **304/304** |
| Python发布/恢复测试 | **49/49**，4+14+3+9+11+8 |
| CMS | typegen/typecheck通过，**163/163**；未更改CMS runtime源码 |
| inventory/Router | 当前清单检查、生成配置/映射/typecheck及**35/35**通过 |
| 持久安装 | **20模块+manager=21文件**，维护锁/备份/暂存导入/原子替换/摘要与缺参拒绝smoke通过 |
| 本机运行 | CMS/PG healthy/loaded，安全HTTP **9/9**，DB摘要不变 |
| 实际GitHub CI | 工程提交`155821013bcb5d8f9ce87a2a8b04aa450521f92e`，[41436177902](https://github.com/aieasygames-alt/gachia/actions/runs/41436177902)成功，包含inventory/Router与新测试 |

首次focused测试因新fixture漏canonical失败，补齐fixture必需字段后通过，原失败日志保留；没有放宽生产文档指纹门禁。所有测试走隔离临时目录/模拟只读传输，不访问生产CMS写接口或云写接口。

只安装manager/publisher，CMS应用不覆盖、不重启。安装版21文件与已测源码逐一摘要一致。工作区为`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`，默认旧脏checkout未修改。本轮工程只推专用维护分支，main未合并、两个GitHub部署变量仍false；本报告的后续文档提交/CI身份另存delivery，不把41436177902套用到未来提交。

DB逻辑SHA仍为`c41f3179e0ed3f60b1fc25a58ed30c5e715a85f90da14310c4ae9eb230b70211`，84draft/hold、0 eligible。R20正式导出拒绝仍有效，本轮不重复正式导出或创建新真实候选。不重跑公众应用build、全量parity、全站SEO/浏览器或依赖audit；deepmerge的1low沿用R19/R20限定本机风险决定，不宣称新扫描或修复。

## 4. 更新后的任务与剩余顺序

1. **L06来源目录子任务完成，完整交接仍部分完成。** 已有来源的新候选减少手填；从零可信来源、新UUID接续、完整操作范围验收未完成，不能称一键全流程上线。
2. **L04真实Genshin编辑一旦存在，优先首发/第二次及兼容恢复，再L05 NTE。** 无需先事实校对或补全类型迁移；一条实际打算公开的既有title/body修改即可，但保存或published不是公网更新。不能以默认操作授权代替编辑输入。
3. **L03仍待真实独立介质与第二Mac。** R17异地密文和同机恢复不重做；本轮未复制key或验证跨机启动，不能虚报完整灾备。
4. **没有真实编辑时的下一工程项**：NTE当前来源交接及未验staging入口检查。之后才评估新UUID自动接续，不能先绕开新证据/云门禁。全类型准确度、通用队列和全scope接管保持后置。

P0–P5/P7仍部分完成、P6未完成；T01完成、T02限定本地完成、T03–T08/T10–T12部分完成、T09未完成。L01/L02/L04/L05的真实云连续发布、partial failure/兼容恢复、真实普通请求全程releaseKey仍未验。来源索引不能关掉T04/T06或完整上线任务。

详见[当前任务表](../../plans/project-task-status-current.md)、[首发清单](../../plans/payload-launch-closeout-2026-11-02.md)、[手册](../../docs/payload-operator-runbook.md)、[多Worker地图](../../docs/payload-project-worker-map.md)。

## 5. 证据

- 实测：`source-register.json`、`source-select-installed.json`、`command-evidence-summary.json`；实际multipart/body/回执均在返回目录及私有run中，原失败诊断不删除。
- 回归：`focused-tests-first.log`、`focused-tests.log`、`release-tests.log`、`cms-router-verification.log`。
- 安装/本机：`installation.json`、`installed-manager-smoke.json`、`installed-integrity.json`、`local-before.json`、`local-final.json`、`local-http.json`。
- 云/Git：`project-inventory-final.json`、`cloud-final-check.json`、`github-code-result.json`、`github-deploy-guards.json`及后续`delivery.json`。
- 汇总：`verification-summary.json`、非循环`evidence-index.json`。仅报告和无秘密的汇总入Git；私有原始日志、数据库、媒体、token/密码/key不入Git。
