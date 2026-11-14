# R120 项目接续底图

<!-- BEGIN R120 DELIVERED -->
当前状态（2026-11-14）：异环单 Worker 真实 CMS 正式更新闭环已完成，最终 NTE 版本 `963f4629-9b0f-4992-8373-fcb536508c81`。一次性迁移之后的 CMS 内容发布仅改变 NTE，完整来源已接续为 [independent-sources-01/source-index.json](independent-sources-01/source-index.json)，SHA256 `38a0a15fcc02cdc891ccf7339db49183bcb1b5f9e5c9cc45c9032df6bbf4d659`。完成态及资格边界见 [EXECUTION.md](EXECUTION.md)和 [delivery.json](delivery.json)。下文的 R119 是本轮父来源。
<!-- END R120 DELIVERED -->

此文记录本轮重新核对的系统边界；正式完成与否以同目录 `EXECUTION.md`、完成态和新来源索引为准。

## 系统与源码

- 维护工作树：`/Users/robert/.codex/worktrees/payload-unified-maintenance/gachia`，分支 `codex/payload-unified-maintenance`。Documents 下是另一份旧且有修改的 checkout，不用于本轮构建或发布。
- 公众端为 pnpm/Turbo monorepo：`apps/web`、`apps/router`、四个 `apps/game-*`，共享 `packages/core` 与 `packages/data`。Next 15.5.28/OpenNext 产物运行在 Cloudflare Workers。
- CMS 为依赖隔离的 `services/content-cms`：Payload 3.92.1、Next 16.4.2，本机 PostgreSQL，安装在 `~/Library/Application Support/GachiaCMS`，监听回环地址。公众请求不依赖本机 CMS。
- `apps/admin` 是另一套历史工作台；不等同于 Payload，不在本批迁移范围。

## 服务与请求归属

- 正式域名进入 Router，再按 `packages/core/route-ownership.json` 分派给 Main、Genshin、NTE、Azur Promilia 或 Lvmeng。
- 当前内容清单有 16 个技术 scope；四个独立游戏有各自 owner，其余由 Main 承载。Lvmeng 维持中文。
- 固定发布保护集合是六个生产服务加 Main staging。历史账户盘点另有三个 staging；七服务保护不能扩写成十服务均由当前适配器逐项保护。
- NTE 本轮新增材料详情归属：57 个材料 × zh/en/ja，共 171 个公开 URL；材料列表、角色关联、FAQ、canonical/alternate 和 sitemap 同批迁移。
- NTE 的 raw JSON、平台摘要、搜索切片和版本清单由游戏 Worker 输出。Router 保持公开兼容 URL，Main 聚合通过 Service Binding 读取。独立来源不可用时显式失败，不取旧副本。
- Main 仍有历史 NTE 源码分支和共享资源；本轮不声称 Main 已没有任何 NTE 字节。

## 内容权威与发布资格

- 原始 Git O、当前完整已发布来源 A、CMS 叠加后的候选 B 分别绑定；不允许用旧 Git 内容覆盖已上线增量。
- 本轮入口是 R119 的 115 来源索引，pin `4fcfabf968c5a0dcc566108310672632b75bf1ed7866900ff24af8ec42d42253`。胡桃英文简介及 ananta/genshin/hi3/nte/sea 五份攻略增量均需保持。
- R119 已证明既有原神角色文本的真实单 Worker 闭环。本轮扩展目标为 `nte-independent-existing-character-text-v1`；不将既有文字发布资格外推为数值、枚举、关联、媒体或新增/撤回资格。
- 真实更新选择 NTE 娜娜莉记录 1327 的 `descriptionEn`，只整理既有事实表达。搜索核对名称、链接和派生切片一致性；搜索 UI 不展示简介，不把它列为简介展示位置。
- CMS 中的 published 是内容审核状态；必须继续完成固定构建、封装、精确 CI、云候选/恢复预览、正式部署、公网验收和来源接续，才成为公众版本。

## 本批交付顺序与保护

1. 一次性 NTE → Router → Main 迁移；候选/兼容恢复分别封装并校验。
2. CMS 草稿 → 审核 → 仅构建 NTE → 云预览 → 仅部署 NTE → 重读页面、公开 JSON、搜索、Main 聚合。
3. 确认第二阶段仅 NTE 部署身份变化，完整 115 来源接续到新索引。
4. 后续顺序：蓝色星原 → 绿梦中文 → 按内容类型扩展所有游戏 → 页面内联内容 → 新增、撤回和媒体替换。

本轮公众构建固定 Node 22.23.4。历史 R79 传输回执严格绑定原本机 Node 25.9.0，历史审计/生产执行须使用该原始 executable；这不是更改历史证据或放松校验。标准构建预算维持 14 GiB（8 GiB 保留 + 6 GiB 临时），只对本批未上线准备做经校验的可恢复归档。
