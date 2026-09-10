# Gachia 多游戏独立 Cloudflare 部署方案

## 1. 背景

Gachia 当前是一个 Next.js + OpenNext Cloudflare Worker 单体应用。

所有游戏共享：

- `apps/web` 应用与单一 Cloudflare Worker 部署
- 动态路由：`/[lang]/[game]/*`
- 国际化、中间件、导航、SEO 元数据
- D1、R2、认证与部分 API
- 全站 sitemap

随着游戏和内容持续增加，Worker 压缩后上传包接近 Cloudflare `3 MiB` 限制。继续在同一个应用中添加游戏，会提高部署失败风险。

目标是将部分游戏独立构建、独立部署，同时保持用户和搜索引擎看到的 URL 不变：

```text
https://gachia.com/zh/nte/...
https://gachia.com/en/roco-cn/...
https://gachia.com/ja/genshin/...
```

## 2. 结论

不建议直接采用 Easegame 的 `pages.dev` 公网反向代理模式。

该模式适合静态专题，但 Gachia 包含 SSR、Next.js 静态资源、认证、D1、R2、API、SEO sitemap 和历史 URL 重定向。直接反代会带来较高的资源路径、Cookie、API、canonical 和 SEO 风险。

推荐采用：

```text
Cloudflare Router Worker
  + 主站 Worker
  + 游戏独立 Worker
  + Cloudflare Service Bindings
```

每个游戏独立构建和部署，主域名路径由 Router Worker 转发到对应游戏 Worker。

## 3. 架构设计

```text
浏览器 / Googlebot
        |
        v
   gachia.com/*
        |
        v
 Cloudflare Router Worker
        |
        +-- /zh|en|ja/nte/* ------> gachia-game-nte
        |
        +-- /zh|en|ja/roco-cn/* --> gachia-game-roco-cn
        |
        +-- /zh|en|ja/genshin/* -> gachia-game-genshin
        |
        +-- 其他路径 -----------> gachia-main
```

URL 始终保持主域名：

```text
gachia.com/zh/nte/characters/...
gachia.com/en/roco-cn/guides/...
```

浏览器不会跳转到：

```text
*.workers.dev
*.pages.dev
```

## 4. Worker 划分

| Worker | 职责 |
|---|---|
| `gachia-router` | 根据 URL 路径识别游戏，并分发到对应 Worker |
| `gachia-main` | 首页、跨游戏导航、公共页面、认证、全站 API、根 sitemap |
| `gachia-game-nte` | NTE 游戏页面、NTE 数据、NTE 图片和 NTE sitemap |
| `gachia-game-roco-cn` | 洛克王国游戏页面、数据、图片和 sitemap |
| `gachia-game-genshin` | 原神游戏页面、数据、图片和 sitemap |

Router Worker 应尽可能小，不包含 Next.js 应用代码和游戏数据。

## 5. 路由规则

Router Worker 的核心逻辑：

```ts
const localePattern = /^(zh|en|ja)$/;

const gameWorkers = {
  nte: env.NTE_SITE,
  "roco-cn": env.ROCO_CN_SITE,
  genshin: env.GENSHIN_SITE,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, locale, game] = url.pathname.split("/");

    if (localePattern.test(locale) && gameWorkers[game]) {
      return gameWorkers[game].fetch(request);
    }

    return env.MAIN_SITE.fetch(request);
  },
};
```

应通过 Cloudflare Service Binding 调用游戏 Worker，而非向 `pages.dev` 或 `workers.dev` 发起公开 HTTP 请求。

## 6. 目录演进建议

当前：

```text
apps/web
packages/core
packages/data
packages/db
```

建议逐步演进为：

```text
apps/router
apps/main
apps/game-nte
apps/game-roco-cn
apps/game-genshin

packages/core
packages/data
packages/db
packages/ui
packages/seo
```

原则：

- `packages/core`：游戏注册表、语言、共享类型、通用配置。
- `packages/ui`：共享 Header、Footer、面包屑、卡片、页面布局。
- `packages/data/games/<game>`：仅保留该游戏的数据。
- `apps/game-<game>`：只导入自身游戏数据，不导入其他游戏数据。
- `apps/main`：保留首页、跨游戏内容、公共页面和全局能力。
- `apps/router`：只做请求分发。

## 7. 静态资源隔离

这是 Next.js 多应用同域部署的关键风险点。

多个 Next.js 应用默认都会使用：

```text
/_next/static/*
```

若不隔离，NTE、原神、洛克王国的 JS/CSS 构建资源会相互冲突。

每个游戏应用应使用独立静态资源前缀：

```text
/_games/nte/_next/*
/_games/roco-cn/_next/*
/_games/genshin/_next/*
```

例如：

```ts
const nextConfig = {
  assetPrefix: "/_games/nte",
};
```

Router Worker 还必须把这些资源路径发送到对应游戏 Worker：

```text
/_games/nte/*      -> gachia-game-nte
/_games/roco-cn/*  -> gachia-game-roco-cn
/_games/genshin/*  -> gachia-game-genshin
```

不能只转发页面路径。

## 8. 数据库、认证与 API

游戏 Worker 可以复用主站基础设施：

| 能力 | 推荐方式 |
|---|---|
| D1 | 绑定同一个数据库，或按业务逐步拆库 |
| R2 | 绑定同一个图片 bucket，使用游戏目录隔离对象路径 |
| 认证 | 集中在 `gachia-main`，或抽出专用 Auth Worker |
| 收藏、地图进度、共享配装 | 统一 API Worker，游戏 Worker 通过 Service Binding 调用 |
| 私有 API | 必须保留 `no-store`、鉴权和防缓存行为 |

可索引的资料页面必须匿名可访问，不能因 Cookie、认证或 API 权限导致 Googlebot 获取空页面、登录页或 401。

## 9. SEO 保护要求

Google 不关心页面来自哪个 Worker，关心的是 URL、页面内容和抓取结果。

只要 URL 与页面语义不变，Worker 拆分属于基础设施变更，不是 SEO 站点迁移。

必须保持：

```text
URL
HTTP 状态码
页面主体内容
title
meta description
canonical
hreflang
JSON-LD
内部链接
robots 指令
sitemap
```

### 9.1 URL 不变

必须继续支持：

```text
/zh/nte/*
/en/nte/*
/ja/nte/*
```

历史 URL、无语言 URL 和错误 slug 的 301 规则不能丢失。

当前这部分逻辑位于：

`apps/web/middleware.ts`

拆分后应由 Router Worker 或对应游戏 Worker 保留。

### 9.2 Canonical 和 Hreflang

所有游戏 Worker 的 SEO URL 仍必须是：

```text
https://gachia.com/zh/nte/...
https://gachia.com/en/nte/...
https://gachia.com/ja/nte/...
```

禁止生成：

```text
https://gachia-game-nte.workers.dev/...
https://nte.pages.dev/...
```

每个语言页面应继续输出：

```html
<link rel="canonical" href="https://gachia.com/zh/nte/..." />
<link rel="alternate" hreflang="zh-Hans" href="..." />
<link rel="alternate" hreflang="en" href="..." />
<link rel="alternate" hreflang="ja" href="..." />
<link rel="alternate" hreflang="x-default" href="..." />
```

### 9.3 Sitemap

当前 sitemap 位于：

`apps/web/app/sitemap.ts`

拆分后应改为 sitemap index：

```xml
<sitemapindex>
  <sitemap>
    <loc>https://gachia.com/sitemaps/main.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://gachia.com/sitemaps/nte.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://gachia.com/sitemaps/roco-cn.xml</loc>
  </sitemap>
</sitemapindex>
```

各游戏 sitemap 仍使用主域名 URL：

```text
https://gachia.com/sitemaps/nte.xml
https://gachia.com/sitemaps/roco-cn.xml
```

根 `robots.txt` 保持：

```text
Sitemap: https://gachia.com/sitemap.xml
```

## 10. 主要风险与应对

| 风险 | 后果 | 处理方式 |
|---|---|---|
| 只增加反向代理 | 主 Worker 包体不减少 | 必须让游戏独立构建，并从主应用移除该游戏代码和静态页面 |
| `/_next` 资源冲突 | 页面 CSS/JS 错乱或 hydration 失败 | 使用独立 `assetPrefix` 和独立资源路由 |
| 原 URL 变为 404 | 收录下降、历史权重损失 | 保持原路径、状态码和旧 URL 301 |
| canonical 指向子域 | 重复内容、规范页错误 | 固定 canonical 为 `https://gachia.com/...` |
| hreflang 不完整 | 多语言索引混乱 | 每个游戏 Worker 输出完整语言替代关系 |
| sitemap 改坏 | 新页面发现变慢、抓取失败 | 使用根 sitemap index 聚合游戏 sitemap |
| 中间件规则遗失 | 历史路径变 404 或产生重复 URL | 迁移 `middleware.ts` 中与游戏相关的规范化逻辑 |
| API/Cookie 跨 Worker 不一致 | 收藏、登录、工具功能异常 | 集中 API/Auth，明确 Cookie 域、Path 和 SameSite 策略 |
| 上线短暂 5xx | Google 降低抓取频率 | 蓝绿发布、切换前完整预发布验证 |
| sitemap 与内容版本不同步 | Sitemap URL 404 或过期 | 每个游戏独立生成自己的 sitemap，与游戏内容同次部署 |

## 11. 上线策略

不应一次拆分所有游戏。

建议第一批试点：

```text
NTE
或
Roco CN
```

不建议先拆原神，因为内容、角色、地图、工具与数据规模更大，回归范围更广。

上线步骤：

1. 创建 `apps/game-nte`，复用共享 UI 和核心类型。
2. 确保它只导入 NTE 数据，且独立构建压缩包小于 `3 MiB`。
3. 设置 NTE 专属 `assetPrefix`。
4. 部署 `gachia-game-nte`，但暂不切生产路由。
5. 比较旧站与新站的页面输出：
   - HTTP 状态
   - title
   - description
   - canonical
   - hreflang
   - JSON-LD
   - 正文内容
   - 图片与 JS/CSS 请求
6. 配置 Router Worker：
   ```text
   /zh/nte/*
   /en/nte/*
   /ja/nte/*
   /_games/nte/*
   ```
7. 切换生产流量，保持 URL 不跳转。
8. 在 Google Search Console 持续监控 2 至 4 周：
   - 已编入索引页面数
   - 抓取统计
   - 404、5xx、重定向错误
   - sitemap 状态
   - NTE 相关关键词展示、点击和排名
9. 验证稳定后，将流程固化为新游戏模板。

## 12. 新游戏接入流程

未来新增游戏不再扩大主站 Worker。

```text
新增游戏数据
  ->
创建 apps/game-<game>
  ->
独立构建与部署 game Worker
  ->
配置专属静态资源前缀
  ->
在 Router Worker 注册语言路径与资产路径
  ->
在主站首页注册游戏链接
  ->
在 sitemap index 注册游戏 sitemap
  ->
完成 SEO 与功能回归验证
```

示例：

```text
apps/game-aniimo
  ->
gachia-game-aniimo
  ->
/zh/aniimo/*
/en/aniimo/*
/ja/aniimo/*
/_games/aniimo/_next/*
```

## 13. 最终建议

采用 Cloudflare Service Bindings 的多 Worker 架构：

- 保持 `gachia.com/{lang}/{game}` URL 不变。
- 每个游戏独立构建，解决压缩包 `3 MiB` 上限。
- 不依赖 `pages.dev` 公开反代。
- 支持未来新游戏独立上线。
- 保持 Google 已收录 URL、canonical、hreflang、内链和 sitemap 的稳定性。
- 先以 NTE 或 Roco CN 进行低风险试点，再逐步推广。

## 14. 长期平台治理

本方案不应仅作为一次 Worker 包体拆分措施，而应作为未来新增、迁移和下线游戏的长期平台架构。

长期目标：

- 主站 Worker 不再随着游戏数量线性膨胀。
- 每个游戏可独立开发、构建、发布、回滚和观测。
- 用户、Googlebot 与外部链接始终使用 `gachia.com/{lang}/{game}`。
- 游戏之间不形成运行时相互依赖。
- 新游戏接入成为标准流程，而不是复制应用后手工修补路由和 SEO。

推荐稳定的平台边界：

```text
Router Worker
  路径分发、旧 URL 301、健康检查、维护开关

Main/Shell Worker
  首页、跨游戏导航、公共页面、robots、sitemap index

Game Worker
  单游戏资料页、游戏数据、游戏工具、游戏 sitemap

Platform API Worker
  认证、收藏、用户数据、地图进度、共享配装、受保护 API
```

游戏 Worker 应尽量保持匿名可访问、以静态内容和 SSR 为主；用户状态和跨游戏能力集中在 Platform API 层，避免每新增一个游戏都复制认证和数据库逻辑。

## 15. 游戏模块契约

每个游戏不应仅是复制出来的 `apps/game-*` 应用，而应遵守统一的游戏模块契约。该契约用于声明该游戏支持的页面、SEO、资源和 API 能力。

示意类型：

```ts
type GameModule = {
  id: GameId;
  locales: SupportedLocale[];
  routes: GameRoutes;
  sitemap: () => SitemapEntry[];
  seo: GameSeoConfig;
  assets: AssetNamespace;
  apiCapabilities: ApiCapability[];
};
```

游戏模块应显式声明是否拥有以下能力：

```text
角色
武器
物品/装备
地图
兑换码
配队
计算器
抽卡
攻略
共享配装
```

这样可以避免新游戏仍依赖当前全量 `[game]` 路由、全游戏动态 import 分支和不适用的功能页面，从源头控制 Worker 包体和维护复杂度。

## 16. 游戏部署清单作为唯一事实来源

游戏注册信息不能分散在 Router、首页、sitemap、middleware、部署脚本和测试中。应建立一个部署清单，作为路由、SEO 和发布状态的唯一事实来源。

示例：

```ts
export const GAME_DEPLOYMENTS = {
  nte: {
    deployment: "game",
    worker: "gachia-game-nte",
    assetPrefix: "/_games/nte",
    sitemapPath: "/sitemaps/nte/index.xml",
    status: "live",
  },
  genshin: {
    deployment: "game",
    worker: "gachia-game-genshin",
    assetPrefix: "/_games/genshin",
    sitemapPath: "/sitemaps/genshin/index.xml",
    status: "live",
  },
  aniimo: {
    deployment: "game",
    worker: "gachia-game-aniimo",
    assetPrefix: "/_games/aniimo",
    sitemapPath: "/sitemaps/aniimo/index.xml",
    status: "draft",
  },
} as const;
```

Router、主站游戏目录、sitemap index、部署脚本和回归测试都应读取该清单。

建议的发布状态：

| 状态 | 行为 |
|---|---|
| `draft` | 可开发，不进入导航、sitemap 或公开路由 |
| `preview` | 仅预发布环境可访问，不允许索引 |
| `live` | 开放路由、导航、sitemap 和索引 |
| `maintenance` | 返回受控维护页或主站说明页，保留 URL |
| `retired` | 停止维护，按 URL 生命周期规则保留内容、301 或 410 |

## 17. 资产、数据与缓存规范

每个游戏必须拥有稳定且独立的命名空间。

```text
R2:
games/<game-id>/images/*
games/<game-id>/maps/*
games/<game-id>/articles/*

静态资源:
_games/<game-id>/_next/*
_games/<game-id>/images/*

源码数据:
packages/data/games/<game-id>/*
```

构建生成的 JS、CSS 和不可变图片应使用带构建标识的资源地址，并采用长缓存：

```text
Cache-Control: public, max-age=31536000, immutable
```

HTML、sitemap、robots、游戏目录和可变数据索引应使用短缓存或明确的再验证策略。不要将游戏 HTML 长期缓存到内容更新后无法及时刷新。

## 18. 跨 Worker 请求规则

多 Worker 架构需要严格限制运行时调用方向，防止后续形成难以维护的依赖网。

推荐约束：

```text
Router -> Main / Game
Main   -> Platform API
Game   -> Platform API
Game   -> Game：禁止
```

跨游戏内容应由 Main/Shell 层聚合，或者在构建时生成静态数据。不要在用户请求期间让一个游戏 Worker 调用另一个游戏 Worker。

所有内部调用优先使用 Cloudflare Service Binding，不通过 `workers.dev`、`pages.dev` 或同域公网 URL 回调。

## 19. Worker 包体预算与 CI 门禁

压缩后 `3 MiB` 是部署上限，不应等到部署阶段才发现超限。每个 Worker 应预留余量，应对依赖升级、构建差异和后续内容增长。

建议预算：

| Worker 类型 | 推荐 gzip 上限 |
|---|---:|
| Router Worker | 100 KiB |
| Platform API Worker | 1.5 MiB |
| Main Worker | 2.2 MiB |
| 单游戏 Worker | 2.2 MiB |
| 绝对部署上限 | 3 MiB |

CI 应对所有 Worker 运行 dry-run 部署，并解析构建输出中的压缩上传体积。超过预算即失败或阻止合并。

示例命令：

```bash
pnpm --filter @gachia/game-nte exec wrangler deploy --dry-run
```

应将输出的 gzip 体积作为门禁依据，并记录历史趋势，提前发现某个游戏 Worker 的异常增长。

## 20. 发布、兼容与回滚策略

游戏拆分和后续版本发布必须遵循固定顺序：

```text
1. 部署共享 API 的兼容版本
2. 部署新游戏 Worker
3. 验证预发布 URL、SEO 输出和静态资源
4. 更新 Router Worker 的目标配置
5. 更新 Main/Shell 导航和 sitemap index
6. 验证生产页面与关键 API
7. 观察并保留回滚窗口
```

Router 切换必须是最后一步。子游戏 Worker 未验证前，不允许将生产路径转发给它。

Router 配置应支持按游戏快速回滚：

```ts
nte: {
  target: "gachia-game-nte",
  fallback: "gachia-main",
  enabled: true,
}
```

发生 5xx、资源 404、认证故障或严重 SEO 回归时，应将同一 URL 直接恢复到原服务，而非对用户执行临时跳转。每次拆分至少保留一个发布周期的回滚能力。

## 21. SEO 自动回归与上线监控

每个游戏至少选择下列代表 URL 进行自动化验证：

```text
游戏首页
角色列表
角色详情
武器/物品详情
攻略详情
地图或工具页
英语页面
日语页面
历史 URL 重定向页
游戏 sitemap
```

每个 URL 至少断言：

```text
HTTP 200 或预期的 301
canonical 为 gachia.com
hreflang 完整
不存在 noindex
JSON-LD 可解析
关键正文存在
JS/CSS/图片无 404
```

切换后持续 2 至 4 周按游戏观察 Google Search Console：

- 已编入索引页面数。
- 抓取统计和抓取错误。
- 404、软 404、5xx、重定向错误。
- sitemap 中已发现和已编入索引的 URL。
- 该游戏关键词的展示、点击和平均排名。

应保存迁移前基线，避免把自然波动误判为架构问题。

## 22. Sitemap 扩容策略

随着单游戏详情页增加，一个游戏未来可能超过单个 sitemap 的 URL 容量。应从一开始采用 sitemap index 和按内容类型分片的结构：

```text
/sitemap.xml
  -> /sitemaps/main.xml
  -> /sitemaps/nte/index.xml
  -> /sitemaps/genshin/index.xml

/sitemaps/nte/index.xml
  -> /sitemaps/nte/characters-1.xml
  -> /sitemaps/nte/items-1.xml
  -> /sitemaps/nte/guides-1.xml
```

每个游戏 Worker 仅生成自己的 sitemap；根 sitemap 只聚合各游戏 sitemap index，不再导入所有游戏数据。

## 23. 游戏下线与 URL 生命周期

长期运营中会出现停更或不再维护的游戏。必须先定义 URL 生命周期，而不是直接删除对应 Worker。

处理规则：

- 仍有搜索价值的页面：保留静态内容，或 301 到内容最接近的新页面。
- 没有合理替代且明确永久删除的页面：返回真实 `410 Gone`。
- 不要将不存在的详情页统一伪装为游戏首页 `200`，这会形成 soft 404。
- 从导航和 sitemap 移除前，先落实每一类历史 URL 的响应策略。
- 在 Search Console 中观察旧 URL 的索引退出和抓取错误变化。

## 24. 可观测性与故障排查

每个 Worker 应具备独立的名称、日志筛选、错误率、延迟监控和发布版本标识。

建议在受控环境或采样请求中加入调试响应头：

```text
X-Gachia-Service: game-nte
X-Gachia-Release: 2026-09-08-01
```

该信息可用于快速确认请求实际进入了哪个 Worker 和哪个发布版本。若面向公网长期暴露，应评估是否会泄露不需要的部署信息；可只在预发布环境、内部 IP、带调试令牌的请求或日志中使用。

最小监控指标：

```text
按 Worker 的请求量、4xx、5xx、P95 延迟
Router 到各目标 Worker 的分发错误率
静态资源 404 率
关键 sitemap 可用性
登录、收藏、地图进度等 API 错误率
```

## 25. 长期执行原则

未来新增或拆分游戏时，必须执行同一套标准流程：

```text
注册游戏模块与部署清单
  ->
创建独立游戏应用和静态资源命名空间
  ->
配置 D1/R2/API 权限和 Service Binding
  ->
通过包体预算与 SEO 回归测试
  ->
部署预发布 Worker
  ->
由 Router 启用同域生产路径
  ->
更新导航与 sitemap index
  ->
完成 Search Console 和运行指标观察
```

只有在该流程全部通过后，游戏才可进入 `live` 状态。这样可以在不改变已收录 URL 的前提下，持续控制 Worker 包体、部署风险和长期 SEO 稳定性。

## 26. 实施防事故注意事项

以下事项必须在首次拆分前落实。它们通常不会在架构图中显现，但遗漏后会造成路由循环、资源错误、缓存串站、数据损坏或不可控的生产回滚。

### 26.1 Router 必须是唯一入口和唯一决策者

同一个 `gachia.com` 路径不能同时配置多个 Cloudflare Route，也不能让 Main Worker 和 Router Worker 同时尝试按游戏转发。必须保证：

```text
gachia.com/* -> gachia-router
```

然后仅由 Router Worker 经 Service Binding 分发到 Main 或 Game Worker。

Router 规则须使用“完整路径段”判断，不能用不受约束的 `startsWith()`：

```text
正确：/zh/nte、/zh/nte/*
错误：/zh/nte-anything 也命中 nte
```

此外，Router 必须显式处理：

```text
/_games/<game>/*
/sitemaps/<game>/*
/api/*
/robots.txt
/sitemap.xml
/_next/*（主站保留资源）
```

无法识别的游戏 ID 和路径应交给 Main Worker 返回规范的 404，而不是默认为任意游戏 Worker。

### 26.2 防止 Service Binding 递归与路由循环

Game Worker 收到请求后不得再次调用 Router Worker，也不得将同域 `https://gachia.com/...` 作为内部回源地址。否则同域请求可能重新命中 Router，形成循环直到达到子请求限制或超时。

约束：

```text
浏览器 -> Router -> Game Worker
Game Worker -> Platform API Worker（允许）
Game Worker -> Router / 同域公开 URL（禁止）
```

当 Game Worker 需要调用内部服务时，只能使用其直接声明的 Service Binding。应在测试中模拟错误路由，断言请求不会出现重复分发或 Worker 调用链增长。

### 26.3 Next.js 资源路径需要完整隔离

`assetPrefix` 仅是隔离的一部分。首次试点必须验证以下请求均使用游戏专属前缀并由对应 Game Worker 返回：

```text
JS/CSS chunks
字体和图片
RSC 请求
Next.js 预取请求
构建 manifest
路由跳转后的资源请求
```

不要只在首屏 HTML 中检查 `/_next`。应使用真实浏览器访问、站内跳转、硬刷新和无缓存访问，确认不会读取其他游戏或 Main Worker 的构建产物。

若 OpenNext 当前版本无法稳定支持同域多应用的 `assetPrefix`、RSC 路径或资源 manifest 隔离，必须先完成技术验证，不得直接切生产游戏路径。

### 26.4 缓存键、缓存标签与个性化响应隔离

同域多 Worker 不能假设 CDN 缓存天然按 Worker 隔离。缓存键至少必须包含 URL 路径、查询参数中有语义的字段，以及必要的语言协商信息。

强制规则：

- 匿名公共 HTML 可以使用 CDN 缓存，但必须按完整路径隔离。
- 带 Cookie、Authorization 或用户状态的响应不得被公共 CDN 缓存。
- 所有私有 API 继续使用 `Cache-Control: private, no-store` 和适当的 `Vary`。
- 不要对游戏 HTML 使用过宽的共享 cache tag，避免更新一个游戏时误清空其他游戏的缓存。
- 预览环境、生产环境和不同游戏不得共享可写缓存、D1 数据库或 R2 发布前缀。

应在验收中使用两个不同用户会话，确认收藏、登录态、地图进度和个性化内容不会互相泄露。

### 26.5 Cookie 域、Path 和认证回调

Cookie 的 `Domain=gachia.com` 可以被所有同域 Worker 读取；Cookie 的 `Path` 会决定浏览器何时发送它。拆分后必须明确认证 Cookie、CSRF Cookie 和会话刷新 Cookie 的属性。

建议：

- 共享登录状态需要跨游戏访问时，使用 `Domain=.gachia.com` 与 `Path=/`，并保持 `Secure`、`HttpOnly` 和合适的 `SameSite`。
- 仅某个游戏使用的 Cookie 使用游戏路径或独立名称，避免覆盖公共 Cookie。
- 认证回调、登出、刷新 token 等路径始终由 Platform API/Main Worker 处理，不让 Game Worker 各自实现。
- 任何通过 POST 修改用户数据的跨 Worker API 都必须继续执行 CSRF、Origin 和权限校验。

上线前要覆盖：未登录浏览、登录、登出、刷新页面、跨游戏跳转、收藏写入、无效会话和 CSRF 拒绝。

### 26.6 D1 迁移与数据所有权

游戏 Worker 可以共享 D1，但不能让任意游戏代码拥有全库写权限或自行执行不受协调的 schema migration。

规则：

- 数据库 schema migration 只由平台级迁移流程执行一次。
- 先部署向后兼容的 schema，再部署使用新字段的 API/游戏 Worker；删除字段或收紧约束应在所有旧 Worker 下线后进行。
- 每张用户数据表应定义逻辑所有者和 `game_id` 范围，查询与写入必须带游戏范围校验。
- Game Worker 最好不直接写用户数据，而是通过 Platform API Worker 调用；这也便于统一限流、审计和授权。
- 预发布环境必须使用独立 D1、R2 和密钥，不得连接生产数据。

### 26.7 Secrets、绑定与最小权限

每个 Worker 只声明必需的 bindings 和 secrets。不要因为部署方便，将生产 D1、R2、Service Binding、第三方密钥全部分配给每个游戏 Worker。

最低要求：

```text
Router：仅 Main/Game Service Bindings 和必要的路由配置
Game：本游戏只读数据/资产绑定，以及必要的 Platform API Binding
Platform API：认证密钥、用户数据 D1、写操作权限
Main：公共数据、导航与 sitemap 所需最小权限
```

secrets 不应写进部署清单、源码、前端环境变量、日志或调试响应头。新增 Worker 时必须检查生产和预发布环境的 binding 名称、资源 ID、secret 是否完整且隔离。

### 26.8 预览环境与生产环境必须同构

单独部署一个子 Worker 并不能证明生产路径可用。预览环境必须具备和生产一致的 Router -> Main/Game -> API 调用链，以及独立资源前缀。

建议使用专用预发布主机名，例如：

```text
staging.gachia.com
```

预发布环境必须：

- 使用独立 Worker 名称和 Service Bindings。
- 使用独立 D1、R2、认证密钥和第三方回调配置。
- 使用 `noindex` 或访问控制，禁止被搜索引擎索引。
- 覆盖真实的同域 URL 结构和静态资源路径。

不得只在 `*.workers.dev` 验证后直接切换 `gachia.com`。

### 26.9 搜索引擎爬虫与边缘安全规则

迁移期间要检查 Cloudflare WAF、Bot 管理、Rate Limiting、Challenge 和缓存规则，确保它们对由不同 Worker 提供的公开内容一致生效。

注意事项：

- 不要对 Googlebot、Bingbot 等正常搜索引擎爬虫返回挑战页、登录页或地域差异内容。
- 对用户和 Googlebot 返回同一主内容与 canonical，避免 cloaking 风险。
- 继续允许 `robots.txt`、sitemap、结构化数据页面和静态资源被正常抓取。
- 若按路径设置缓存或安全规则，新增游戏路径和资产前缀必须一并登记。

### 26.10 前端链接、表单和绝对 URL 清理

拆分后很容易在模板、JSON-LD、邮件、API 回调、OAuth 回调和客户端常量中遗留 `workers.dev`、预览域名或旧资源路径。

构建和部署前应扫描：

```text
workers.dev
pages.dev
staging.gachia.com
/_next/
NEXT_PUBLIC_APP_URL
BETTER_AUTH_URL
https://gachia.com
```

除明确允许的预览配置外，公开 HTML、canonical、hreflang、JSON-LD、sitemap、Open Graph、RSS 和邮件链接都必须指向生产主域名。

### 26.11 变更范围控制和迁移批次

首次试点只迁移一个游戏，且避免与以下事项同一批上线：

```text
Next.js / OpenNext 大版本升级
认证系统重构
D1 schema 大迁移
全站 URL 重写
大规模内容更新
Cloudflare 安全策略调整
```

这些变更应分批进行。否则出现抓取、资源或认证故障时，难以判断原因并安全回滚。

### 26.12 必须执行的上线验收清单

生产 Router 切换前，至少完成：

- [ ] Router 对页面、游戏资产、游戏 sitemap、主站路径和未知路径的分发符合预期。
- [ ] 不存在 Service Binding 递归、同域 fetch 回环或重复 30x 跳转。
- [ ] 代表 URL 的 HTML、canonical、hreflang、JSON-LD、正文和状态码与旧站一致。
- [ ] 首次访问、硬刷新、无缓存访问、站内跳转和浏览器预取均无 JS/CSS/RSC/图片 404。
- [ ] 未登录、登录、登出、跨游戏跳转、收藏、地图进度和私有 API 权限正确。
- [ ] 两个不同用户会话之间不存在缓存或数据泄露。
- [ ] 子游戏 Worker gzip 包体低于预算，且仍有增长余量。
- [ ] 预发布环境已完成同构验证，并且没有被索引。
- [ ] Router 已准备可即时启用的回滚目标，回滚不改变 URL。
- [ ] Cloudflare 日志、错误告警和 Search Console 基线已建立。
- [ ] 迁移期间不同时合并不相关的大版本升级或数据库破坏性变更。
