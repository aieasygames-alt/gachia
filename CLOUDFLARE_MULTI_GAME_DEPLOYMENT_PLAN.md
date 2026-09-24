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

## 11. 新增游戏标准 SOP

新增游戏不是“复制一个页面目录”即可上线，必须按以下顺序完成。任何一步未通过，都不能绑定生产路由。

### 11.1 先决定部署边界

在开发前明确游戏是主站游戏还是独立 Worker：

1. 评估该游戏新增代码、数据、图片和依赖对主站 Worker 包体的影响。
2. 一旦选择独立 Worker，游戏页面、数据、静态资源、sitemap 和专属样式全部放入 `apps/game-<game>`。
3. 主站只保留首页入口、跨游戏摘要和指向该游戏的链接，不得继续静态导入该游戏完整数据。
4. Router 增加 Service Binding、生产开关和路径判断；默认关闭开关，完成验证后再开启。

### 11.2 游戏注册与共享协议

按以下顺序注册游戏，避免只改一处导致测试或路由遗漏：

1. `packages/core/types`：新增 `GameId`。
2. `packages/core/constants`：新增游戏名称、主题、启用路由。
3. `packages/core/deployments`：登记 Worker 名称、资源前缀和 sitemap 路径。
4. `packages/data/games/<game>`：新增原始数据、类型和数据校验。
5. `packages/ui`：只增加共享导航所需的游戏清单或精选游戏配置，不在各 Worker 复制游戏名单。
6. 主站 `middleware`、sitemap、首页入口、搜索 manifest 和测试：显式确认是否应由主站处理。

共享 Header 的结构、游戏列表、精选游戏和语言标签必须来自 `packages/ui`。独立 Worker 可以有自己的二级栏目，但不得另写一套全局顶部布局、游戏列表或语言切换逻辑。

### 11.3 独立 Worker 实现

`apps/game-<game>` 至少应具备：

```text
app/[lang]/<game>/...
components/game-nav.tsx
lib/data.ts
app/robots.ts
app/sitemap.ts
wrangler.jsonc
scripts/smoke.mjs
```

必须在构建前确定：

- `assetPrefix` 使用 `/_games/<game>`，不能使用通用 `/_next`。
- 页面 canonical、Open Graph、hreflang 全部指向 `https://gachia.com`。
- 游戏 sitemap 在独立 Worker 内生成，页面 URL 仍使用主域名。
- Worker 不得依赖主站未声明的运行时变量、D1、R2 或认证绑定。

### 11.4 Router 接入

每个游戏至少要覆盖以下路径族：

```text
/<lang>/<game>/*
/_games/<game>/_next/*
/sitemaps/<game>/*
```

页面路径和资源路径必须分别测试。Router 的生产配置应明确写出：

- `GAME_ENABLED=true|false`
- Canary Cookie 名称必须按游戏独立，不能复用其他游戏的 Cookie 名称。
- Service Binding 名称与 Worker 名称一一对应。
- 根 `/sitemap.xml`、`/_next/*`、`/api/*` 和认证 Cookie 不得被错误转发到游戏 Worker。

### 11.5 CI 与锁文件闸门

提交前必须本地执行：

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm test
pnpm lint
pnpm --filter @gachia/data validate
pnpm --filter @gachia/data generate:manifests
pnpm --filter @gachia/data verify:manifests
pnpm --filter @gachia/game-<game> verify:bundle
pnpm --filter @gachia/router test
```

修改任何 workspace `package.json` 后，必须重新生成并提交 `pnpm-lock.yaml`。不能用 `--no-frozen-lockfile` 掩盖锁文件漂移，否则 Cloudflare 构建环境会在安装阶段失败。

Manifest 校验中的游戏数量、搜索索引和客户端数据文件必须与注册表同步。新增游戏后，生成器和校验器必须同时更新。

### 11.6 生产部署顺序

GitHub Actions 的生产部署顺序固定为：

```text
1. 构建并验证主站
2. 部署游戏 Worker
3. 部署 Router Worker
4. 部署主站 Worker
5. 执行生产冒烟测试
```

先部署游戏 Worker 是为了保证 Router 切换后目标 Service Binding 已可用；Router 必须在主站之前发布，确保绑定和路径规则先就绪。

### 11.7 线上全流程验证

新游戏上线后至少验证以下 URL，且同时检查状态码、最终 URL、canonical 和 HTML 中的资源前缀：

```text
https://gachia.com/<lang>/<game>
https://gachia.com/<lang>/<game>/characters
https://gachia.com/<lang>/<game>/guides
https://gachia.com/<lang>/<game>/sitemap.xml
https://gachia.com/sitemaps/<game>/index.xml
https://gachia.com/sitemap.xml
https://gachia.com/_games/<game>/_next/<实际 hash 资源>
https://gachia.com/api/auth/get-session
```

静态资源不能写死为 `webpack.js` 等不稳定文件名，必须从线上 HTML 提取实际带 hash 的 CSS/JS URL 再验证。冒烟脚本应对每个 URL 重试，并输出失败 URL。

## 12. Azur Promilia 复盘：经验与教训

Azur Promilia 的接入暴露了以下可复用问题：

1. **通用路由静态生成遗漏独立 Worker 边界**：Azur 被加入核心游戏注册表后，主站通用攻略详情自动生成了 Azur 参数，但主站没有 Azur runtime，导致构建 404。独立 Worker 游戏必须从主站通用 `generateStaticParams`、通用数据导入和主站详情路由中排除。
2. **注册表不是单点配置**：新增 `GameId` 后还必须同步 middleware matcher、manifest 生成器、manifest 校验器、sitemap、首页入口和测试。应把这些同步项列入 PR checklist。
3. **独立 Worker 复制导航会产生视觉漂移**：主站、NTE、Azur 曾分别实现 Header，导致容器宽度、右侧操作区、游戏菜单和移动端行为不一致。共享导航数据与 CSS 契约后，独立 Worker 只实现游戏二级栏目。
4. **顶部平铺全部游戏不可扩展**：游戏数量增长后会出现横向滚动条。顶部只展示精选游戏，其余通过“更多游戏”入口进入本地化全部游戏页；该页面必须在主站真实存在，不能只写 `/games` 占位链接。
5. **生产冒烟探针必须稳定**：固定检查不存在的 `/_next/static/chunks/webpack.js` 会让三段 Worker 都部署成功后仍被判定失败。应检查页面、sitemap 和从 HTML 提取的实际 hash 资源。
6. **配置环境必须和发布策略一致**：用户决定直接生产上线后，生产开关应开启，staging Worker 可以删除；但 staging 配置、预览工作流和“生产必须关闭”的断言也必须同步清理或改写。
7. **删除 staging 不等于删除所有引用**：删除 Worker 后要同时检查 Router Service Binding、wrangler 环境、GitHub Actions、文档和 smoke 脚本，避免部署时绑定到不存在的服务。
8. **先验证再绑定域名**：生产 Route 绑定前，必须先用 `workers.dev` origin 验证独立 Worker 页面和资源，再绑定 `gachia.com/*`；绑定后还要确认根 sitemap、主站 `/_next/*`、API、认证 Cookie 和其他游戏路径未被截断。
9. **导航应由共享数据驱动**：`packages/ui` 同时提供精选游戏列表和“更多游戏”列表；主站与独立 Worker 只消费这份配置。主站移动端也只能展示精选入口并换行，不能恢复全量游戏横向滚动。
10. **独立 Worker 的顶部布局必须遵守 CSS 契约**：顶部游戏栏允许换行且不得使用 `overflow-x-auto`；游戏自身的二级栏目同样应在窄屏换行。表格、对比工具等内容区域的局部横向滚动不属于导航问题，可单独保留。
11. **部署配置必须可执行校验**：每次新增或切换游戏状态后运行 `pnpm validate:game-deployments`，确认独立 Worker、Router Service Binding、生产开关和 Worker 名称仍一致；该命令应纳入 CI。
12. **Router 元数据可生成，页面白名单需显式维护**：可从 `GAME_DEPLOYMENTS` 生成 Worker、资源前缀和 sitemap 配置；页面/详情白名单仍由 Router 明确定义并用测试覆盖，不能因自动生成而放宽未知路径转发。

## 13. 新增游戏上线检查清单

### 代码与数据

- [ ] `GameId`、主题、路由、部署登记已同步
- [ ] 游戏数据只被独立 Worker 导入
- [ ] 主站通用静态参数不会生成该游戏页面
- [ ] 数据校验、搜索 manifest、客户端 manifest 已更新
- [ ] `pnpm-lock.yaml` 与所有 workspace package.json 一致

### Worker 与 Router

- [ ] 独立 Worker 生产构建通过
- [ ] `assetPrefix` 和资源路由已隔离
- [ ] Service Binding 名称、Worker 名称和生产环境一致
- [ ] 生产开关、Canary Cookie 名称和 staging 策略已确认
- [ ] 页面、资源、sitemap 三类路径均已加入 Router 测试

### UI 与 SEO

- [ ] 全局 Header 使用 `packages/ui` 共享协议
- [ ] 顶部没有强制横向滚动条
- [ ] 主站桌面和移动端均只展示精选游戏，完整列表通过本地化“更多游戏”页面访问
- [ ] 独立 Worker 未复制全量游戏名单，且顶部/二级导航在窄屏可换行
- [ ] “更多游戏”目标页面真实存在且带语言前缀
- [ ] canonical、hreflang、OG、JSON-LD 使用主域名
- [ ] 根 sitemap 仍由主站返回聚合内容

### 发布与线上验证

- [ ] CI install 使用 `--frozen-lockfile` 通过
- [ ] `pnpm validate:game-deployments` 通过且已纳入 CI
- [ ] type-check、test、lint、data validate 全部通过
- [ ] 部署顺序为游戏 Worker → Router → 主站 Worker
- [ ] 生产 Route 绑定前已完成 origin 验证
- [ ] 绑定后所有主站、已有游戏和新游戏 URL 冒烟通过
- [ ] 部署版本 ID、Route、Service Binding 和验证结果已记录

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

当前仓库状态（2026-09-11）：NTE 与 Azur Promilia 均登记为 `live`，并已接入生产 Router；Azur staging Worker 已不再作为发布前置条件。新增游戏仍必须逐项完成上线清单，不能因现有游戏已上线而跳过 origin、Router、资源、SEO、认证和回滚验证。

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

## 27. Genshin 独立 Worker 实施专项（当前执行方案）

### 27.1 目标、范围与状态

**目标**：将 `https://gachia.com/{zh,en,ja}/genshin/*` 从 `gachia-main` 无跳转切换到 `gachia-game-genshin`。浏览器、Googlebot、外链和 Search Console 看到的 URL、HTTP 语义和可索引内容均保持不变。

**当前状态（2026-09-24）**：`NTE`、`Azur Promilia` 已为 `live` 独立 Worker；`Genshin` 仍由 Main Worker 服务。本章是 Genshin 的唯一实施清单。每完成一项，应将对应状态更新为 `[x]`，同时在“执行记录”中写入日期、PR/提交、验证命令和结果；任何标记为“切流阻断”的项未通过，均不得修改生产 Router 分流。

**迁移范围**：游戏首页、角色/武器/圣遗物/材料资料、攻略、兑换码、版本、抽卡、配装、队伍、强度榜、角色对比、伤害计算器、交互地图、下载页，以及 Genshin 专属 sitemap 和静态资源。

**明确留在 Main / Platform API 的范围**：首页、`/{lang}/games`、跨游戏导航、日历、市场情报、全站 `robots.txt`、根 `/sitemap.xml`、`/api/auth/*`、`/api/favorites`、`/api/map/*`、`/api/shared-builds`、`/api/user-characters`。Genshin Worker 对这些能力只经同域 `/api/*` 调用；不得复制认证、D1 写入逻辑或跨游戏数据到游戏 Worker。

| 阶段 | 状态 | 切流阻断 | 交付物 |
|---|---|---:|---|
| 0. 基线冻结与 URL 清单 | [~] 进行中 | 是 | 可复测的旧站 SEO/功能基线 |
| 1. 创建隔离应用与数据边界 | [~] 进行中 | 是 | `apps/game-genshin` 可本地构建 |
| 2. 路由、静态资源与 API 契约 | [x] 已完成（默认关闭） | 是 | Router 白名单、资源命名空间、API 兼容性 |
| 3. Sitemap、SEO 与预发布验证 | [ ] 未开始 | 是 | SEO parity 报告与预发布冒烟结果 |
| 4. CI、包体预算与可回滚发布 | [ ] 未开始 | 是 | 自动门禁、发布和回滚步骤 |
| 5. 生产切流与观察 | [ ] 未开始 | 是 | 生产验收记录及 Search Console 观察 |

### 27.2 阶段 0：冻结迁移基线（先做，禁止混入内容重写）

- [ ] 从生产站抓取三种语言的首页、角色列表/详情、武器列表/详情、圣遗物、材料、攻略列表/详情、兑换码、版本、抽卡、配装、队伍、强度榜、对比、计算器、地图、下载页。
- [ ] 每条样本保存：请求 URL、最终 URL、状态码、`title`、`meta description`、canonical、hreflang、robots/X-Robots-Tag、JSON-LD 类型与 `mainEntityOfPage`、正文文本长度、站内链接数、HTML 中的 CSS/JS/RSC/图片地址。
- [ ] 选择每种 URL 至少一个真实详情 slug；不可用虚构或即将下线的版本 slug。建议覆盖 `characters/<id>`、`weapons/<id>`、`guides/<slug>`、`artifacts/<id>`、`items/<id>`。
- [ ] 保存根 `/sitemap.xml`、现有 Genshin URL 集合及 `lastModified` 基线；切换期间禁止改 URL 结构、删除可索引页面、批量改标题或重写正文。
- [ ] 对匿名、登录、登出三种会话分别记录地图进度、收藏和共享配装的响应头与行为；私有响应必须维持 `Cache-Control: private, no-store` 和 `Vary: Cookie, Authorization`。
- [ ] 记录当前 Main Worker dry-run gzip 包体和 Genshin 数据模块大小，作为拆分收益基线。
- [x] 新增 `pnpm genshin:seo-baseline`，对三种语言的核心页面和真实角色、武器、圣遗物、攻略详情生成可版本化的生产 SEO 基线报告。
- [x] 确认当前生产站的 `guides/banner-schedule-guide` 与 `redeem-codes` 缺少完整 hreflang；它们列为独立 Worker 必须修复的迁移前缺陷，不能被当作可接受的切流回归。

**阶段通过标准**：基线报告可在 CI 或本地重跑，且所有样本明确属于 Genshin 页面或 Main/API 页面。未取得基线，不创建生产 Router 绑定。

### 27.3 阶段 1：建立 `apps/game-genshin`（仅导入 Genshin）

- [ ] 基于 `apps/game-nte` 的 OpenNext/Cloudflare 结构创建 `apps/game-genshin`，Worker 名称定为 `gachia-game-genshin`，并将其加入 pnpm workspace、类型检查和 bundle 验证。
- [ ] 设置 `assetPrefix: '/_games/genshin'`，且仅在独立 Worker 的 preview rewrite 中将 `/_games/genshin/_next/*` 映射回 `/_next/*`；生产浏览器 HTML 必须只引用 `/_games/genshin/_next/*`。
- [ ] 将 Genshin 路由迁入：`characters`、`weapons`、`artifacts`、`items`、`guides`、`redeem-codes`、`version`、`gacha`、`build`、`teams`、`tier-list`、`compare`、`calculator`、`map`、`download`，以及相应详情页。不存在内容的路由必须与旧站保持同样的 404/重定向语义。
- [ ] 只从 `@gachia/data/games/genshin/*` 导入 Genshin 原始数据、类型和图片映射；禁止通过 `@gachia/data` 根 barrel 或通用全游戏静态参数间接拉入其它游戏数据。
- [ ] 复用 `@gachia/core`、`@gachia/ui` 的语言、游戏配置和 Header 协议；不要复制全站游戏列表、语言切换规则或全局导航 CSS。
- [ ] Main Worker 中的通用 `[game]` 路由、`generateStaticParams`、sitemap、搜索 manifest 和内容导入必须在 Genshin 变为 `live` 后显式排除 Genshin runtime 数据，避免“Router 已拆但主 Worker 仍打包 Genshin”的伪拆分。
- [ ] Genshin Worker 自身不导入 `better-auth`、D1 schema、全站搜索索引或 Leaflet 以外不必需的主站依赖；地图相关客户端依赖只在地图路由按需加载。
- [x] 初版独立 Worker 已通过 `pnpm --filter @gachia/game-genshin type-check`、`build`、`verify:bundle`；dry-run gzip 为 `1034.72 KiB`，低于 `2.2 MiB` 预算。
- [x] 已补入版本、强度榜、下载、地图、配装、队伍、对比和材料规划页面的 Genshin 专属 SSR 实现；地图进度和用户态数据仍只经主域名 `/api/*`，未复制认证或 D1 写入逻辑。

**阶段通过标准**：`pnpm --filter @gachia/game-genshin type-check`、`build`、`verify:bundle` 通过，压缩上传体积不超过 `2.2 MiB`；若超过绝对 `3 MiB`，立即停止，不进入 Router 接入阶段。

### 27.4 阶段 2：Router、资源、API 与身份边界

Genshin Router 白名单必须精确覆盖以下三类路径，未知游戏路径一律继续交给 `MAIN_SITE`，以保留旧的 404、301 与公共页面行为：

```text
/<lang>/genshin
/<lang>/genshin/<页面白名单>
/<lang>/genshin/<详情页白名单>/<slug>
/_games/genshin/_next/*
/sitemaps/genshin/index.xml
```

页面白名单初始值：`characters`、`weapons`、`artifacts`、`items`、`guides`、`redeem-codes`、`version`、`gacha`、`build`、`teams`、`tier-list`、`compare`、`calculator`、`map`、`download`。详情页白名单应根据实际路由限定为 `characters`、`weapons`、`artifacts`、`items`、`guides`；实施时必须以迁入后的文件系统和测试为准，不允许为省事放宽为任意深度路径。

- [x] 在 `packages/core/deployments.ts` 登记 `genshin`：Worker `gachia-game-genshin`、资源前缀 `/_games/genshin`、sitemap `/sitemaps/genshin/index.xml`，初始状态为 `preview`，不得提前设为 `live`。
- [x] 扩展生成 Router 清单、`apps/router/wrangler.jsonc` Service Binding、Router `Env`、路径判断、请求改写和单元测试；Service Binding 名为 `GENSHIN_SITE`，开关为 `GENSHIN_ENABLED`，Canary Cookie 单独命名为 `gachia_genshin_canary`。
- [x] Router 将 `/_games/genshin/_next/*` 转发到 `GENSHIN_SITE` 前，剥离 `/_games/genshin` 前缀为 Worker 内部的 `/_next/*`；将 `/sitemaps/genshin/index.xml` 改写为该 Worker 的 `/sitemap.xml`。不得转发根 `/_next/*`、根 sitemap、`/api/*`、认证回调或其它游戏资源。
- [x] Router 测试覆盖 Genshin 三语言页面、详情页、资源重写、游戏 sitemap、非法 locale、未知页面、过深路径和相似前缀；既有 NTE/Azur/Main 路径测试继续通过。`/api/*` 和根 `/_next/*` 不在任何 Genshin 白名单中，继续交给 Main Worker。
- [ ] Genshin 的收藏、地图进度、共享配装和用户角色请求继续指向 `https://gachia.com/api/*`；验证 Worker 通过 Router 返回 Main/API 响应时没有 Service Binding 递归。禁止在 Genshin Worker 中 `fetch('https://gachia.com/...')` 回调自己的页面路径。
- [ ] 地图 tile、点位和进度接口按匿名/认证属性分别测试缓存：公开地图数据可缓存，用户进度绝不能缓存或跨用户复用。Cookie 域保持主域名，Path 和 SameSite 不得因 Worker 切换改变。

**阶段通过标准**：所有 Router 单元测试通过；打开 `GENSHIN_ENABLED=false` 时，所有 Genshin 生产路径仍由 Main Worker 返回原响应；开启仅 preview/canary 后，只有持有正确 Cookie 的请求进入 Genshin Worker。

### 27.5 阶段 3：SEO、sitemap 与预发布等价性（最高优先级）

- [ ] 在 `apps/game-genshin` 统一生成 metadata：canonical、hreflang、Open Graph、Twitter、JSON-LD 的 URL 一律为 `https://gachia.com/{lang}/genshin/...`；禁止出现 `workers.dev`、preview 主机或 `/_games/genshin` 作为 canonical/OG URL。
- [ ] 预发布 Worker 必须返回 `X-Robots-Tag: noindex, nofollow` 且其 `robots.txt` 为 `Disallow: /`；生产 Worker 和经主域名 Router 返回的 Genshin 页面不得错误继承 noindex。
- [ ] Genshin Worker 生成自己的 `/sitemap.xml`，并仅列出实际可索引的 Genshin 页面；Router 暴露为 `/sitemaps/genshin/index.xml`。根 `/sitemap.xml` 必须成为 sitemap index 或聚合入口，并稳定包含该 Genshin sitemap，不能重复列出同一 Genshin URL。
- [ ] Main sitemap、主站通用 `generateStaticParams` 与资料页静态导入在 Genshin `live` 后不得再生成或打包完整 Genshin 页面；根 sitemap 仍需保留 Genshin 子 sitemap 的发现入口。
- [ ] 新增 `genshin-seo-parity` 脚本：将阶段 0 样本在 Main 基线与独立 Worker preview/主域名 canary 上逐项比较状态码、最终 URL、title、description、canonical、hreflang、robots、JSON-LD、正文文本长度和 Genshin 内链数；允许的正文长度偏差必须有书面原因，默认不得减少。
- [ ] 从每个预发布 HTML 动态提取实际 hash CSS/JS/RSC 地址，并检查 200、正确 MIME、无跨游戏资源前缀、首访与硬刷新均无 hydration 错误。不要固定检查 `webpack.js` 等构建产物名。
- [ ] 用未登录、已登录、Cookie 缺失/过期、Googlebot User-Agent（只验证匿名 HTML，不伪造特权）验证：可索引资料页始终为匿名可访问；私有 API 不会泄露数据或返回可索引登录页。
- [ ] Genshin Worker 页面应保留原 URL 的语言规范化、历史 URL 301、错误 slug 404；若这些规则目前在 `apps/web/middleware.ts`，必须先抽取为 Router 或 Genshin Worker 可共享逻辑，并在 parity 中逐条比对。

**切流硬门槛**：任一代表 URL 出现状态码变化、canonical/hreflang 缺失或指向非 `gachia.com`、正文显著减少、JSON-LD 丢失、Genshin 内链断裂、资源 404、匿名访问变为登录/401、或 sitemap URL 404，即判定失败，禁止开启生产分流。

### 27.6 阶段 4：CI、发布顺序与回滚

- [ ] CI 新增 `@gachia/game-genshin` 的 `type-check`、`verify:bundle`、SEO parity、预发布 smoke 和 Router 测试；`verify:bundle` 输出并保存 gzip 体积，超过 `2.2 MiB` 阻止合并。
- [x] 更新 `pnpm validate:game-deployments`，从部署清单派生校验 `GENSHIN_SITE`、Worker 名称、资源前缀、sitemap、开关和生产状态，不新增只覆盖 Genshin 的硬编码分支。
- [ ] 新增生产 smoke：游戏首页、每种列表和详情、地图、工具、Genshin sitemap、根 sitemap、从 HTML 提取的 hash 资源、`/api/auth/get-session`、收藏和地图进度权限边界；同时验证 `X-Gachia-Route-Target` 调试标记（仅在请求头显式开启时）。
- [ ] 部署顺序固定为：兼容 API（如有） -> Genshin Worker preview -> preview parity/smoke -> Genshin Worker production -> Router（先保持 `GENSHIN_ENABLED=false`） -> Main Worker（移除 Genshin runtime） -> 生产 canary -> Router 全量开启。
- [ ] Router 发布前保留 `MAIN_SITE` 作为 Genshin 的直接 fallback，记录切换前 Main Worker 版本和 Genshin Worker 版本；故障时将 `GENSHIN_ENABLED=false` 回滚到 Main，不改变 URL、canonical 或 sitemap URL。
- [ ] 发布窗口内禁止同时改 D1 schema、认证提供商、全站中间件、Next.js/OpenNext/Wrangler 大版本或 Genshin 内容模型；将这些变更拆到独立发布。

**阶段通过标准**：CI 全绿，预发布/生产 canary 的 SEO parity 无阻断项，Router 回滚演练可在不改 URL 的情况下恢复 Main Worker，并且记录实际恢复耗时。

### 27.7 阶段 5：生产切流、验收与 2-4 周观察

- [ ] 先将 `GENSHIN_ENABLED=true` 与仅内部 canary Cookie 一起发布，使用 `X-Gachia-Route-Debug: 1` 验证只有预期请求命中 `genshin`；无 Cookie 请求仍命中 `main`。
- [ ] Canary 保持至少一个完整的流量与缓存周期，完成阶段 3 的全量样本、Chrome 首访/硬刷新/站内跳转、移动端地图和登录功能验证后，再移除 Canary 限制进行全量分流。
- [ ] 全量切流后立即验证：根 `/sitemap.xml`、`/sitemaps/genshin/index.xml`、三语言 Genshin 代表页、根 `/_next/*`、其它独立游戏资产、主站首页、认证、收藏、地图进度和无效 URL。
- [ ] 记录 Cloudflare Worker 错误率、5xx、资源 404、Router 目标分布、TTFB、缓存命中率；出现持续 5xx、资源/hydration 故障、认证泄露或 SEO 硬门槛失败时，立即 `GENSHIN_ENABLED=false` 回滚。
- [ ] 在 Search Console 连续观察 2-4 周：Genshin sitemap 读取状态、已编入索引页数、抓取统计、404/5xx、重定向错误、canonical 选择、hreflang 诊断、Genshin 查询的展示/点击/排名。期间不因短期波动调整 URL。
- [ ] 观察期结束并确认无回归后，将 `GAME_DEPLOYMENTS.genshin.status` 从 `preview` 更新为 `live`，移除过渡 canary 配置，并更新本章执行记录。

### 27.8 Genshin 执行记录

| 日期 | 阶段/步骤 | 状态 | 证据（PR/提交、命令、报告） | SEO 结论/备注 |
|---|---|---|---|---|
| 2026-09-24 | 专项方案创建 | 已完成 | 本文第 27 章 | 未开始代码迁移；生产路由未变更 |
| 2026-09-24 | 阶段 0：SEO 基线采集脚本 | 进行中 | `pnpm genshin:seo-baseline` | 已覆盖 60 个三语言代表 URL；解析器兼容 Next.js `hrefLang` 输出，现有两类页面的 hreflang 缺失已登记为迁移前待修复项 |
| 2026-09-24 | 阶段 1：独立应用骨架 | 进行中 | `pnpm --filter @gachia/game-genshin verify:bundle` | 已建立独立 Worker、`/_games/genshin` 资源前缀、主域名 SEO metadata 和完整页面路由初版；地图进度、收藏、账号与私有数据仍留在 Main/API；最新 dry-run gzip `1167.89 KiB`，未接入 Router |
| 2026-09-24 | 阶段 2：Router 默认关闭接入 | 已完成（未发布） | `pnpm generate:router-config && pnpm --filter @gachia/router type-check && pnpm --filter @gachia/router test` | 已加入精确 Genshin 页面/资源/sitemap 白名单、`GENSHIN_SITE`、`GENSHIN_ENABLED=false` 和独立 Cookie；17 项 Router 测试通过，无 Cookie 或开关关闭时继续由 Main Worker 响应 |
| 2026-09-24 | 阶段 3：本地与远端预发布排查 | 已完成 | `pnpm --filter @gachia/game-genshin verify:bundle`、GitHub Actions run `35980547028` | 已修复 Worker 运行期 JSON 动态加载导致的 500；staging Worker 的 60 个代表 URL、实际 hash 资源、robots 禁抓取和 preview noindex metadata 均通过。未发布 Router、不修改生产开关 |
| 2026-09-24 | 阶段 3：远端 preview 门禁 | 已完成 | `.github/workflows/genshin-worker-preview.yml`、GitHub Actions run `35980547028` | 仅手动部署 `gachia-game-genshin-staging`，检查 `robots.txt` 禁止抓取、页面 `meta robots=noindex`、实际 hash 资源 200，并运行 60 URL parity；不发布 Router、不修改生产开关 |
| 2026-09-24 | 阶段 3：首次远端 preview 执行 | 阻断（CI 工具修复中） | GitHub Actions run `35976409089` | staging Worker 已成功部署至 `gachia-game-genshin-staging.aieasygames.workers.dev`，但检查步骤依赖 runner 未安装的 `rg`，在 Worker 响应验证前失败；已改用系统 `grep`，生产 Router 仍关闭 |
| 2026-09-24 | 阶段 3：第二次远端 preview 执行 | 阻断（Worker 500，诊断增强中） | GitHub Actions run `35976787956` | staging Worker 上传成功，但 `robots.txt` 后的 Genshin 页面请求返回 HTTP 500；未运行 parity，生产 Router 保持关闭。已使 workflow 在后续失败时输出完整 headers/body，并补齐 preview HTML robots metadata |
| 2026-09-24 | 阶段 3：Worker 500 诊断与修复 | 已完成 | commits `b8b9767`、`1810a93` | 根因是 Genshin JSON 数据模块在 Cloudflare runtime 中使用 Node 路径动态加载；改为静态 JSON import 后，Worker SSR 正常。未调整生产 Router 或流量 |
| 2026-09-24 | 阶段 3：生产 Worker origin 验证 | 已完成 | `.github/workflows/genshin-worker-production-origin.yml`、GitHub Actions run `35983948069` | 已部署独立生产 Worker 并验证 `robots.txt` 可抓取、首页、SSG 角色详情页、sitemap 与内部 hash 资源均为 200；生产 Router 断言 `GENSHIN_ENABLED=false`，无用户流量切换 |
| 2026-09-24 | 阶段 3：生产 noindex 修复 | 已完成 | commits `9911285`、`07f02f0`、GitHub Actions run `35983948069` | SSG 页面曾因 Next 静态 header 冻结而返回 `X-Robots-Tag: noindex`；已移除构建期 header，并将 preview 防抓取改为 `robots.txt` 与 `meta robots=noindex`。生产 origin 的首页、SSG 详情页和 sitemap 已确认无 noindex |
| 待完成 | 阶段 3/4：主域名 canary SEO/API 验证 | 切流阻断 | 主域名 cookie canary、完整 parity 与权限 smoke | 在 `GENSHIN_ENABLED=true` 且仅内部 Cookie 的 Router 发布前，必须先补齐完整基线内容/JSON-LD/hreflang 比对及登录、收藏、地图进度 API 边界验证；未通过前不得切流 |
| 待完成 | 阶段 5：生产 canary 与全量切流 | 未开始 |  | 仅在所有切流硬门槛通过后执行 |
