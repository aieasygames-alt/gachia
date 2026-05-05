# Gachia — 多游戏开放世界 Wiki + 工具 + 数据平台

> 域名：gachia.com | 目标：统一风格的多游戏 Wiki/工具/数据平台

---

## 1. 项目定位

一站式二次元开放世界游戏数据库，覆盖角色图鉴、武器数据、攻略百科、交互工具、排行榜等功能。

**核心差异化**：

| 竞品痛点 | Gachia 机会 |
|---------|------------|
| 每个游戏独立站，信息孤岛 | 跨游戏切换，统一入口 |
| 数据和工具分离（Wiki 和计算器是两个站） | 数据+工具一体化，角色页内嵌计算器 |
| 中文 Wiki 体验差、广告多 | 暗色极简 UI，移动端体验优先 |
| 多语言 Wiki 各自维护，数据不同步 | 统一数据源，多语言自动同步 |

---

## 2. URL 结构

### 决策：目录方案，不用子域名

```
gachia.com/{lang}/{game}/{category}/{slug}
```

**理由**：所有页面权重汇聚到一个域名，内链直接传递权重，一套 Search Console 管全部，Cloudflare 配置统一。

### URL 示例

```
gachia.com/zh/genshin/                           # 中文·原神首页
gachia.com/zh/genshin/characters/hu-tao          # 角色详情
gachia.com/zh/genshin/weapons/                   # 武器列表
gachia.com/zh/genshin/tier-list                  # 排行榜
gachia.com/zh/genshin/calculator                 # 计算器工具
gachia.com/zh/genshin/map                        # 交互地图
gachia.com/zh/genshin/guides                     # 攻略百科
gachia.com/en/starrail/light-cones/sleep-like-the-dead
gachia.com/ja/wuwa/resonators/yangyang
gachia.com/zh/news                               # 跨游戏资讯
gachia.com/zh/compare                            # 跨游戏对比
```

### 路由层级

```
/{lang}
  /{game}
    /characters          # 角色图鉴
    /weapons             # 武器/光锥
    /items               # 材料/道具
    /tier-list           # 排行榜
    /calculator          # 计算器
    /map                 # 交互地图
    /guides              # 攻略/百科
  /news                  # 跨游戏资讯
  /compare               # 跨游戏对比
```

---

## 3. 技术栈

### 整体架构：混合方案（SSG 优先 + Serverless 按需）

```
┌─────────────────────────────────────────────┐
│                  前端层                      │
│  Next.js 15 (App Router) + React 19         │
│  Tailwind CSS + shadcn/ui                   │
│  状态: Zustand / TanStack Query              │
│  图表: ECharts / Recharts                    │
│  交互地图: Leaflet / Mapbox GL               │
│  国际化: next-intl                           │
│  搜索: Pagefind (静态索引)                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│             API 层 (按需引入)                 │
│  Next.js API Routes → Cloudflare Functions   │
│  认证: NextAuth.js (Discord/Google)          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│                数据层                        │
│  静态数据: JSON + Cloudflare KV              │
│  用户数据: Turso / Cloudflare D1 (按需加)    │
│  图片资源: Cloudflare R2                     │
│  缓存: Cloudflare Cache (内置)               │
└─────────────────────────────────────────────┘
```

### 为什么选这套

| 选择 | 理由 |
|------|------|
| **Next.js App Router** | SSR/SSG/ISR 混合，SEO 友好，`[game]` 动态路由天然支持多游戏 |
| **@opennextjs/cloudflare** | 适配 Cloudflare Pages，不需要 Vercel |
| **shadcn/ui + Tailwind** | 代码完全可控，暗色主题内置，适合深度定制 Wiki 组件 |
| **next-intl** | Next.js App Router 下最成熟的 i18n 方案 |
| **Pagefind** | 构建时生成搜索索引，纯静态零成本 |
| **Turso / D1** | 后期加用户系统时用，免费额度够用 |

### 渐进式升级路径

| 阶段 | 架构 | 能力 |
|------|------|------|
| **MVP** | SSG + JSON + Pagefind | 角色图鉴、武器数据、计算器、攻略、站内搜索 |
| **V1** | + API Routes + Turso | 用户账号、收藏/配队保存 |
| **V2** | + PostgreSQL + Redis | 社区评论、排行榜、实时数据 |

---

## 4. 部署方案

```
代码推送 GitHub → Cloudflare Pages 自动构建部署
域名 gachia.com → Cloudflare DNS + CDN + SSL
图片资源 → Cloudflare R2 (前 10GB 免费)
```

**Cloudflare vs Vercel 选择**：选 Cloudflare。

| 对比项 | Vercel | Cloudflare Pages |
|--------|--------|------------------|
| 免费带宽 | 100GB/月 | 无限 |
| 自定义域名 | 免费 SSL | 免费 SSL + DNS 同生态 |
| Serverless | Node.js | V8 Workers（冷启动更快） |
| 部署方式 | git push | git push（一样） |
| 费用 | 超额度后计费 | 免费额度覆盖 Wiki 站绰绰有余 |

**注意**：Cloudflare Workers 运行时是 V8 隔离环境，非完整 Node.js。不能用 `fs`、`child_process` 等，但 Wiki 平台不需要这些。

---

## 5. UI 设计

### 风格参考：Ambr.top

暗色系 + 游戏主题色换肤。每个游戏只换主色调：

| 游戏 | 主题色 |
|------|-------|
| 原神 | 金色 `#d4a254` |
| 崩铁 | 紫色 `#7b68ee` |
| 鸣潮 | 蓝色 `#3b82f6` |

### 核心视觉要素

- 暗色背景 `#1a1a2e` 级
- 卡片带稀有度边框色（4星紫 / 5星金）
- 元素图标角标
- 数据表格交替行色
- 字体 Poppins

### 页面模板（3 种核心模板）

| 模板 | 用途 | 核心组件 |
|------|------|---------|
| **列表页** | 角色/武器/材料列表 | 卡片网格 + 筛选器 + 分页 |
| **详情页** | 单个角色/武器详情 | 属性条 + 材料列表 + 技能描述 + 相关推荐 |
| **首页** | 游戏入口 | Banner + 快捷入口卡片 + 版本动态 |

### 主题换肤实现

```css
:root[data-game="genshin"] {
  --color-primary: #d4a254;
  --color-accent: #ff6b35;
  --color-bg: #1a1a2e;
}

:root[data-game="starrail"] {
  --color-primary: #7b68ee;
  --color-accent: #e6b422;
  --color-bg: #0f0f1a;
}
```

切换游戏时只需改 `data-game` 属性，整站换色。

---

## 6. SEO 架构

SEO 是 Wiki 站的核心流量来源，从 URL 设计阶段就嵌入。

### 核心 SEO 策略

**① 结构化数据（Schema.org）**

每个角色/武器页面都带 JSON-LD 结构化数据，触发 Google 富摘要（图片+属性直接展示在搜索结果中）。

**② 自动化 Sitemap**

```
/sitemap.xml                    # 索引文件
/sitemap-zh-genshin.xml         # 中文原神
/sitemap-en-genshin.xml         # 英文原神
/sitemap-zh-starrail.xml        # 中文崩铁
```

每新增角色/武器，Sitemap 自动更新并提交 Google。

**③ 页面 SEO 规范**

| 元素 | 规则 |
|------|------|
| `<title>` | `{角色名} - {游戏名} Wiki | Gachia` |
| `<meta description>` | 每页动态生成，150 字以内 |
| `<h1>` | 每页唯一，包含角色名+游戏名 |
| Open Graph | 每页有社交分享图（角色卡预览） |
| Canonical URL | 防止重复内容 |
| Breadcrumbs | 首页 > 原神 > 角色 > 胡桃 |

**④ 技术 SEO 指标**

| 指标 | 目标 |
|------|------|
| LCP (最大内容绘制) | < 1s (SSG 页面) |
| CLS (累积布局偏移) | < 0.1 |
| 移动端友好 | 100/100 |
| 页面加载 | < 2s (Cloudflare CDN 边缘) |
| 图片格式 | WebP/AVIF + lazy loading + 固定宽高比 |

**⑤ 内链网络**

角色页自动链接到相关武器、材料、配队攻略，提升页面权重传递和爬取深度。

---

## 7. 多语言 (i18n)

### URL 策略：路径前缀

```
gachia.com/zh/genshin/characters/hu-tao   # 中文
gachia.com/en/genshin/characters/hu-tao   # English
gachia.com/ja/genshin/characters/hu-tao   # 日本語
```

不用子域名（zh.gachia.com）也不用参数（?lang=zh），SEO 权重集中在一个域名。

### 翻译分层

| 层级 | 内容 | 翻译方式 |
|------|------|---------|
| **UI 层** | 导航、按钮、标签、表格头 | JSON 文件，`next-intl` 管理 |
| **内容层** | 角色描述、攻略、背景故事 | MDX 文件，每语言独立 |

### hreflang 标签

每个页面 `<head>` 自动生成：

```html
<link rel="alternate" hreflang="zh" href="https://gachia.com/zh/genshin/characters/hu-tao" />
<link rel="alternate" hreflang="en" href="https://gachia.com/en/genshin/characters/hu-tao" />
<link rel="alternate" hreflang="ja" href="https://gachia.com/ja/genshin/characters/hu-tao" />
<link rel="alternate" hreflang="x-default" href="https://gachia.com/en/genshin/characters/hu-tao" />
```

Google 按地区自动展示对应语言页面。

### 语言优先级

| 阶段 | 语言 | 理由 |
|------|------|------|
| MVP | zh-CN | 主战场，用户密度最高 |
| V1.1 | + en | 全球流量第二大，英文 SEO 覆盖面广 |
| V1.2 | + ja | 日本二游市场大，竞品日语版普遍较弱 |
| 后期 | + ko, de, fr, es, pt, th, vi, id | 按流量数据决定 |

### 技术方案

```typescript
// i18n 配置
const i18nConfig = {
  defaultLocale: 'zh',
  locales: ['zh', 'en', 'ja'],
};
```

使用 `next-intl` + Next.js App Router 的 `[lang]` 动态路由段实现。

---

## 8. 数据与资源管理

### 数据来源

| 数据类型 | 来源 | 风险 |
|---------|------|------|
| 角色数值 | Datamine 社区公开数据集（如 Dimbreath/GenshinData） | 灰色地带，厂商默许但未授权 |
| 角色立绘/图标 | 游戏客户端提取 → 二次处理 | 需低分辨率缩略图，fair use 范围 |
| 攻略文字 | 自写 + 社区贡献 | 需 UGC 内容授权协议（CC BY-SA） |
| 武器/圣遗物数据 | Datamine + 整理 | 同上 |

### 图片资源存储

```
Cloudflare R2 (前 10GB 免费，无出口费)
├── /images/genshin/characters/hu-tao/
│   ├── icon.webp          (64x64, 角色头像)
│   ├── card.webp          (320x400, 角色卡)
│   └── gacha-splash.webp  (800x1000, 抽卡立绘)
├── /images/genshin/elements/pyro.svg
└── /images/starrail/...
```

### 版本更新节奏

| 游戏 | 周期 | 变动量 |
|------|------|-------|
| 原神 | 6 周/版本 | 1-2 新角色 + 新武器 + 新材料 |
| 崩铁 | 6 周/版本 | 类似 |
| 鸣潮 | ~6 周 | 类似 |

**需提前规划**：
- 数据更新流程与责任人
- 页面标注数据版本（"数据更新至 5.4 版本"）
- 旧数据归档策略（保留历史 or 直接覆盖）

---

## 9. 站内搜索

| 方案 | 阶段 | 成本 |
|------|------|------|
| **Pagefind** | MVP，构建时生成静态索引 | 免费，零服务器 |
| Algolia | 成熟期，搜索体验最好 | 免费额度够用 |
| Meilisearch | 自托管 | 需要服务器 |

**MVP 用 Pagefind**：纯静态，零成本，搜索体验不错。

---

## 10. 变现路径（架构预留）

即使初期不启用，布局组件需预留广告位插槽（空 div），确保 CLS 不受影响。

| 阶段 | 方式 | 架构要求 |
|------|------|---------|
| 初期 | 无广告，纯内容积累 | 无 |
| 中期 | 展示广告 (AdSense 等) | 广告位组件化，不影响 CLS |
| 后期 | Premium 功能（无广告、高级工具） | 用户系统 + 支付 |

---

## 11. 分析与隐私

| 工具 | 用途 |
|------|------|
| Cloudflare Web Analytics | 免费，隐私友好，不需要 Cookie 声明 |
| Google Search Console | SEO 监控必接 |
| Google Analytics 4 | 后期按需引入 |

初期 Cloudflare Web Analytics + Search Console 即可。

---

## 12. 项目结构

```
gachia/
├── apps/
│   ├── web/                        # 主站 (Next.js App Router)
│   │   ├── app/
│   │   │   └── [lang]/
│   │   │       └── [game]/
│   │   │           ├── characters/
│   │   │           ├── weapons/
│   │   │           ├── items/
│   │   │           ├── tier-list/
│   │   │           ├── calculator/
│   │   │           ├── map/
│   │   │           └── guides/
│   │   ├── components/
│   │   │   ├── ui/                 # 通用 UI (shadcn)
│   │   │   ├── wiki/               # Wiki 专用 (卡片、表格、属性条)
│   │   │   ├── tools/              # 工具 (计算器、planner)
│   │   │   └── layout/             # 布局 (导航、侧栏、Footer)
│   │   ├── lib/
│   │   │   ├── games/              # 游戏配置注册表
│   │   │   └── utils/
│   │   └── themes/                 # 每个游戏的主题变量
│   └── admin/                      # 后台管理 (数据录入/审核)
│
├── packages/
│   ├── core/                       # 共享类型、常量、工具
│   │   ├── types/                  # Game, Character, Weapon 等接口
│   │   ├── constants/              # 稀有度、元素、属性枚举
│   │   └── schemas/                # Zod 校验
│   ├── data/                       # 数据层
│   │   └── games/
│   │       ├── genshin/
│   │       ├── starrail/
│   │       └── wuwa/
│   └── db/                         # 数据库层 (后期)
│
├── content/                        # MDX Wiki 内容
│   ├── genshin/guides/
│   ├── starrail/guides/
│   └── wuwa/guides/
│
├── public/                         # 静态资源
│   └── images/
│
├── package.json                    # pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### 游戏注册表模式（核心架构）

```typescript
interface GameModule {
  id: string;                  // "genshin" | "starrail" | "wuwa"
  name: string;                // 显示名
  theme: GameTheme;            // 颜色、Logo、背景
  elements: Element[];         // 元素/属性体系
  rarities: Rarity[];          // 稀有度
  stats: StatConfig;           // 属性体系定义
  routes: GameRouteConfig;     // 该游戏有哪些功能页
}
```

每个游戏提供一个 `GameModule` 配置，页面模板自动渲染差异化内容。

---

## 13. 决策记录

| 编号 | 决策 | 结论 | 理由 |
|------|------|------|------|
| D-01 | URL 方案 | 目录方案 `/genshin/` | SEO 权重集中，一套配置管全部 |
| D-02 | 前端框架 | Next.js 15 App Router | SSG/SSR/ISR 混合，SEO 友好 |
| D-03 | 部署平台 | Cloudflare Pages | 免费带宽，DNS/CDN/R2 同生态 |
| D-04 | UI 风格 | Ambr.top 风格暗色系 | 数据密度高，换肤天然支持 |
| D-05 | UI 框架 | Tailwind + shadcn/ui | 暗色主题内置，组件完全可控 |
| D-06 | i18n 方案 | next-intl + 路径前缀 `/zh/` | SEO 权重集中，hreflang 支持 |
| D-07 | 搜索方案 | Pagefind (MVP) | 纯静态零成本，后期可换 Algolia |
| D-08 | 数据库 | MVP 用 JSON，后期加 Turso/D1 | 零成本起步，渐进式升级 |
| D-09 | 图片存储 | Cloudflare R2 | 前 10GB 免费，无出口费 |
| D-10 | 是否需要 Vercel | 不需要 | Cloudflare Pages 全覆盖 |
| D-11 | 语言优先级 | zh → en → ja | 按用户密度和 SEO 价值排序 |
