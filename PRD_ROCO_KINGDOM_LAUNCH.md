# PRD: Roco Kingdom（洛克王国：世界）双条目接入与 CBT 冲刺

> 日期: 2026-08-27
> 状态: Draft
> 范围: 新增 roco（国际服）与 roco-cn（国服）两个游戏条目、数据骨架、攻略内容、CBT 窗口内容运营
> 关键节点: 国际服首测 CBT 2026-10-27（距今 2 个月窗口）

## Problem Statement

Gachia 当前覆盖 10 个游戏，且具备完整的「注册表 + 数据层 + 路由 + sitemap + live-content」多游戏接入能力。但《洛克王国：世界》是一个被完全遗漏的高价值新游机会：

1. **国际服 CBT 临近**：Roco Kingdom 国际服（魔方工作室，UE4，6 年开发）将于 **2026-10-27** 开启全球首测，现已开放预约。8/27 → 10/27 正好两个月窗口，是提前布局下载/预约/兑换码/图鉴关键词的黄金期，错过即失流量。
2. **国服已上线**：国服 2026-03 已上线（首日 1500 万玩家，IP 沉淀 16 年、页游 3.5 亿注册），持续有兑换码、版本、图鉴搜索需求，但站内完全没有承接。
3. **现有 `sea` 无冲突**：`sea` 对应网易《遗忘之海》，与洛克王国无关，`roco` 需要全新接入而非复用。

因此需要新增双条目并配套内容运营，抢占 CBT 与国服两个市场的搜索入口。

## Solution

采用**双游戏条目**架构，与官方「国际服/国服数据独立不互通」的设定对齐：

| 条目 | ID | 定位 | 语言重心 | 数据源 | 状态 |
|---|---|---|---|---|---|
| 国际服 | **`roco`** | Roco Kingdom | en / ja | 官方商店页、科隆展预告、媒体预览稿 | 10/27 CBT，先做攻略 |
| 国服 | **`roco-cn`** | 洛克王国：世界 | zh | 国服已有数据（3 月上线） | 已运营，补图鉴/攻略 |

两条目共享同一套数据结构与属性体系定义，但内容完全隔离（官方设定即数据独立）。

**路由开关（MVP）**：`guides` `download` `version` `redeem-codes` `characters` `items` 开启；`tier-list` `map` 二期；`build` `teams` `compare` `calculator` 三期视数据完整度开启。

**内容节奏（攻略先行）**：低数据量高流量的下载/预约/CBT 攻略 + 兑换码先行，精灵图鉴只录官方已曝光的一批（Meevy / Catapawn / Blazehound / Dustler 等），避免 400+ 精灵全量录入阻塞上线。

## User Stories

1. As an international visitor, I want to find Roco Kingdom CBT registration and download steps, so that I can sign up before October 27.
2. As an international visitor, I want current and upcoming redeem codes, so that I do not waste time on invalid codes.
3. As an international visitor, I want starter Jinies guides (Meevy / Catapawn / Blazehound), so that I can choose my starter wisely.
4. As an international visitor, I want a curated Jinies list of officially revealed creatures, so that I can preview the game before CBT.
5. As a Chinese visitor, I want 洛克王国：世界 兑换码、版本更新、新手教程、精灵图鉴, so that I can follow the live CN server.
6. As a Chinese visitor, I want 国际服 CBT 资讯（时间、平台、预约入口、语言说明）, so that I can decide whether to join the international test.
7. As a multilingual visitor, I want zh/en/ja pages to share the same core facts, so that translations do not drift.
8. As a search visitor, I want a clear last-updated date on time-sensitive pages, so that I can trust freshness.
9. As a site owner, I want roco/roco-cn registered in the game registry, so that theme, routes, and labels render consistently.
10. As a site owner, I want the homepage to surface roco/roco-cn priority content, so that new visitors land on the highest-value current pages.
11. As a developer, I want missing optional data to degrade gracefully, so that a not-yet-released game does not break pages.
12. As an SEO operator, I want CBT-related keyword clusters mapped to page intent, so that `Roco Kingdom CBT`, `download`, `redeem codes`, `starters`, `Jinies list` searches land on the right pages.

## Requirements

### P0: 基础接入（注册表 + 数据骨架）

新增 `roco` 与 `roco-cn` 两个完整游戏条目，接入现有注册表与数据层。

**文件清单**：

新建：
- `packages/data/games/roco/`：`types.ts`、`raw-characters.json`、`characters.ts`、`raw-guides.json`、`guides.ts`、`items.ts`、`redeem-codes.ts`、`index.ts`（仿 `sea/` 瘦身模式）
- `packages/data/games/roco-cn/`：同上结构，内容为国服数据
- 图片：`apps/web/public/images/og/{roco,roco-cn}.webp`、`public/images/og/{roco,roco-cn}.jpg`、精灵头像 `apps/web/public/images/{roco,roco-cn}/characters/*.webp`
- `content/roco/`、`content/roco-cn/`：攻略图文目录

修改：
1. `packages/core/types/index.ts:7` — `GameId` 增加 `'roco' | 'roco-cn'`
2. `packages/core/constants/index.ts` — `GAME_IDS`（:21）追加两项；`GAMES` 追加两条配置（仿 `sea` 结构，`roco-cn` 路由按国服能力裁剪）
3. `apps/web/app/sitemap.ts` — `CHAR_GAMES`/`GUIDE_GAMES`/`ITEM_GAMES` 常量数组与 `switch` 分支追加 `roco`/`roco-cn`
4. `apps/web/app/[lang]/page.tsx` — `FEATURED` 与 `getFeaturedChars`（:217 附近）追加分支
5. `apps/web/lib/live-content.ts` — 追加 roco/roco-cn 情报条目（CBT 倒计时、预约、兑换码、版本）

**主题**：童话/魔法大陆感配色 — `roco` 与 `roco-cn` 共享主题色（primary `#4ade80` 草绿 / accent `#f59e0b` 暖黄 / background 深色系）。

**属性（elements）**：经典洛克 ~18 属性克制体系，双条目复用同一份配置；**待确认**世界版具体属性表，MVP 先录入官方已曝光的草/火/毒等，未确认前保持可扩展。

**验收标准**：
- `GAME_IDS` 长度从 10 → 12，首页游戏数同步。
- `/zh/roco-cn/...` 与 `/en/roco/...`、`/ja/roco/...` 路由可访问且无 404。
- 主题色/导航/面包屑/category 标签在三语言下正确渲染。
- 数据缺失时页面优雅降级，不 crash。

### P0: 国际服攻略先行（roco，en/ja）

CBT 前完成国际服核心攻略页，全部带 `lastUpdatedAt` 与官方来源标注。

**页面清单（首批）**：
- `guides/cbt-registration-guide`：CBT 注册/预约步骤、平台（iOS/Android/PS5/Xbox/Windows/Steam/Epic）、语言支持（18 种字幕，配音仅英/日）
- `guides/starter-guide`：御三家选择指南（Meevy / Catapawn / Blazehound）
- `download`：各平台下载入口（Steam 锁国区、无简中需明确标注）
- `version`：CBT 版本专题（10/27 开测、Carosia 大陆介绍）
- `redeem-codes`：CBT 兑换码页（预留，CBT 当日实时更新）
- `characters`：Jinies 图鉴首批（官方曝光的 30~50 只，字段含精灵名/属性/栖息地/进化链）

**验收标准**：
- 每页第一段直接回答主查询（如注册步骤、平台清单）。
- 所有时效页面显示更新日期。
- 未确认信息（如具体属性翻译名、剩余精灵）标注为 watch/monitor，不写成事实。
- 页面间内链互通（version ↔ download ↔ guides ↔ characters ↔ redeem-codes）。

### P1: 国服内容承接（roco-cn，zh）

国服已上线 5 个月，优先承接可持续的搜索流量。

**页面清单**：
- `redeem-codes`：国服兑换码（区分 active/expired）
- `version`：当前版本 + 更新内容摘要
- `guides`：新手教程、精灵培养入门
- `characters`：国服热门精灵图鉴首批

**验收标准**：
- 兑换码页区分生效/过期且显示最后检查日期。
- 版本页含当前版本名、更新时间和内链。
- 不搬运国际服数据到国服条目（数据隔离）。

### P1: SEO 与情报面板

- 首页 live 模块新增 roco CBT 倒计时/预约/兑换码情报（`live-content.ts`）。
- 关键词集群（en）：`Roco Kingdom CBT registration` / `Roco Kingdom download` / `Roco Kingdom redeem codes` / `Roco Kingdom starters` / `Jinies list`。
- 关键词集群（zh）：洛克王国世界国际服 / 公测时间 / 下载 / 兑换码 / 精灵图鉴。
- 发布后经 IndexNow 提交、sitemap 高优先级标记。

**验收标准**：
- 首页情报面板显示 CBT 倒计时与预约入口。
- en/zh 关键词集群各覆盖 ≥3 个落地页。
- 新页面纳入 sitemap 并在部署后 IndexNow 提交。

### P2: 二期扩展（数据积累后）

- `tier-list`：CBT 后基于实测数据出节奏榜。
- `map`：Carosia 大陆地图页。
- `build`/`teams`/`compare`/`calculator`：视数据完整度逐项开启。

## Implementation Decisions

- 新增条目时**保持现有注册表为唯一事实源**，不引入 region 维度（双条目即 region 表达）。
- `roco` 对应官方英文名 Roco Kingdom（大陆名 Roco Kingdom: World），`roco-cn` 对应国服洛克王国：世界。
- 数据层沿用 `raw-*.json` + TS 封装模式，精灵字段仿 `sea/characters.ts`。
- 国际服数据优先录官方预告/媒体稿（PC Gamer / GamingTrend / Polygon 已有详实素材），不采内鬼/解包数据。
- 图片优先使用科隆展官方宣传图（需确认引用合规），必要时先无图占位，不阻塞发布。
- 属性体系与稀有度模型在官方未公布前保持占位且可扩展。
- 时效内容统一复用现有 `lastUpdatedAt`/freshness 显示约定。
- 本期不建设 CMS、不做社区/UGC，只做数据与内容接入。

## Testing Decisions

Tests should focus on externally visible behavior and data integrity.

Required tests:
- 注册表测试：`GAME_IDS` 长度、新增 gameId 校验通过，现有 10 游戏回归不破坏。
- 数据完整性测试：roco/roco-cn 的 raw-*.json 通过现有 schema 校验（gameId、必填字段、多语言字段）。
- 路由渲染测试：`/zh/roco-cn`、`/en/roco`、`/ja/roco` 及子路由可渲染。
- 首页测试：FEATURED 分支不因 roco 缺图/缺角色而渲染坏链或报错。
- sitemap 测试：新页面 URL 被收录且按 `hasLocalizedContent` 正确过滤。
- live-content 测试：CBT 倒计时数据合法，未开始游戏不显示过期信息。
- 缺数据降级测试：空 characters/items 时页面正常显示空态。

Prior art:
- 现有 `sea` 新游瘦身接入（最低配置模板）。
- 现有 `apps/web/lib/games/registry.ts` 注册表机制。
- 现有数据完整性测试与 sitemap 测试。

## Out of Scope

- 400+ 精灵全量数据录入（只录官方已曝光批次，其余 CBT 后持续补充）。
- 社区、评论、用户投稿功能。
- 属性克制计算器/对战模拟（数据未公开前不做）。
- 内鬼/解包/私服数据作为内容来源。
- 国服与国际服数据互通（官方设定即隔离）。
- 引入 region 路由维度。

## Success Metrics

Primary metrics:
- 首页与 CBT 攻略页在 10/27 前进入 Google/Bing 索引并获得 impressions。
- `Roco Kingdom CBT registration` / `download` / `redeem codes` 等词在 CBT 期间进入 SERP 前 50。
- roco/roco-cn 上线后 30 天内站内新增页面数量 ≥ 20。
- 站内 404 率不因新增条目上升。

Initial targets:
- M1 结束（9/5）时两个条目路由全通、首页可挂载。
- M2 结束（9/20）时国际服核心攻略页 ≥ 8 个（en/ja）。
- M3 结束（10/10）时国服页面 ≥ 5 个（zh）。
- 10/27 CBT 当日兑换码/开服信息 24h 内更新上线。

## Rollout Plan

### M1: 基础接入（8/27 – 9/5）
- registry + GameId + GAMES 配置（roco / roco-cn）
- 数据骨架（characters / guides / items / redeem-codes 空态就位）
- OG 图占位、首页挂载、sitemap 分支
- 全量测试通过

### M2: 国际服攻略（9/6 – 9/20）
- en/ja：CBT 注册指南、下载页、预约奖励、御三家指南、Jinies 图鉴首批、兑换码页、CBT 版本专题
- live-content CBT 情报面板上线
- IndexNow 提交第一批 URL

### M3: 国服内容（9/21 – 10/10）
- zh：兑换码、版本更新、新手教程、热门精灵图鉴首批
- en/ja 长尾关键词文章批量生产

### M4: CBT 冲刺（10/11 – 10/27）
- 开服倒计时专题
- CBT 当日兑换码/开服信息实时更新
- sitemap 高优先级提交、GSC 监控

## Risks & Open Questions

| # | 风险/待确认 | 影响 | 对策 |
|---|---|---|---|
| 1 | 官方暂用名 "Roco Kingdom"（大陆名 Roco Kingdom: World），后续可能改名 | `roco` ID 稳定性 | ID 用 `roco` 已最短化，改名只影响 name 文案不动 ID |
| 2 | 世界版属性表未公开 | elements 配置可能返工 | 保持 id 稳定、名称可改，MVP 只录已曝光属性 |
| 3 | 精灵双语名未全部确认 | 图鉴数据需返工 | 只录官方/媒体确认的 30~50 只，其余 CBT 后补 |
| 4 | 国际服图片素材合规性 | 视觉质量 | 优先官方宣传图并标注来源，必要时无图占位 |
| 5 | Steam 锁国区、无简中 | zh 用户的 roco 攻略定位 | roco 的 zh 文案聚焦国际服资讯/预约指南，攻略主承接到 roco-cn |
| 6 | 双条目导致首页列表变长 | 首页拥挤 | 新条目置于 FEATURED 优先位，目录区保持紧凑 |
