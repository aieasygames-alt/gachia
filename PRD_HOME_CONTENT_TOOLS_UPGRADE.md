# PRD: Gachia 首页与时效内容工具升级

> 日期: 2026-07-26  
> 状态: Draft  
> 范围: 首页升级、时效内容刷新、Banner/兑换码/抽卡/材料工具

## Problem Statement

Gachia 当前已经具备多游戏、多语言、百科页、攻略页、工具页和 SEO 基础，但首页仍偏向“游戏目录页”，没有充分承接用户最强的即时搜索意图。

从 GSC 数据看，站点已经获得大量曝光，尤其是 WuWa、HSR、Genshin 的 banner schedule 页面，但 CTR 偏低。用户搜索这些词时，期望快速看到当前卡池、下期卡池、兑换码、版本时间、推荐抽取、更新时间等高时效信息，而不是先进入普通 Wiki 导航。

因此需要将首页和核心内容页升级为“实时攻略入口 + 工具型数据库”，提升 CTR、停留时间、内链效率和复访率。

## Solution

将 Gachia 首页升级为多游戏情报中枢，并同步更新高时效内容与关键工具。

核心方向:

- 首页从“游戏列表页”升级为“今日游戏情报中心”。
- 优先更新高曝光、低 CTR 的 banner schedule、version、redeem codes 页面。
- 新增或强化 Banner Tracker、Redeem Code Checker、Pull Planner、Material Planner 等工具。
- 在游戏首页、攻略页、工具页之间建立更强内链。
- 所有时效内容显示明确更新时间，增强搜索结果和用户信任。

## User Stories

1. As a Gachia visitor, I want to see current banners on the homepage, so that I can quickly know what is available now.
2. As a WuWa player, I want to see current and upcoming banners, so that I can decide whether to pull now or save.
3. As a HSR player, I want a clear banner schedule page, so that I can plan Stellar Jade usage.
4. As a Genshin player, I want the current version and next version links surfaced, so that I can follow patch content quickly.
5. As a ZZZ player, I want version 3.1 content highlighted before launch, so that I can prepare for new characters and events.
6. As a mobile user, I want the homepage first screen to show high-value links, so that I do not need to scroll through all game categories.
7. As a search visitor, I want a direct quick answer at the top of guide pages, so that I can get the answer without scanning the whole article.
8. As a returning user, I want to see which content was updated recently, so that I know whether the site is current.
9. As a player, I want redeem codes grouped by active and expired status, so that I do not waste time testing invalid codes.
10. As a player, I want a pull planner, so that I can estimate whether my resources are enough for a target character.
11. As a player, I want a material planner, so that I can calculate upgrade gaps before farming.
12. As a site owner, I want high-impression pages to receive stronger homepage links, so that SEO authority flows to pages with ranking opportunity.
13. As a content editor, I want a repeatable update model for banners, codes, and versions, so that future patches can be updated quickly.
14. As a multilingual visitor, I want the same time-sensitive information in Chinese, English, and Japanese, so that language pages stay consistent.
15. As a user comparing games, I want a cross-game calendar, so that I can see upcoming banners, patches, livestreams, and code deadlines in one place.

## Requirements

### P0: Homepage Upgrade

The homepage should become a multi-game live hub.

Required modules:

- Current banners block
- Latest redeem codes block
- Version updates block
- Popular guides block
- Game cards with prioritized CTAs
- Recently updated content section

Homepage should prioritize games based on current search opportunity:

1. Wuthering Waves
2. Honkai: Star Rail
3. Genshin Impact
4. Neverness to Everness
5. Zenless Zone Zero

Acceptance criteria:

- First viewport shows actionable content, not only brand copy.
- Each priority game has direct links to banner, codes, version, and guides.
- Homepage includes visible update freshness, such as `Updated Jul 26, 2026`.
- Game count matches actual registry count.
- Missing featured character issues are fixed or gracefully hidden.
- Mobile layout keeps the highest-value links above long game directory content.

### P0: Banner Schedule Content Refresh

Refresh and optimize banner pages for WuWa, HSR, and Genshin.

Required content:

- Current banner
- Upcoming banner
- Start/end dates
- Featured characters/weapons
- Pull recommendation summary
- FAQ
- Last updated date
- Internal links to characters, weapons, builds, and redeem codes

Acceptance criteria:

- Page title targets high-intent queries, for example `WuWa Banner Schedule: Current and Next Banners`.
- Meta description includes current/next banner phrasing.
- First section answers the main query in 2-4 sentences.
- Page links back to the relevant game hub and homepage live module.
- English pages are prioritized first because GSC opportunity is strongest there.

### P1: Redeem Code Checker

Create or upgrade redeem code pages into a clearer tool-like experience.

Required content:

- Active codes
- Expired codes
- Rewards
- Redemption instructions
- Platform notes
- Last checked date

Acceptance criteria:

- Active and expired codes are visually separated.
- Empty active code states are handled cleanly.
- Each game page links to redeem codes from its game homepage.
- Schema/FAQ content is included where appropriate.

### P1: Version Hub Refresh

Update version pages and game homepage copy for current versions.

Priority updates:

- ZZZ 3.1
- WuWa 3.5
- HSR 4.4
- Genshin current/next version content

Acceptance criteria:

- Outdated version references are corrected.
- Game homepage top section includes current version and key links.
- Version pages link to banner, new characters, codes, and guides.
- Each version page has a clear “What changed?” summary.

### P1: Pull Planner

Add a lightweight pull planner tool.

Inputs:

- Current pulls
- Current pity
- Guarantee status
- Available currency
- Target copies
- Banner end date

Outputs:

- Estimated total pulls
- Chance/risk status
- Required additional pulls
- Days remaining
- Suggested next step

Acceptance criteria:

- Tool works without login.
- Results are shareable or copyable.
- Calculations are transparent enough for users to trust.
- Initial launch supports HSR, Genshin, WuWa, and ZZZ.

### P2: Material Planner

Upgrade existing calculator/build tooling into a material planning experience.

Required features:

- Select game
- Select character
- Select current and target level
- Optional skill/talent target
- Inventory input
- Required materials and missing materials

Acceptance criteria:

- Works from character pages and calculator pages.
- Uses existing data packages where available.
- Missing data is handled with a clear unavailable state.
- Supports localStorage persistence.

### P2: Cross-Game Calendar

Add a cross-game calendar page.

Included event types:

- Banner start/end
- Version updates
- Livestreams
- Redeem code deadlines
- Major events

Acceptance criteria:

- Calendar supports game filters.
- Events link to relevant game pages.
- Homepage links to the calendar from the live hub.
- Events include timezone-aware dates where possible.

## Implementation Decisions

- Use the existing `GAME_IDS` and `GAMES` registry as the source of truth for homepage game ordering and labels.
- Create a normalized live content data layer for banners, codes, version updates, and calendar events.
- Prefer static data files first, with future option to move highly dynamic data to D1.
- Homepage should consume curated live data rather than hardcoded large blocks.
- Keep multilingual content aligned by using the existing `zh/en/ja` message/data pattern.
- Prioritize English content refresh first because current GSC opportunities are strongest there.
- Avoid expanding to more games until homepage, banner, codes, and version freshness are stable.
- Use existing UI primitives in `components/ui` and existing game theme variables.
- Keep Cloudflare compatibility: no Node-only runtime dependencies in request paths.

## Testing Decisions

Tests should focus on external behavior and data integrity, not internal implementation details.

Required tests:

- Homepage renders all enabled games and priority live modules.
- Game count matches registry.
- Live content data validates required fields.
- Banner pages render current/upcoming sections when data exists.
- Redeem code pages correctly separate active and expired codes.
- Pull planner calculation returns expected results for representative scenarios.
- Missing optional data does not crash pages.
- Supported locales render without missing critical labels.

Prior art:

- Existing data integrity tests in the data package.
- Existing security/API boundary tests in the web app.

## Out of Scope

- Full community system.
- Comments or user-generated guides.
- Real-time automated scraping.
- Paid API integrations.
- Native mobile app.
- Adding more games before improving current content quality.
- Large visual redesign of every detail page.
- Replacing the existing Cloudflare/OpenNext architecture.

## Success Metrics

Primary metrics:

- Increase homepage CTR from search.
- Increase CTR on top banner schedule pages.
- Increase internal clicks from homepage to guide/tool pages.
- Reduce stale version references.
- Increase returning users through tools.

Initial targets:

- Top banner schedule pages reach at least 2-3% CTR.
- Homepage links to all P0 opportunity pages.
- All priority version pages updated within 48 hours of major patch news.
- Redeem code pages show explicit freshness dates.
- Pull planner reaches usable MVP across 4 core games.

## Rollout Plan

### Phase 1: Homepage + Content Freshness

- Upgrade homepage live hub.
- Fix game count and featured character inconsistencies.
- Refresh WuWa, HSR, Genshin banner schedule pages.
- Add freshness labels.

### Phase 2: Codes + Version Hubs

- Upgrade redeem code pages.
- Refresh ZZZ, WuWa, HSR, Genshin version pages.
- Strengthen internal links from game homepages.

### Phase 3: Tools

- Build Pull Planner MVP.
- Upgrade Material Planner where data is available.
- Add cross-game calendar MVP.

### Phase 4: Measurement

- Re-run GSC report after indexing.
- Compare CTR and impressions.
- Promote winning modules to more games.
- Remove or downgrade modules with low engagement.

