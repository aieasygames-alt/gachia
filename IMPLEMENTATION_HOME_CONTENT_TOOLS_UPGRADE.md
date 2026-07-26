# Implementation Plan: 首页与时效内容工具升级

> 对应 PRD: `PRD_HOME_CONTENT_TOOLS_UPGRADE.md`  
> 建议执行方式: 小步提交，先首页与内容刷新，再工具化

## Phase 1: Homepage Live Hub

目标: 把首页从游戏目录升级为多游戏实时入口。

### 1.1 新增 live content 数据层

新增一个静态数据模块，集中维护首页所需的时效信息。

建议数据类型:

- `LiveBanner`
- `LiveRedeemCodeSummary`
- `LiveVersionUpdate`
- `LiveGuideLink`
- `LiveCalendarEvent`

关键字段:

- `gameId`
- `locale`
- `title`
- `summary`
- `href`
- `startsAt`
- `endsAt`
- `updatedAt`
- `status`
- `priority`

验收:

- 数据支持 `zh/en/ja`。
- 首页不直接硬编码每个模块的大段文案。
- TypeScript 能约束 `gameId`、`locale`、`status`。

### 1.2 重构首页首屏

首页首屏模块:

- Hero: 保留品牌，但缩短文案。
- Current Banners: 展示 3-5 个最高优先级卡池。
- Redeem Codes: 展示最新可用码摘要。
- Version Watch: 展示即将上线/刚上线版本。
- Popular Guides: 展示 GSC 机会页。

验收:

- 移动端首屏能看到至少 2 个可点击的高价值入口。
- 桌面端首屏不只展示品牌介绍。
- 所有入口都使用现有 i18n `Link`。
- 首页 `9 Games` 修正为真实游戏数量。

### 1.3 优化游戏卡片

改造现有游戏卡片:

- 保留游戏封面图。
- 只展示 3-5 个优先 CTA。
- 非关键分类收进 “More” 或下方模块。

优先 CTA:

- Banner
- Redeem Codes
- Version
- Characters
- Guides

验收:

- 每个游戏卡片不会出现过多 chip。
- 禁用路由不显示。
- 缺失特定工具的游戏不显示空链接。

### 1.4 修复精选角色展示

问题:

- 部分游戏的 featured character ID 和数据 ID 不一致。
- 部分游戏无足够角色时首页应隐藏该区块。

验收:

- 首页不出现空白精选角色区域。
- 图片加载失败时布局不塌。
- `FEATURED` 中的 ID 和数据源一致，或使用安全 fallback。

## Phase 2: High-Opportunity Content Refresh

目标: 先吃掉 GSC 中曝光高但 CTR 低的页面机会。

### 2.1 Banner Schedule 页面

优先页面:

- WuWa banner schedule
- HSR banner schedule
- Genshin banner schedule

页面结构:

- Quick answer
- Current banner
- Next banner
- Banner timeline
- Pull recommendation
- Related character/build links
- FAQ
- Last updated

验收:

- title/meta description 明确包含 current/next/banner schedule。
- 首屏 2-4 句回答核心搜索意图。
- 页面有内部链接回游戏首页、角色页、武器页、兑换码页。
- FAQ 可被后续 JSON-LD 复用。

### 2.2 Version 页面

优先游戏:

- ZZZ
- WuWa
- HSR
- Genshin

页面结构:

- Current version
- Release date
- New characters
- New weapons/items
- Events
- Codes and rewards
- What to do first

验收:

- 删除或替换明显过期版本号。
- 每个优先游戏首页都链接到版本页。
- 版本页链接到 banner、codes、characters、guides。

### 2.3 Redeem Codes 页面

页面结构:

- Active codes
- Expired codes
- Reward summary
- How to redeem
- Troubleshooting
- Last checked

验收:

- active/expired 分组明确。
- 无 active code 时给出自然空状态。
- 数据层包含 `checkedAt` 或页面明确显示更新时间。

## Phase 3: Tool MVPs

目标: 增加能带来复访和长尾搜索的工具。

### 3.1 Pull Planner

建议路径:

- `/{lang}/tools/pull-planner`
- 或首版挂在 `/{lang}/{game}/calculator` 下，作为 tab。

首版支持:

- Genshin
- HSR
- WuWa
- ZZZ

计算输入:

- current pulls
- current pity
- guaranteed
- target copies
- currency
- banner end date

计算输出:

- available pulls
- estimated missing pulls
- days remaining
- risk status
- short recommendation

验收:

- 不登录可用。
- localStorage 保存最近输入。
- 关键计算逻辑有单元测试。
- 不依赖 Cloudflare D1。

### 3.2 Material Planner

首版策略:

- 复用现有 `calculator` 页面。
- 数据足够的游戏先开放。
- 数据不足时显示 unavailable，不做假数据。

验收:

- 能选择角色和目标等级。
- 能输入库存。
- 能计算缺口。
- 数据缺失不导致页面崩溃。

### 3.3 Cross-Game Calendar

建议路径:

- `/{lang}/calendar`

事件类型:

- banner_start
- banner_end
- version_release
- livestream
- code_expiry
- event_start
- event_end

验收:

- 支持按游戏过滤。
- 每个事件能跳转到详情页。
- 首页 live hub 有入口。

## Phase 4: Measurement and Iteration

目标: 用 GSC 数据验证改动效果。

### 4.1 GSC 复盘

执行节奏:

- 发布后一周导出 GSC。
- 运行现有 `gsc:report`。
- 对比 page CTR opportunity 是否下降。

关注指标:

- 首页点击数
- banner schedule CTR
- version 页面 impressions
- redeem codes 页面 impressions
- mobile CTR

### 4.2 内容迭代规则

建议规则:

- 曝光 > 1000 且 CTR < 1%: 优先重写 title/meta/首屏。
- 平均排名 5-10 且 CTR < 2%: 加 quick answer 和 FAQ。
- 平均排名 10-20 且曝光持续增长: 增加内链和内容深度。
- 时效页超过 7 天未更新: 标记为需要复查。

## Suggested Commit Breakdown

1. `feat(web): add live content data model`
2. `feat(web): upgrade homepage live hub`
3. `fix(web): correct homepage stats and featured characters`
4. `feat(content): refresh banner schedule pages`
5. `feat(content): upgrade redeem code freshness sections`
6. `feat(web): add pull planner mvp`
7. `feat(web): add cross-game calendar mvp`
8. `test(web): cover live content and planner behavior`

## Initial Risk List

- 时效内容如果靠手动维护，后续容易再次过期。
- 多语言同步成本高，需要优先保证英文机会页，再同步中日文。
- 当前部分动态 API 依赖 D1/R2，本计划中的工具首版应避免新增运行时绑定依赖。
- 首页如果信息过多，会变成新的杂乱目录，需要保持模块数量克制。

