# Payload R14：O→A→B→恢复 A 本地连续发布演练

日期：2026-11-02。用户已明确“需要授权的地方默认已经授权”；后续任务不再以逐项重复确认作为阻塞。本轮仍选择隔离演练，未把合成文案发布到公网，没有修改在线内容。

## 结果

**完整第二轮本地链路通过：真实 PostgreSQL/Payload 编辑与导出 → A/B 四次真实 Worker 构建 → 两轮实际 loopback 预览 → A runtime 与 B 静态资源并集 → 恢复 A 的实际 HTTP 验收 → 错误恢复 O 拒绝。**

这里的“完整”限定于上述本地链路：版本拓扑为合成 UUID、本地候选 inventory 回执不是真实 Cloudflare retained 回执。没有云上传、云部署切换、真实版本 preview 或生产 partial failure；不能关闭真实云验收项。

## 执行过程

1. 从在线 PostgreSQL 创建一致性逻辑快照，恢复进独立 `cms_probe_continuous_*` 数据库。首次恢复因 `--no-owner` 导致应用角色无表权限而停止，测试库已清理；随后仅对新测试库授予访问权限，未更改在线权限。
2. 用实际 Payload Local API 在克隆库编辑同一指南，依次生成 A、B。使用克隆用户的审核身份发布克隆记录，按正式 `draft:false`、`published`、`hold=false` 查询。两轮 `sourceRecord` 均仍等于 O，在线 84 条记录不变。
3. 抽取共用 `exportDesktopGuides`，正式 desktop-content 和演练共用相同的校验、字段覆盖和 manifest 生成逻辑，避免只测一份复制的导出算法。新增重复记录拒绝。正式导出与演练导出的字节一致，但 releaseKey 因 preview 标志不同；只将 `preview=true` 的候选写盘供构建，不能进入云上传。
4. `prepareCandidate` 冻结同一 Git commit，两轮均构建真实 Genshin/Main OpenNext Worker；不修改当前 checkout 内容数据。`verifyBuilt` 核验封存构建物。
5. A 预览 14 个响应，B 预览 14 个响应，全部通过。
6. 从实际 A Main loopback JSON 捕获发布内容基线，注入明确标记的合成版本拓扑，仅用于本地验证。基线摘要等于 A，不等于 O/B。
7. 恢复包保留 A runtime，加入 B 的静态资源并校验不可变路径冲突：Genshin 增加 48 条路径、Main 增加 51 条路径。实际恢复 HTTP 共 **327** 个响应（Genshin 135、Main 192）通过，包括正文/页面指纹、三语言路径、Main JSON、sitemap、robots、静态字节和已保存 headers。
8. 生产实现 `bindPublishedBaseline` / `verifyRecoveryCompatibility` 验证恢复回执；将 Main 响应替换成 O 并重新计算测试回执 pin 后仍拒绝。未覆盖原有效回执。

## 内容身份

| 内容 | SHA-256 |
| --- | --- |
| O 原始来源 | `8d0c81f541218f4df90fb9766fa13351bd8ca1147f012be36bb694db3accc310` |
| A | `0e68fee0e94b8ddf555ca9ae497559457cc7349f7ca13993fbc482944d054b3f` |
| B | `52c6858879a9d1102f446c75308cbff69a55b84ccd0916326427ba164fda970a` |

持久构建与网络证据：`/Users/robert/.gachia-cms-audits/continuous-06fa66fb8b`。其中 DB dump 含私密数据，不应公开；所有演练目录仍保留，不删除/重写历史证据。恢复网络证据在 `recovery-A-with-B-assets`。

## 安装与安全状态

- 共用 exporter 和 `desktop-content.ts` 已在 maintenance lock 下备份、安装、校验摘要，实际安装的纯导出 smoke 通过。它们由管理器的 tsx 入口读取，不需要重建/重启 Next 服务。
- 备份：`/Users/robert/Library/Application Support/GachiaCMS/publisher-upgrades/export-20261102T024900Z-a82d1a`。
- 在线数据库逻辑摘要在克隆前、导出后、所有构建/恢复结束后均一致。
- 最终状态：**84 draft / hold=true**；CMS healthy；连续演练测试数据库残留 **0**。
- 无 Cloudflare 写入；无真实编辑、无清除在线 hold；没有新增媒体权利批准或对外存储操作。
- 用户默认授权已记录；真实编辑输入尚不存在与“未授权”是不同问题，不再混用。不会制造正式内容来满足测试。

## 验证

- CMS **161/161**，typecheck 通过。
- 桌面发布 **268/268**，既有 Node **304/304**，Python **31/31**。
- A/B 四次实际 Worker build 通过；候选 loopback **28** 个响应通过；恢复 **327** 个响应通过，另有一次 A 基线 JSON 实际采样。
- `git diff --check` 通过。
- 不宣称跨浏览器、客户端跳转/Flight、外部媒体字节或真实 Cloudflare topology 已验收。

## 任务更新

- L01：**本地连续发布验收完成**，不再列“完整第二轮导出/构建/恢复本地流程”为空缺；真实云连续发布仍未验收。
- L02：维持已安装/隔离集成通过，真实云续验与恢复未验收。
- L03：沿用 R11 本地加密恢复结果，异地副本仍未完成；旧加密归档不包含本轮新增代码。
- L04：无需再次逐项授权，但当前无正式编辑候选；不能用这两个 preview 候选进行首发。
- 后续推进 NTE 云链路参数化与兼容恢复测试；出现真实候选即在已有授权范围内进行首发云验收。不再重复这轮本地构建演练，不恢复内容准确度审核门槛。

证据入口：`export.json`、`database-isolation.json`、`builds.json`、`recovery.json`、`export-install.json`、`final-status.json`、各测试日志及 `evidence-index.json`。`build-rounds.mjs` / `recover-a.mjs` 为本轮可检查的执行脚本，不是通用生产命令。
