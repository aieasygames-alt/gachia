# R43 五目标资源兼容与恢复

2026-11-05。继续“所有游戏现有内容可由 Payload 正式更新”的实施主线。本轮关闭本地双向资源保留/兼容恢复切片，未声称整个发布闭环已完成。

## 本轮实现

- `scripts/unified-release-assets.mjs`：Main 与四个独立 owner 的精确静态并集。候选保留旧资源，恢复产物使用旧封存 Worker 并保留新资源；不能复制另一版本的 HTML、公开 JSON 或 server cache。碰撞、缺失/不同的命名空间别名、链接和超预算拒绝。
- `services/content-cms/src/unified-publication.ts`：绑定 R42 已验构建、全部旧产物/运行时外部 pin、原正文断言，依次生成两类产物并启动真实本地 Worker 验收。Main 恢复的 90 份 raw 镜像必须等于冻结 A。
- `unified:publication-local prepare|verify`：严格参数的新本地发布准备入口。独立 verifier 重开源码、全部产物及精确文件集合、旧 multipart、运行配置和完整 HTTP 证据。目录互斥、失败留档、不能覆盖/自动续跑。
- 当前工具与冻结源码锁文件相同时，复用已有本地 Wrangler 依赖，不需要重建五个应用或重装已清理的冻结树依赖。
- 新底层测试已进入根 `test:release` / `test:desktop-publish`；CMS 编排测试由原 CMS 测试入口自动执行。未实际触发云 CI。

## 真实执行

本轮复用 R42 `owner-smoke-03/frozen`，构建 pin 为 `9898538f9d6235835dac6c49dd07740f0e065fdfb16208a3b751d69debb45a23`。没有重建或修改 R42 的冻结源码和产物。旧产物来自历史已发布 artifact/source-catalog，旧运行时来自历史 multipart；本轮只验证本地固定字节，不假称已重新读取云控制面。

成功批次：[publication-03/publication.json](publication-03/publication.json)。外部 pin：

`54caead16024ca1827ff517cf8c931b892b2b6d3bac3871c98ec9061fcc8537f`

| Owner | 候选响应 | 恢复响应 | 每方向完整静态 URL |
|---|---:|---:|---:|
| 蓝色星原 | 203 | 203 | 200 |
| 原神 | 537 | 537 | 534 |
| 绿梦 | 199 | 199 | 196 |
| 异环 | 371 | 371 | 368 |
| Main | 1,268 | 1,268 | 829 |
| 合计 | 2,578 | 2,578 | 2,127 |

共十个真实本地 Worker、5,156 个 HTTP 响应，其中 4,254 次新旧静态字节/MIME 请求；Main 两方向各 435 份公开 JSON。候选正文均包含 R42 的 CMS 测试编辑，恢复正文均包含历史原值。sitemap/robots、无 cookie、关闭账号 API 也逐目标验证。原神 32 篇（含 `cms-returning-player-checklist`）与异环 53 篇攻略在两方向字节相同。

成功后另起 CLI 独立重读通过，沙箱清理后再次验收。结果见 [result-03.json](result-03.json)、[summary.json](summary.json) 和 `independent-verify-final.log`。

## 失败与修正

初始报告脚本 `.ts` 在仓库根按 CJS 转换，top-level await 被拒绝；改用 `.mts`。第一次输入预检发现 Main 还有实际 Next 静态 PNG，补入有界图片保留与对应 MIME 检查。`publication-02` 因复用工具时定位冻结锁文件多退一级而失败，修正路径后使用新目录 `publication-03`，未覆盖或续跑失败批次。

最初 closeout 脚本误用 `slug` 检查 raw 攻略身份；实际字段是 `id`，修正报告检查后确认 32 条及该公开新增均存在。没有改动 raw 内容。原始 stderr、failure/state 和初始 closeout 诊断保留，不伪装首次全绿。失败批次的可重建两类复制产物在 closeout 单独清理，输入源和诊断保留。

## 验证

- CMS：246/246，全套包含三项真实 loopback 编排与篡改/失败门禁测试。
- 相关发布工具：222/222，含新增 16 项底层双向投影/碰撞/链接/别名测试与既有资源/恢复/传输门禁。
- CMS TypeScript：通过。
- 文档与 CI scope：38/38；`git diff --check` 通过，不冒称远端 CI。
- 实际 Worker 响应与独立 pin 复验：如上；不把普通 Node HTTP fixture 当 Worker 验收。

## 空间与边界

仅删除本轮 `home` / Wrangler 沙箱缓存和失败批次可重建副本，成功批次产物、完整 HTTP 响应、R42 输入、历史 release/source 链、备份与密钥保持。具体字节与剩余空间见 [summary.json](summary.json)，目前仍约 31 GiB 可用，无需紧急清理历史内容。

用户取消的公开内容来源认证不重新加入门槛。本地旧运行时 pin 是工程完整性，不是事实权威性证明，也不是云版本新鲜证明。所有回执保持 `productionReady:false`、`activationSupported:false`、`rawUuidRollbackAuthorized:false`、`cloudWrites:false`。本批候选是 fixture，固定 `preview:true`，不可上传。

没有常驻 CMS/PG 写入、迁移、安装、备份上传、Worker 上传/推广、Git 提交推送或实际 CI；常驻/公众仍 R39。下一工程是五目标 no-bundle 封存传输（正确保留蓝色星原服务标签和绿梦 production 环境）、精确候选/恢复云预览、受控推广/partial 对账/source-advance，随后冷备/有界安装/真实 CMS 内容更新。全领域规则、逐类消费者、新增/撤回/结构/媒体及 TSX 内联事实仍不能据本轮五页面代表性验收关闭。
