# 遗忘之海（Sea of Remnants）建站执行规划

> 域名：`gachia.com/zh/sea/`（子目录方案，复用 Gachia 主域权重）
> 数据源：仓库根目录 `sea-of-remnants-content.md`（三测破晓号测试数据，2026.05.28–06.19）
> 关键节点：**2026.06.26 前瞻直播** → **2026.07 公测定档**
> 内容策略：**精修不批量**（核心页人工打磨，长尾页按统一 schema 模板化，但不做 AI 灌水）
> 撰写日期：2026.06.25 · **修订：2026.06.25（v2.0 — 对齐已就位现状）**

---

## 0. 当前状态快照（2026.06.25）

**结论：sea 子站早已全链路接入 Gachia，是一个完整可用、已通过生产构建验证的游戏子站。**

### 已完成项

| 维度 | 状态 | 说明 |
|------|------|------|
| GameId 注册 | ✅ | `packages/core/constants/index.ts` — sea 是 Gachia 第 9 个游戏 |
| 主题色 | ✅ | `apps/web/app/globals.css` `:root[data-game="sea"]` — primary `#e11d48`（玫红）/ accent `#06b6d4`（青）/ bg `#0c1222` |
| 游戏首页 | ✅ | `/zh/sea` — Banner + 启用 route 导航 + 精选 4 角色 + 精选攻略 + SEO 文案（中/英/日三语 description 已配） |
| 角色列表 | ✅ | `/zh/sea/characters` — `SeaCharactersPage` + `SeaCharacterCard` 组件已实现 |
| 角色详情 | ✅ | `/zh/sea/characters/{id}` — 18 个角色全部 SSG 静态化，`SeaCharacterDetail` 组件 |
| 节奏榜 | ✅ | `/zh/sea/tier-list` — `SeaTierListPage` 组件，按 tierRank 渲染 |
| 攻略列表 | ✅ | `/zh/sea/guides` — `SeaGuides` 组件 + 分类筛选 |
| 攻略详情 | ✅ | `/zh/sea/guides/{slug}` — 9 篇攻略全部 SSG 静态化，含 FAQ schema |
| 多语言 | ✅ | 中/英/日三 locale 全部路由可达（角色日语 nameJa 已于 2026.06.25 补齐 18 个） |
| 生产构建 | ✅ | `pnpm build` 20s 通过，5170/5170 静态页面生成成功，零报错 |
| 类型检查 | ✅ | TypeScript 严格模式零错误 |
| 运行时验证 | ✅ | 6 个关键路径 HTTP 200 抽查通过（含日语角色页） |

### 启用中的 routes（`GAMES.sea.routes`）

```ts
characters: true,
'tier-list': true,
guides:     true,
// 其余 routes（weapons/items/map/calculator/build/compare/teams）均为 false
```

### 已知数据层限制（非阻塞）

- **9 篇攻略缺 `*Ja` 字段** — `SeaGuide` 接口设计上只有 `title/summary/content/faq` 的 zh/en 两套字段，日语 locale 下攻略正文会回退到英文。规划 MVP 只做 zh，V1.2 启用日语市场时统一处理
- **`raw-weapons.json` / `raw-materials.json` / `raw-character-materials.json` 都是空数组** — 这三个数据文件已存在但没填内容；对应 routes 也未开启，所以页面不会渲染
- **`.verify-tsconfig.json`** — 沙箱验证时产生的临时文件（已清空成 `{}`，沙箱权限不允许删除文件），你方便时手动删除即可

---

## 1. 战略前提（已落地）

Gachia 已经是一个多游戏统一站，sea 不是「待接入的第 5 个游戏」，而是**已经完整接入的第 9 个游戏**。本规划的所有剩余工作都是在既有架构上**补充内容、开启 route、精修数据**，不涉及任何基础设施工作。

**复用的既有资产（无需改动）：**

| 资产 | 位置 | 状态 |
|------|------|------|
| 路由方案 | `apps/web/app/[lang]/[game]/...` 动态段 | ✅ sea 已挂载 |
| 主题换肤 | `:root[data-game="sea"]` CSS 变量 + `GameDataSetter` | ✅ 玫红主题已就位 |
| i18n | next-intl + messages/{zh,en,ja}.json | ✅ 三语 locale 全可达 |
| 数据 schema | `packages/data/games/sea/*` + 类型定义 | ✅ 接口完整 |
| Sitemap | `apps/web/app/sitemap.ts` + `sitemap.xml` | ✅ sea 页面自动纳入 |
| Schema.org | 各页面 JSON-LD 已实现 | ✅ sea 复用相同模板 |
| Pagefind 静态搜索 | 构建时索引 | ✅ sea 自动纳入 |
| Cloudflare R2 图片 | `/images/sea/characters/{id}.webp` | ✅ 路径已约定 |

---

## 2. URL 结构现状

### 已启用（生产可见）

```
gachia.com/zh/sea/                              # 游戏首页 ✅
gachia.com/zh/sea/characters                    # 角色列表 ✅
gachia.com/zh/sea/characters/{id}               # 角色详情 ✅（18 个）
gachia.com/zh/sea/tier-list                     # 节奏榜 ✅
gachia.com/zh/sea/guides                        # 攻略列表 ✅
gachia.com/zh/sea/guides/{slug}                 # 攻略详情 ✅（9 篇）
```

### 未启用（route 开关为 false 或需要新开发）

```
gachia.com/zh/sea/items                        # 材料库（需开启 route + 填数据）
gachia.com/zh/sea/items/{slug}                 # 材料详情
gachia.com/zh/sea/ships                        # 船只库（需新开发 category）
gachia.com/zh/sea/ships/{slug}                 # 船只详情
gachia.com/zh/sea/ships/cannons                # 大炮图鉴
gachia.com/zh/sea/map                          # 互动地图（已有通用 map 模板，需 sea 数据）
gachia.com/zh/sea/calculator                   # 计算器（已有通用 calculator 模板，需 sea 适配）
gachia.com/zh/sea/redeem-codes                 # 兑换码（已有通用 redeem-codes 模板）
gachia.com/zh/sea/build                        # 配队构建器（已有通用 build 模板）
gachia.com/zh/sea/wiki                         # Wiki 总览页（Gachia 无此 category，由首页承担）
gachia.com/zh/sea/codes / download             # 同上，由首页或 redeem-codes 承担
```

**命名约定：** 所有 slug 用英文 kebab-case；路径分类用 Gachia 全站统一 category 词（`characters` / `items` / `guides`），不用 `crew` / `materials` 这种遗忘之海专属词。

**架构差异提示：** 规划原稿提到的「Wiki 总览页、独立 codes/download 页」与 Gachia 现有架构不匹配——Gachia 用「游戏首页 + route 开关」承担导航枢纽作用，没有独立 wiki/codes/download category。如果需要兑换码功能，正确做法是开启 `redeem-codes` route（已有通用模板）。

---

## 3. 剩余工作清单（按优先级）

### P0 — 公测前必做（06.26 直播后到公测定档之间）

#### 3.1 公测数据校准（覆盖三测数据）

| 数据文件 | 现状 | 任务 |
|---------|------|------|
| `raw-characters.json` (18 条) | 三测版本 | 公测实机对照 18 个角色的属性/技能/数值，修正差异 |
| `raw-guides.json` (9 条) | 三测版本 | 攻略正文里的数值/机制描述根据公测实机修订 |
| `tier-lists` 数据 | 三测版本 | 公测后根据实机表现重排节奏榜 |

#### 3.2 前瞻直播信息整理（2026.06.26 当晚）

- 直播笔记：新角色名、新船队、新系统、公测日期
- 若有新角色公布：补到 `raw-characters.json`，`status: "upcoming"` 字段控制是否显示
- 若有新系统公布：评估是否需要新增 category route

### P1 — 公测首周补齐

#### 3.3 开启 items route（材料库）

**前置条件：** `raw-materials.json` 当前是空数组，需要先填数据。

```ts
// 1. packages/core/constants/index.ts —— 改一处
sea: {
  routes: {
    items: true,   // ← 从 false 改成 true
    // ...
  }
}

// 2. packages/data/games/sea/raw-materials.json —— 填首批 20-30 个高频材料
// 3. apps/web/app/[lang]/[game]/items/page.tsx —— 加 case 'sea' 分支（参考 characters 分支模式）
// 4. apps/web/app/[lang]/[game]/items/[id]/page.tsx —— 同上
```

#### 3.4 开启 redeem-codes route（兑换码）

```ts
// packages/core/constants/index.ts
sea: {
  routes: {
    'redeem-codes': true,   // 看通用 redeem-codes 模板是否已支持 sea，没有就加分支
  }
}
```

#### 3.5 精修角色页

18 个角色页虽然数据完整，但部分字段（如 `tierReason` 实战点评、配队推荐）可能还比较单薄，按规划模板逐个精修：

- 每个角色 800–1500 字实战点评
- 6 维属性可视化（雷达图）
- 招牌技详细解读
- 突破材料清单（依赖 items route 启用）

### P2 — 公测后第二周

#### 3.6 ships 模块新开发

Gachia 当前没有 `ships` category（其他游戏用 `weapons` 承担类似功能）。遗忘之海的「船只升级 + 船体改装 + 大炮」是核心成长系统，建议新建专属 category：

- 新增 `apps/web/app/[lang]/[game]/ships/` 路由（参考 weapons 模式）
- 新增 `packages/data/games/sea/raw-ships.json` 数据
- 在 `GAMES.sea.routes` 加 `ships: true` 配置

**评估：** 船只系统广告价值高（用户决策性强），值得专门做。

### P3 — 公测后一个月（SEO 护城河）

#### 3.7 互动地图

Gachia 已有通用 `/[lang]/[game]/map` 模板（genshin/starrail/wuwa 在用），sea 当前 route 未开启。需要：

- 准备 sea 海域坐标数据
- 接入地图组件
- 开启 `map: true` route

#### 3.8 计算器工具

通用 `calculator` 模板已存在，sea 当前未启用。等 items 数据齐全后再开启。

---

## 4. 页面模板（参考，已部分实现）

### 模板 A：攻略页（已实现，9 篇）

数据 schema（`SeaGuide` 接口）：

```typescript
{
  id: string;              // URL slug
  title: string;           // 中文标题
  titleEn: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  summary: string;         // 摘要（SEO description）
  summaryEn: string;
  content: string;         // Markdown 正文
  contentEn: string;
  tags: string[];
  faq: Array<{
    question: string;      // 英文问题
    questionZh: string;    // 中文问题
    answer: string;
    answerZh: string;
  }>;
}
```

**SEO 元素已配置：** JSON-LD `Article` + `FAQPage`、breadcrumbs、Open Graph。

**待补强：** 攻略日语字段（V1.2 阶段统一处理）、配图、内链密度。

### 模板 B：角色详情页（已实现，18 个）

数据 schema（`SeaCharacter` 接口，已就位的关键字段）：

```typescript
{
  id: string;              // URL slug，如 'black-baron'
  number: string;
  name: string;            // 中文
  nameEn: string;
  nameJa?: string;         // 已于 2026.06.25 补齐 18 个
  nickname: string;
  attribute: 'str'|'agi'|'con'|'int'|'per'|'cha';  // 6 大 D&D 属性
  attributeEn: string;
  role: string;            // 主攻/协攻/辅助/生存
  roleEn: string;
  rarity: 4 | 5;           // 4 = 紫券, 5 = 黑券
  fleet: string;           // 船队中文名
  fleetEn: string;
  faction: string;
  position: string;
  description: string;
  descriptionEn: string;
  speed: number;
  faq: SeaFaq[];
  relatedCharacters: string[];   // 内链到其他角色 id
  tierRank: string;              // SS/S/A/B
  tierReason: string;
  tierReasonZh: string;
  skills: SeaSkillSet;           // passive / signature / personal 三类
  recommendedBuild?: SeaRecommendedBuild;
  teamComps?: SeaTeamComp[];
  image: string;
  status: string;                // 非 'upcoming' 才会显示
}
```

**SEO 元素已配置：** 角色卡 OG 图、breadcrumbs、JSON-LD、内链到相关角色和 tier-list。

**待补强：** 部分角色的 `recommendedBuild` 和 `teamComps` 字段为空，需要根据公测实机补齐。

### 模板 C：材料详情页（待实现，参考 genshin/wuwa 的 items 分支）

参考 `apps/web/app/[lang]/[game]/items/page.tsx` 里其他游戏的 `case` 分支，给 sea 写对应渲染逻辑。数据 schema 参考 `SeaItem`（待定义）。

---

## 5. 长期 SEO 策略

### 5.1 关键词矩阵与对应页面

| 关键词意图 | 目标页面 | 优先级 | 状态 |
|----------|---------|-------|------|
| 遗忘之海 攻略 / 新手攻略 | `/zh/sea/guides/*` | P0 | ✅ 已承接（9 篇攻略） |
| 遗忘之海 {角色名} | `/zh/sea/characters/{id}` | P0 | ✅ 已承接（18 个角色） |
| 遗忘之海 节奏榜 / 角色排名 | `/zh/sea/tier-list` | P0 | ✅ 已承接 |
| 遗忘之海 兑换码 | `/zh/sea/redeem-codes` | P1 | ⏳ 需开启 route |
| 遗忘之海 {材料名} / 获取 / 位置 / 用途 | `/zh/sea/items/{id}` | P1 | ⏳ 需开启 route + 填数据 |
| 遗忘之海 最强船 / 船只升级 | `/zh/sea/ships/*` | P2 | ⏳ 需新开发 category |
| 遗忘之海 互动地图 / 宝箱位置 | `/zh/sea/map` | P3 | ⏳ 等公测坐标数据 |
| 遗忘之海 材料计算器 | `/zh/sea/calculator` | P3 | ⏳ 等 items 数据齐全 |
| 遗忘之海 Wiki | `/zh/sea` 首页承担 | — | ✅ 由首页 + guides 承接 |

### 5.2 内链网络（已部分构建）

当前已实现的内链：

```
characters/{id}  ──┬──→ characters/{related-id}     （relatedCharacters 字段）
                   └──→ tier-list                     （节奏榜锚点）

guides/{slug}    ──→ 相关 characters / guides
```

**待补强（依赖 P1/P2 模块上线）：**

```
characters/{id}  ──┬──→ items/{material-slug}        （突破材料，依赖 items route）
                   └──→ ships/{slug}                  （主题船，依赖 ships 开发）

items/{slug}     ──→ 所有引用它的 characters / ships
```

**规则：** 每个详情页至少 5 条出站内链。

### 5.3 Schema.org 结构化数据（已实现）

| 页面类型 | Schema | 状态 |
|---------|--------|------|
| 攻略页 | `Article` + `FAQPage` | ✅ |
| 角色页 | `Character` + `BreadcrumbList` | ✅ |
| 节奏榜 | `ItemList` + `BreadcrumbList` | ✅ |
| 材料页（待实现） | `Product` + `BreadcrumbList` | ⏳ |

### 5.4 Sitemap 与收录

`sitemap.xml` 自动纳入所有 sea 页面（构建时生成）。**待办：** Search Console 提交（部署到生产环境后）。

### 5.5 Adsense 价值最大化（参考）

| 页面类型 | Adsense 单价预期 | 原因 |
|---------|----------------|------|
| 船只 / 大炮页（待开发） | 高 | 用户决策性强，商业意图高 |
| 计算器工具页（待开启） | 高 | 工具型页面用户停留长 |
| 角色页 | 中 | 流量大但意图偏资讯 |
| 材料页（待开启） | 中低 | 长尾但单价低，靠量补 |
| 兑换码页（待开启） | 中 | 高流量入口，回访高 |

---

## 6. 内容来源与版权

| 内容类型 | 来源 | 风险控制 |
|---------|------|---------|
| 数值数据 | 三测 `sea-of-remnants-content.md` + 公测实机校准 | 公测后立即核对（P0 任务） |
| 立绘 / 图标 | 官方公开素材 + 自制示意图 | 仅用官方已发布的 |
| 攻略文字 | 全部自写 | CC BY-SA |
| 互动地图坐标（待） | 玩家社区整理 + 自测 | 公测后逐步补充 |

**注意：** 三测数据 ≠ 公测数据，公测首日所有页面需过一遍校准（见 P0 任务 3.1）。

---

## 7. 风险与对冲

| 风险 | 影响 | 对冲 |
|------|------|------|
| 06.26 前瞻直播公布大量新内容 | 已上线 18 个角色页信息可能过时 | 当晚整理笔记；新角色用 `status: 'upcoming'` 字段控制；公测后立即校准 |
| 公测延期 | 抢收录时间窗错过 | sea 首页/角色/攻略/节奏榜已上线，无时效压力 |
| 官方 Wiki 入场竞争 | 「遗忘之海 Wiki」难度上升 | 靠工具（map/calculator）+ 精修攻略差异化 |
| 三测数据偏差 | 公测后用户流失 | 公测首周日校准；页面顶部标「数据版本 + 更新日期」 |
| 攻略日语字段缺失 | 日语 SEO 不友好 | MVP 不阻塞；V1.2 统一处理 SeaGuide 接口扩展 |

---

## 8. 成功指标（90 天）

| 指标 | T+30 目标 | T+90 目标 |
|------|----------|----------|
| GSC 索引页面数（sea 子站） | 80+ | 300+ |
| 自然搜索点击/日 | 500 | 5000+ |
| 角色页累计 UV | 5k | 50k+ |
| 材料页累计 UV（需开启 route） | 3k | 40k+ |
| 兑换码页回访率（需开启 route） | 30% | 25%（基数变大） |
| Adsense 收入/月 | — | 复刻 NTEGuide 起量曲线 |

**北极星指标：** 公测首月自然搜索点击数。这是判断「遗忘之海子站是否复制了 NTEGuide 起量路径」的最直接信号。

---

## 附录 A：与现有 Gachia 架构的对接点（已全部落地）

| 资产 | sea 接入状态 |
|------|------------|
| `apps/web/app/[lang]/[game]/...` 路由 | ✅ sea 已挂载，所有页面有 case 'sea' 分支 |
| `packages/data/games/sea/` 数据包 | ✅ 14 个文件，characters/guides/tier-lists 数据齐全 |
| `:root[data-game="sea"]` 主题 | ✅ 玫红主题 |
| i18n `next-intl` | ✅ 三 locale 全可达 |
| `sitemap.xml` | ✅ sea 页面自动纳入 |
| Schema.org 模板 | ✅ 复用全站统一模板 |
| Pagefind 静态搜索 | ✅ sea 自动纳入 |
| Cloudflare R2 图片 | ✅ `/images/sea/characters/{id}.webp` 约定 |

## 附录 B：18 个角色 slug 清单（实际数据）

```
traveler           # 旅人 (Traveler / 旅人) — 4★ 漂流瓶号
ais                # 艾丝 (Ais / アイス) — 4★ 漂流瓶号
nonsense-prophet   # 胡话先知 (Nonsense Prophet / 戯言の予言者) — 5★ 流浪号
soscia             # 索西亚 (Soscia / ソシア) — 5★ 破晓者
omen-eye           # 预兆之眼 (Omen Eye / 前兆の瞳) — 5★ 破晓者
ghost-shipwright   # 鬼手船匠 (Ghost Shipwright / 幽霊船工匠) — 5★ 流浪号
coward             # 懦夫 (Coward / 臆病者) — 4★ 破晓者
tagalong           # 跟屁虫 (Tagalong / 尾行者) — 4★ 流浪号
haihe              # 海赫 (Haihe / ハイヘ) — 5★ 破晓者
watchmaker         # 钟表匠 (Watchmaker / 時計職人) — 5★ 黑男爵
princess           # 王女 (Princess / 王女) — 5★ 破晓者
little-axe         # 小斧头 (Little Axe / 小斧) — 5★ 黑男爵
molly              # 茉莉 (Molly / モリー) — 4★ 蓝波乐队
heige              # 黑格 (Heige / ハイゲ) — 5★ 蓝波乐队
edward             # 爱德华 (Edward / エドワード) — 5★ 流浪号
burnt-colonel      # 焦面上校 (Burnt Colonel / 焦面の大佐) — 5★ 破晓者
gail               # 盖尔 (Gail / ゲイル) — 5★ 蓝波乐队
iron-commander     # 铁腕统领 (Iron Commander / 鉄腕の統率者) — 5★ 破晓者
```

**5 大船队：** 漂流瓶号 / 流浪号 / 破晓者 / 黑男爵 / 蓝波乐队。

## 附录 C：待实现的材料分类（参考）

```
upgrade-material   # 升级材料（矿石、木材、帆布等）
craft              # 制造材料（大炮部件、船只零件）
consumable         # 消耗品（食物、药剂）
fragment           # 碎片（记忆碎片、古代残片）
currency           # 货币（金币、黑券）
```

---

## 附录 D：本次修订 changelog（v2.0 · 2026.06.25）

**主要变更：**

1. 新增第 0 节「当前状态快照」，明确 sea 已全链路接入
2. 战略前提（§1）从「待接入」改为「已落地」，列出复用的 8 项既有资产
3. URL 结构（§2）区分「已启用」vs「未启用」，纠正原稿「wiki/codes/download 是独立页面」的误解（Gachia 用 route 开关 + 首页承担导航）
4. 删除原稿「立即执行清单 Day 1-3」（任务已全部完成），替换为「§3 剩余工作清单」按 P0/P1/P2/P3 重组
5. 角色模板（§4-B）从「建议 schema」改为「实际 SeaCharacter 接口已就位」
6. SEO 矩阵（§5.1）增加「状态」列，标注每条关键词承接页的完成度
7. 附录 B 角色清单从 4 个假想名（black-baron/tonino/princess/rayne）替换为实际 18 个 slug + 中英日名
8. 修正主题色：原稿「深海蓝 #2a7fb8」→ 实际「玫红 #e11d48」
9. 修正数据文件位置：原稿 `content/sea/` → 实际 `packages/data/games/sea/`（content/sea 只有占位空目录）
10. 增补已知数据层限制（攻略缺日语字段、weapons/materials JSON 是空数组）

**下次修订触发条件：**

- 06.26 前瞻直播后（数据校准、新角色）
- 任一新 route 开启后（items / redeem-codes / ships）
- 公测首日数据校准后

---

**文档版本：** v2.0 · 2026.06.25
**前一版本：** v1.0 · 2026.06.25（基于「sea 待接入」的假设，已过时）
**下一步：** 按 §3 P0 任务推进——06.26 直播后整理笔记 + 公测数据校准
