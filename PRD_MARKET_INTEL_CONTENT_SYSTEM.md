# PRD: Gachia 游戏情报采样转内容生产系统

> 日期: 2026-08-14  
> 状态: Draft  
> 来源: `plans/market-intel-2026-08-14.md` 与 `/tmp/gachia-suggest-2026-08-14.json`  
> 范围: 游戏情报采样、内容优先级、版本页/下载页/兑换码页/专题页更新、搜索词治理

## Problem Statement

Gachia 已经覆盖 10 个游戏，并具备版本页、下载页、兑换码页、攻略页、日历页、首页 live 模块和多语言基础。但当前内容更新依赖人工阅读情报报告后再分散修改，容易出现三个问题：

1. 高时效词从采样到落地页面之间没有标准产品流程，导致版本窗口、活动窗口和平台上线窗口被错过。
2. `live-content`、`version-snapshots`、游戏版本页、兑换码页和攻略页之间缺少统一更新机制，更新时间、优先级和页面 CTA 容易不一致。
3. 搜索联想词中混入成人、同人、mod、内鬼、解包、非官方下载等低质或高风险词，如果没有治理规则，可能污染站内搜索、标题、相关推荐和内容规划。

因此需要把“市场情报采样报告”产品化为一个可重复执行的内容生产系统，让每次采样都能转成明确的页面更新、专题创建、内链调整、治理规则和验收标准。

## Solution

建立一套“情报采样 -> 机会评分 -> 内容任务 -> 页面更新 -> 质量验收”的轻量产品流程。

系统应支持编辑者把每轮情报报告转成结构化内容机会，并驱动以下页面和模块更新：

- 首页 live 情报模块
- 游戏版本页
- 下载/平台 FAQ
- 兑换码页
- 高时效专题页
- 新游测试/预注册时间线
- 站内搜索与相关推荐治理规则

本期以 2026-08-14 采样为首个落地批次，优先承接：

- 原神 7.0 / 至冬
- 鸣潮 3.6 / Xbox / Steam
- 绝区零 3.1 后半 / 平台页
- 失控进化 8 月联动 / 上线后攻略
- 终末地 8 月活动 / 全面测试资格
- NTE 1.2 后半、星铁 4.x、遗忘之海、无限大、归环的 P1 长尾承接

## User Stories

1. As a Gachia editor, I want each market-intel report to become a prioritized content backlog, so that I know which pages to update first.
2. As a Gachia editor, I want P0/P1/P2 opportunities separated by urgency, so that version-window pages are not delayed by evergreen pages.
3. As a Gachia editor, I want every opportunity tied to a game, keyword cluster, target page, and recommended action, so that execution does not require rereading the whole report.
4. As a Gachia editor, I want risky search terms clearly marked, so that I avoid adult, leak, mod, unpacking, and unofficial-download content.
5. As a Gachia editor, I want source links and sample dates preserved, so that future updates can be audited.
6. As a site owner, I want homepage live modules updated from current intelligence, so that users land on the highest-value current content.
7. As a site owner, I want version pages to show current patches and next-step links, so that search visitors can continue into codes, banners, builds, and guides.
8. As a site owner, I want download pages to distinguish official launcher, Steam, Microsoft Store, App Store, Google Play, TapTap, and cloud gaming, so that unsafe download intent is not amplified.
9. As a site owner, I want未定档 games to use a consistent official-status disclaimer, so that we do not accidentally publish false release dates.
10. As a Genshin visitor, I want the version page to surface 7.0, Snezhnaya, Sandrone, Columbina, banners, maps, and codes, so that I can follow the next patch without searching elsewhere.
11. As a Star Rail visitor, I want 4.x, Fate collaboration, Gilgamesh, Kafka, Cyrene, banners, codes, and team-builder links grouped, so that I can plan pulls efficiently.
12. As a Wuthering Waves visitor, I want 3.6, Xbox, Steam, current banners, codes, characters, and map links together, so that I can start or return on the right platform.
13. As a ZZZ visitor, I want 3.1, compensation, current agents, Steam, Microsoft Store, Xbox, and account-linking guidance, so that platform onboarding is clear.
14. As an NTE visitor, I want Shinku, Iroi, 999 Nights, codes, download, Steam, and official update status in one route, so that I understand the current patch.
15. As a Guihuan visitor, I want release timing, developer, official site, test access, and international-server status clarified, so that I do not rely on rumors.
16. As an Ananta visitor, I want preregistration, beta, gameplay, no-gacha claims, PC, Steam, Xbox, and official status separated from speculation, so that expectations are realistic.
17. As an Endfield visitor, I want beta/test recruitment, August activities, characters, blueprint, AIC factory, download, and code pages linked, so that I can follow test-era content.
18. As a Sea of Remnants visitor, I want Steam, mobile launch, release date, gameplay, gacha, solo play, and console FAQ clarified, so that platform questions are answered quickly.
19. As an Ashfall Evolution visitor, I want official download, Steam status, beginner route, server mode, base defense, PC setup, and current collaboration content, so that I can play without wasting early resources.
20. As a multilingual visitor, I want Chinese, English, and Japanese pages to share the same core facts, so that translations do not drift.
21. As a search visitor, I want a clear “last updated” date on time-sensitive pages, so that I can trust the freshness of the information.
22. As a returning visitor, I want recently updated content surfaced on the homepage, so that I can quickly see what changed since my last visit.
23. As a content QA reviewer, I want acceptance criteria for each updated page type, so that I can verify content quality consistently.
24. As a developer, I want live content and version snapshots to be data-driven, so that updates are small and testable.
25. As a developer, I want validation for content opportunity data, so that malformed links, stale dates, or unsupported game IDs fail early.
26. As a developer, I want risky keyword filters tested as external behavior, so that unsafe terms do not appear in rendered search suggestions or content recommendations.
27. As a developer, I want missing optional data to degrade gracefully, so that new or unreleased games do not break pages.
28. As an SEO operator, I want keyword clusters mapped to page intent, so that `codes`, `download`, `wiki`, `release date`, `beta`, and `banner` searches go to the right pages.
29. As an SEO operator, I want internal links from version pages to codes, banners, characters, guides, and downloads, so that authority flows to high-intent pages.
30. As an SEO operator, I want the system to preserve rejected keywords, so that governance decisions are visible and repeatable.

## Implementation Decisions

- The 10-game registry remains the source of truth for supported games and labels.
- Market intelligence should be represented as structured content opportunities with fields for game, priority, keyword cluster, target page, action type, status, source date, source URLs, and risk flags.
- The first implementation can use static TypeScript or JSON data committed with the site, with a future option to move frequently changing intelligence to a database.
- Existing live modules should consume curated intelligence rather than hardcoded stale copy.
- Version snapshots should be updated from the same opportunity data, or at minimum validated against it for current version names, update dates, and priority links.
- Each opportunity should map to one of these action types: update existing page, create专题 page, refresh metadata, add FAQ, add internal links, update live module, update download route, update code route, monitor only, or reject.
- Risky keywords should not be deleted from the intelligence record; they should be stored as rejected or governance terms with a reason.
- 未定档 games must render a standardized official-status note on version, download, and test-status pages.
- Download pages must separate official platform options from community mirrors, unofficial APKs, private servers, and ambiguous “international server” claims.
- Search-intent clusters should be normalized across languages, for example `codes`, `redeem code`, `兑换码`, and `交換コード` should map to the same content type.
- P0 pages for the 2026-08-14 batch should be implemented before broader automation work, because these are time-sensitive.
- The implementation should avoid a heavy CMS unless repeated manual updates become the bottleneck.
- The initial editor workflow may be Markdown-first, but page-facing data should remain typed and testable.
- All current-page updates should include `lastUpdatedAt` or equivalent freshness display.
- The system should preserve source attribution at the report/PRD level without requiring every rendered page to list all raw采样 sources.
- UI changes should follow the existing restrained Gachia dashboard/wiki style and reuse current components.
- No user-generated content, comments, or community posting features are part of this PRD.

## Requirements

### P0: Content Opportunity Backlog

Create a structured backlog for the 2026-08-14 intelligence batch.

Required fields:

- Game
- Priority
- Opportunity title
- Keyword cluster
- Target page or page family
- Recommended action
- Content status
- Source date
- Source URL list
- Risk terms
- Owner/status placeholder

Acceptance criteria:

- All 10 games from the registry are represented.
- P0 and P1 items from the intelligence report are included.
- Each P0 item has at least one concrete target page.
- Risk terms are separated from承接 keywords.
- Unsupported game IDs cannot be introduced silently.

### P0: Version Snapshot Refresh

Refresh version snapshot data and version-page copy using the 2026-08-14 report.

Priority updates:

- Genshin: 7.0 / Snezhnaya / Sandrone / Columbina
- WuWa: 3.6 / Xbox / Steam / codes / banners
- ZZZ: 3.1後半 / compensation / platforms
- SKJH: 2026-08-14 collaboration / post-launch beginner content
- Endfield: August activities / test recruitment / blueprint / AIC
- NTE: 1.2後半 / Iroi / 999 Nights

Acceptance criteria:

- Current visible copy no longer depends on stale 2026-08-03 assumptions where newer intelligence exists.
- Version pages include links to relevant code, download, guide, character, build, or map pages.
- Each updated page displays a freshness date.
- Unconfirmed future version dates are worded as watch/monitor items, not confirmed facts.

### P0: Homepage Live Intelligence Refresh

Update homepage live modules to reflect the newest P0/P1 intelligence.

Required modules:

- Top live version updates
- Current code opportunities
- Priority guide links
- Platform/download links where search demand is strong
- Watchlist for unreleased games

Acceptance criteria:

- P0 games appear before lower-priority evergreen items.
- Homepage priorities are aligned with the 2026-08-14 report.
- Links route to existing pages or explicitly tracked new-page tasks.
- Missing target pages do not render broken links.

### P0: Keyword Governance

Add or formalize keyword filtering for content planning, internal recommendations, and search suggestions.

Blocked or risky categories:

- Adult or pornographic terms
- 同人 / explicit derivative terms
- Leak / 内鬼 terms
- Mod / unpacking / AES key / datamine terms
- Private server / 公益服 / unofficial APK terms
- Ambiguous off-topic terms such as math-symbol `无限大符号` or `Ashfall Nebraska`

Acceptance criteria:

- Risk terms from the 2026-08-14 sample are documented.
- Rendered search suggestions and recommendation modules do not intentionally surface blocked terms.
- Governance rules allow manual review for ambiguous terms instead of automatic publication.

### P1: Download And Platform FAQ Pages

Strengthen download/platform pages for games where search intent is clear.

Priority games:

- WuWa: Xbox / Steam / Game Pass
- ZZZ: Steam / Microsoft Store / Xbox
- Sea of Remnants: Steam / mobile / PS5/Xbox status
- SKJH: official launcher / WeGame / mobile / PC
- NTE, Endfield, Ananta, Guihuan: official site, preregistration, tests, platform status

Acceptance criteria:

- Each page distinguishes confirmed official channels from unconfirmed or unsafe channels.
- Platform availability is written with exact dates where known.
- If a game is unreleased or test-only, the page says so clearly.
- Download pages link back to version, guides, and codes where applicable.

### P1: High-Intent专题 Pages

Create or refresh专题 pages for search clusters that cannot be cleanly handled by generic version pages.

Initial topics:

- `Genshin Impact 7.0 / Snezhnaya hub`
- `Sandrone build`
- `Columbina banner FAQ`
- `Wuthering Waves Xbox / Steam beginner FAQ`
- `WuWa 3.6 banners and codes`
- `ZZZ Steam / Microsoft Store / Xbox account FAQ`
- `SKJH server mode selector`
- `SKJH anti-raid base placement`
- `SKJH first 0-2 hours route`
- `Endfield blueprint / AIC factory intro`
- `Endfield test recruitment FAQ`
- `Sea of Remnants Steam / release date / gacha / solo FAQ`
- `Ananta official known info / preregistration / beta FAQ`
- `Guihuan official known info / test timeline FAQ`

Acceptance criteria:

- Each专题 page answers the main query in the first section.
- Each page includes an explicit last-updated date.
- Each page links to the relevant version/download/codes/game hub.
- 未定档 pages avoid fabricated dates and clearly separate confirmed facts from speculation.

### P1: Editorial Workflow

Define a repeatable workflow for future采样 reports.

Workflow:

1. Collect official updates, social/community热点, and search suggestions.
2. Normalize keywords into content-intent clusters.
3. Assign P0/P1/P2 priority.
4. Convert each item into a content opportunity.
5. Update live modules and version snapshots.
6. Create or refresh target pages.
7. Run validation tests.
8. Record completed and deferred items.

Acceptance criteria:

- Future reports can be converted without reinventing the format.
- Deferred items remain visible for the next sampling cycle.
- Editors can see which opportunities were rejected and why.

### P2: Intelligence Archive And Comparison

Add a lightweight archive view or document convention for comparing weekly changes.

Acceptance criteria:

- Each采样 batch has a date, source path, and generated PRD/action plan.
- New, recurring, and dropped keyword clusters can be compared manually.
- The archive does not need a full UI in the first release.

## Testing Decisions

Tests should focus on externally visible behavior and data integrity rather than internal implementation details.

Required tests:

- Content opportunity data validates supported game IDs, priority values, URLs, dates, and action types.
- Homepage live modules render prioritized opportunities without broken links.
- Version pages render updated snapshots and freshness dates for P0 games.
- Unreleased/test-stage games render official-status notes.
- Download/platform pages do not present unconfirmed channels as official.
- Keyword governance filters blocked terms from rendered recommendation/search surfaces.
- Missing optional content does not crash game pages.
- Multilingual pages render required labels and avoid missing critical copy.

Prior art:

- Existing live-content tests.
- Existing version-snapshot tests.
- Existing data-integrity tests in the data package.
- Existing security-boundary tests for unsafe content and API behavior.

## Out of Scope

- Building a full CMS.
- Automatic publishing from raw search suggestions.
- Scraping private social media data or bypassing platform access controls.
- User comments, community投稿, or voting systems.
- Supporting games outside the current Gachia registry.
- Accepting leak, datamine, adult, private-server, or unofficial-download content as SEO targets.
- Guaranteeing exact release dates for games without official announcements.
- Full automation of source verification in the first release.

## Further Notes

- The 2026-08-14 report should be treated as the seed batch for the system.
- `/tmp/gachia-suggest-2026-08-14.json` is an ephemeral raw sample; durable decisions should live in repository documents or typed data.
- The current codebase already has useful hooks for this work: game registry, live content data, version snapshots, version pages, download pages, redeem-code pages, guide data, and tests.
- The first implementation should favor small, reviewable updates: refresh existing data, add governance constants, then add new专题 pages only where search intent is strong.
