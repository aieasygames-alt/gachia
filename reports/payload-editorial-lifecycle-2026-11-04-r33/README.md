# R33 编辑批准与撤回权限修复

日期：2026-11-04。用户要求继续下一阶段；本轮推进原 T07 编辑资格/异常分支，不制造下一条真实内容编辑，也不新增通用运营平台。本机 Payload/PostgreSQL 保留，Cloudflare 多 Worker 的公开流量和发布范围不变。

## 实际修复

原有 beforeChange 只拦截写入 `_status: published`。editor 可以通过普通单条或批量更新写入 `_status: draft`，直接撤回已批准记录并改变后续正式导出资格。原构建在独立 PostgreSQL/真实 HTTP 中返回 200，证据为 `postgres-built-before/`；不是仅凭静态推测。

现在 content-records 的非草稿更新在 beforeOperation 统一要求 admin/reviewer；editor 更新必须显式 `draft=true`。批量请求与本地 overrideAccess 也不能绕过此角色门禁。原有发布前检查仍保留，`draft=true` 不能让 editor 写入 published，活跃锁仍不可强行覆盖。editor 可以创建/保存草稿；reviewer 可以明确批准、hold、撤回和恢复版本。它们都不是 Cloudflare 激活授权。

## 验证与安装

- CMS 完整测试 **174/174**，typecheck 与 Next 16.4.2 build 通过；发布回归桌面 **784/784**、其他 Node **304/304**、Python **49/49** 通过。
- 新增生命周期套件在真实 SQLite 和隔离 PostgreSQL 中通过。多语言草稿 B 不改变已批准 A 的正式导出；reviewer 再批准后导出 B，保留 O 来源摘要。拒绝操作不改已批准记录或版本数量。
- 独立 PostgreSQL 17.6 的完整 smoke 为 11 组通过，包含角色/HTTP、锁、版本恢复、会话注销及数据库故障 readiness。随后对待安装应用原路径用 **Homebrew PostgreSQL 17.11** 再验证 5 组 HTTP 生命周期，均通过；临时服务停止，在线 DB 未接入测试。
- 精确代码提交 `23c8e3e3bb49884763b34d8e8be619bc4d42c3da` 的只验证 CI [41779834056](https://github.com/aieasygames-alt/gachia/actions/runs/41779834056) 成功。原构建/首版断言失败日志保留，没有覆盖历史报告；首版测试中超出缺口的“默认创建草稿也应拒绝”断言已移除，正式红例以 `lifecycle-red-02.log` 为准。
- 冷备 `20261104T053825Z-33406a` 后，切换到独立本机应用版本 `20261104T053433Z-editorial-23c8e3e3`。旧应用/settings/LaunchAgent 保留可回退；未执行在线 schema migration，未替换 DB 或媒体。
- 安装后 **698 个应用文件**验摘要，62 个 runtime 源文件与代码一致；25 个 publisher 模块、manager 和 2 个内容 CLI helper 共 28 文件保持原摘要。已安装 CMS 代码与原 publisher 代码版本分开记录，不冒充公众 Worker 代码已更新。
- 本机 CMS/PG healthy/loaded，安全 HTTP **9/9**，完整 DB 摘要仍为 `e13cf0505683bb76cb30b8283a3a5bbcbd3c688e56eceff3d2d5cc671bd46521`，仍 83 draft/hold + 1 published/eligible。只有隔离 fixture 中有内容写入，在线内容、hold、用户和媒体未改。

`installation.json`、`staged-runtime.json`、`github-code-result.json` 是安装与验证回执。私有冷备/settings/密钥不进入 Git。报告末次交付摘要和索引只记录本轮证据，不更新 R29–R32 的封存文件。

## 状态与下一项

**T07 的“批准/撤回角色门禁及限定多语言/锁/恢复/注销 HTTP 分支”工程和本机安装关闭；T07 整体仍部分完成。** 本轮不代表完整 UI/设备/并发矩阵、全类型迁移或网站实际撤回完成，也不把 CMS unpublish 当成删除公开页面。

C01/C02/C05a 保持关闭。C03 仍待下一条独立 Genshin 编辑的正常连续发布；C04 仍待真实 NTE 编辑的正式发布及反向 Main 交接；C05b 仍待真实独立密钥目的地。没有新编辑时，下一可执行工程项为 T07/T08 的撤回/hold 与后续候选导出保留边界：检查从当前公开 A 构造 B 时，未批准/撤回记录是否被隐式退回导入 O，先用隔离 fixture 验证，不改真实记录凑验收。内容准确度、翻译和第二 Mac 不作门槛。

本轮无 Worker 上传/部署、无 Router/staging 修改、无新发布 run、无恢复云写，也未重验 Cloudflare 控制面；R32 UUID 快照保留为历史，不当作本轮新观察。生产 Git main 与两个 GitHub 部署开关保持的交付核验见本轮最终回执。
