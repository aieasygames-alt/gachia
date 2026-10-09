# 崩坏3上线前审计 — 2026-10-09

## 发布结论

首次预检主站 Cloudflare Worker 为 **3643.51 KiB gzip**，超过项目文档规定的 **3 MiB（3072 KiB）** 门禁。移除情报面板七份完整攻略 JSON 的静态导入，改用现有 loadJson / ASSETS 加载后，默认 dry-run 降为 **3016.70 KiB**；启用 Wrangler minify 后最终为 **2746.79 KiB**，门禁通过，余量 325.21 KiB。未修改付费计划或生产分流。最终部署状态以发布记录为准。

## 多 Worker 范围

- 崩坏3 `hi3` 未配置独立部署，由 `MAIN_WORKER_GAME_IDS` 归入主站 `gachia`。
- Router 保持现有 MAIN_SITE fallback；原神、异环、蓝色星原、绿梦的独立 Worker 配置不变。
- 本轮没有数据库变更，不需要数据库迁移。
- 无关的原神未跟踪审计报告保留，不纳入本轮发布。

## 已修复

- 浮生·渡尘不是 9.0 新女武神：修正角色类型 BIO、初次实装版本 7.2，并明确命运之轮由新神之键/超限装备激活。
- 攻略标题不再称其为 9.0 新女武神；修正三语正文与版本快照的装备前提。
- 补齐不存在的图鉴图片资源，明确标记为占位图而非官方角色立绘，统一武器、材料引用路径。
- 版本档案增加全球服官方公告来源链接。
- 修复新增回归测试的严格类型检查问题；增加公共数据镜像一致性、角色字段和图片存在性检查。

## 出处

- 官方公告：<https://honkaiimpact3.hoyoverse.com/global/en-us/news/165770>
- 官网公开正文接口：`https://sg-public-api-static.hoyoverse.com/content_v2_user/app/5fcd2aa439ca4aea/getContent?iInfoId=165770&sLangKey=en-us`
- 接口返回标题 `v9.0 The Light at Dream's End Update Announcement`，发布时间字段 `2026-08-20 12:00:00`。
- 正文确认 8 月 20 日至 10 月 22 日、新人偶 Senadina、浮生·渡尘推荐神之键及其激活条件、圣痕锻造每件 2 Source Prisms 和 600 Ether Fuel。BIO、7.2 属既有角色基础资料，不是该公告提供的新内容。

## 已执行校验

- 全仓测试：Web 110、Data 47、Router 23 项通过。
- 全仓 type-check、lint 通过。
- 数据 validate、verify:manifests 通过；Router 部署配置 4 项通过。
- OpenNext Cloudflare 构建通过，Next 生成 7517 个静态页面。
- Wrangler dry-run 完成绑定和包体检查，优化后满足项目门禁。
- 尚未进行生产部署或本轮线上验收。
