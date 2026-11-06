# R46 常驻接管与真实审核候选

2026-11-06。按用户确认的 1 → 2 → 3 → 4 → 5 执行，第 1 项进行中，第 2 至 5 项未销项。[完整实施队列](../../plans/payload-all-content-implementation-2026-11-05.md)。**常驻已 R46，公众仍 R39；没有统一云上传或切流。**

## 工程与 CI

- 独立桌面 `unified-import` / `unified-export` / `unified-freeze` 已实际使用，原隔离 SQLite 守卫不变。导入显式选 scope；导出显式选择 1-200 条已登记记录，并 pin 选择、完整 A 和来源计划。
- 只接受 settings 指向的当前安装应用。正式选择从 Payload 重读 published / hold=false，核对 game、来源和结构，准备前后批准摘要一致；输出仍不可激活。
- 修复实际 Payload `locale:all` 返回空 title/body 语言对象导致的误拒绝，非空值及未知语言仍拒绝。来源读取明确接受所选仓库，不从安装目录寻找游戏数据。
- 精确安装/冻结源码：`7b12684262338511bbcc2d3468bacaeff9a2404a`。[完整 GitHub CI 42130525825 成功](https://github.com/aieasygames-alt/gachia/actions/runs/42130525825)，CMS、库存/Router、发布工具、Web/Data/实际浏览器消费、全公共类型检查和文档门禁均通过。
- 本机 CMS 268 项、发布工具 937 项、其他 Node 304 项、Python 56 项通过；类型检查和构建通过。实际 PostgreSQL 17.6 集成及 built HTTP 的 15 组验证通过，含增量迁移、全 scope 导入、权限/版本/锁/媒体。安装副本另使用本机 PostgreSQL 17.11 验证。

## 常驻实际结果

- 真实常驻库只读 dump 恢复到独立 loopback 集群；桌面模式下两次迁移幂等，完整旧行与版本投影摘要不变，8 项 HTTP 安全检查通过。副本、dump 和临时服务均清理，没有借演练写常驻库。
- 冷备后显式迁移并安装，常驻健康。原有 `1 user / 85 content / 1 media` 保持；711 份应用文件、184 份附加 release 文件验 pin。旧应用、升级前设置/agent/manager 与原发布器保留，原发布器未替换。常驻安全 HTTP 9/9。
- 单一 `ananta` 范围导入 65 个 held 草稿，总内容数 150。全表旧行的多重集合均保留，包含旧编辑和版本；仅增加该游戏及其内容/版本/语言空信封，不批量审核其他内容。
- 真实认证 REST 编辑记录 99 的下载指南：仅中文 `/content` 追加安装前检查清单，不改日期、配置、容量、其他字段或语言。草稿保存重读且不改变正式文档，再显式审核发布；其他 149 条内容不变。私有快照、写入意图和锁操作留档，token/密码不输出。
- 审核后冷备已在独立数据库和媒体目录恢复验证，完整 canonical 数据与媒体摘要一致，`1 / 150 / 1`；没有替换在线库。最终安全观察见 `resident-after-content.json`，备份证明见 `approved-backup.json`。

## 真实发布准备

- 两次完整 A 捕获均成功：90 个公开 JSON、115 来源，公开增量仅原神/异环攻略，分别 32/53 篇，含 `cms-returning-player-checklist`。这不是内容权威或来源认证。
- 当前真实审核选择 `preview:false`。正式导出与冻结的候选摘要相同：`50a15bc167cb9ad92e1939cd5049cde58f4d5cb9f908033f03cf5463e5aea277`；批准摘要同为 `f6d8261c83089250acf860602a8e6b20d64aab2a9c52fc7427c255bc891a3b23`。不是 R42 fixture。
- 当前冻结按全部 O→候选 overlay 计算 owner，实际为 `genshin → nte → main`，其中两游戏只保留公开 A。**不能标成 Main-only，也不能删掉 overlay 强行缩范围。**
- 三个 Worker 串行实际构建，本地 446 响应及独立产物重读通过；Main 含 435 份公开 JSON、关闭账号 API、中文新增正文及不变英文消费。
- 复用以上构建，候选/兼容恢复 6 个实际 Worker 的本地检查及独立复验通过；精确模块共 12 次实际 dry-run、封存后 4,350 个响应通过。旧恢复模块不重新打包，候选模块只打包一次，两方向均保留必要静态资源而不混入新旧公开 JSON/页面/cache。
- 构建 pin：`15b074cb7a9e68f5645e479ae305bfd4e56d6b9f28f1fa1b6de6ba38b7ee7a74`；publication pin：`5cc4c9d2f5d7074be9bce3a4673337791b5cc7e1619c17d079fc490507f24fa1`；transport pin：`3ba5e4f94862e9493c6cda97197b4a59043df8b3d96865a288cdbf033499c33d`。
- 精确 Host 本地预览另有 6 个真实 Worker、4,350 个响应及独立复验通过，preview pin：`bfa4097e1983e8395b5acf0c8b3cf160684a305463ebe03f7f2dcc675a639bea`。明确 `syntheticVersion:true`、`cloudIdentityVerified:false`，不是云预览。
- `public-after.json` 于 `2026-11-06T00:01:10Z` 再次确认三游戏公开攻略与 A 逐字节相同，Ananta 仍 19 篇且无新增安装清单；原神 32 / 异环 53 保持，公开 HTML 200、账号 API 404 且 `ACCOUNT_FEATURES_DISABLED`。配合路径匹配的语言请求头不设置 cookie。
- 所有准备仍 `productionReady:false`、`activationSupported:false`、`cloudWrites:false`。固定生产验证器/上传器、真实云候选与兼容恢复预览、推广/partial/公网和来源接续未完成，第 1 项不能整体关闭。

## 诊断与空间

- CI 42128560898 在 runner 12.31 GiB 处先触发空间门禁，而测试预期模拟离线失败。改为显式磁盘探针注入，保留正式 14 GiB 预算，并新增预算不足时零执行断言。
- CI 42129438747 暴露 Python 3.14 的 title RCDATA 差异。标题原始嵌套标签现明确拒绝，转义字面文本保留；Python 3.9/3.14 的 18 项 HTML 回归均通过，完整远程 CI 随后成功。
- 额外本机 Homebrew Python 3.14 全套尝试因既有 `pyexpat` / 系统 libexpat 链接不匹配失败；没有修改机器运行时。完整本机发布回归使用正常 Python 3.9，Linux 完整 CI 已通过，不把该尝试写成成功。
- 首次副本 HTTP 探针使用 postgres-local 却期待 desktop 防护，保留 `staged-runtime.json` 的失败摘要；随后显式使用独立集群的 desktop 模式复验成功，见 `staged-runtime-desktop.json`。完整行调试输出转存私有 operations，不提交数据库行、凭据或 dump。
- 保留至少 8 GiB；重构建串行，成功后仅清理本轮 `.next`/`.open-next` 中间产物。历史 release/source/备份/密钥及旧应用均未删除。源码工作区可再生构建目录约 597 MiB，可后续单独清理；HI3 旧工作台授权不扩展到其他删除。
