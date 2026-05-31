# Gachia Phase 4 综合规划文档

> 版本: v1.0 | 日期: 2026-05-11 | 状态: 规划中

---

## 目录

1. [PRD — 产品需求文档](#1-prd)
2. [技术方案](#2-技术方案)
3. [部署方案](#3-部署方案)
4. [测试方案](#4-测试方案)
5. [里程碑与排期](#5-里程碑与排期)
6. [风险评估](#6-风险评估)

---

## 1. PRD

### 1.1 产品概述

Gachia (gachia.com) 是一站式二次元开放世界游戏数据库平台，覆盖原神 (Genshin Impact)、崩坏：星穹铁道 (Honkai: Star Rail)、鸣潮 (Wuthering Waves)、无限暖暖 (Infinity Nikki / NTE) 四款游戏。Phase 4 的目标是将平台从 MVP 阶段推进到生产就绪状态，分为 **4A（MVP 完善）** 和 **4B（V1 架构升级）** 两个子阶段。

### 1.2 Phase 4A — MVP 完善（SSG 架构内）

#### 4A.1 WuWa 计算器

| 字段 | 内容 |
|------|------|
| **需求** | 鸣潮角色养成计算器，包含升级材料计算与材料规划 |
| **用户故事** | 作为鸣潮玩家，我想在 gachia.com 上计算角色升级所需材料，并追踪我的库存 |
| **功能** | 1) 角色选择器（搜索 + 属性筛选 + 稀有度筛选）2) 升级材料表格（等级 × 材料 × 数量）3) 材料规划器（库存管理 + 缺口计算 + localStorage 持久化）|
| **数据依赖** | WuWa 角色材料数据（需新建 `raw-character-materials.json`）|
| **验收标准** | 1) calculator 页面 WuWa tab 正常渲染 2) 选角色后显示完整材料表 3) 材料规划器可增减库存并计算缺口 4) 三语言切换正常 |
| **优先级** | P0 |
| **预估工作量** | 1 个工作日 |

#### 4A.2 Pagefind 全站搜索

| 字段 | 内容 |
|------|------|
| **需求** | 静态全文搜索，覆盖角色、武器、材料、攻略 |
| **用户故事** | 作为用户，我想通过搜索快速找到角色或攻略 |
| **功能** | 1) 搜索框组件（导航栏内嵌）2) 搜索结果页（分类展示：角色/武器/材料/攻略）3) 中文/英文/日文分词 |
| **技术方案** | Pagefind CLI 在 `pnpm build` 后自动索引 `out/` 目录 |
| **验收标准** | 1) 输入 "胡桃" 或 "Hu Tao" 可搜到角色页 2) 搜索结果按类型分组 3) 搜索响应 < 100ms 4) 零运行时成本 |
| **优先级** | P1 |
| **预估工作量** | 0.5 个工作日 |

#### 4A.3 Google Analytics 集成

| 字段 | 内容 |
|------|------|
| **需求** | 接入 Google Analytics 4 (GA4) 追踪用户行为 |
| **用户故事** | 作为运营者，我想了解用户访问数据以指导内容优先级 |
| **功能** | 1) GA4 脚本注入 2) 页面浏览追踪 3) 自定义事件（角色查看、计算器使用、攻略阅读）4) 多语言页面维度 |
| **技术方案** | `@next/third-parties` 的 `GoogleAnalytics` 组件，或直接在 `layout.tsx` 注入 gtag.js |
| **验收标准** | 1) GA4 实时面板可见访问数据 2) 自定义事件在 GA4 中可见 3) 不影响页面 LCP > 0.5s |
| **优先级** | P1 |
| **预估工作量** | 0.5 个工作日 |

#### 4A.4 shadcn/ui 初始化

| 字段 | 内容 |
|------|------|
| **需求** | 引入 shadcn/ui 组件库，统一 UI 基础组件 |
| **用户故事** | 作为开发者，我想使用标准化组件加速开发并保持 UI 一致性 |
| **功能** | 1) 初始化 shadcn/ui (Tailwind v4 兼容) 2) 安装基础组件：Button, Card, Dialog, Tabs, Badge, Input, Select 3) 配置暗色主题 |
| **技术方案** | `npx shadcn@latest init` → 配置 `components.json` → 按需安装组件 |
| **验收标准** | 1) `pnpm build` 通过 2) 已安装组件可在页面中正常使用 3) 暗色主题正确渲染 |
| **优先级** | P2 |
| **预估工作量** | 0.5 个工作日 |

#### 4A.5 WuWa Tier List 数据

| 字段 | 内容 |
|------|------|
| **需求** | 为鸣潮角色创建 tier list 评级数据 |
| **用户故事** | 作为鸣潮玩家，我想在 gachia.com 上查看角色强度排行 |
| **功能** | 1) 角色评级数据（S/A/B/C 分级 + 理由）2) Tier List 页面展示 |
| **数据依赖** | 需创建 WuWa 角色评级 JSON 数据 |
| **验收标准** | 1) Tier List 页面显示鸣潮角色分级 2) 分级理由三语言展示 3) 可按角色名筛选 |
| **优先级** | P2 |
| **预估工作量** | 1 个工作日 |

#### 4A.6 性能优化

| 字段 | 内容 |
|------|------|
| **需求** | 优化页面加载性能，目标 Lighthouse > 90 |
| **用户故事** | 作为用户，我想页面快速加载，3 秒内可交互 |
| **功能** | 1) 图片懒加载 + next/image 优化 2) Bundle 分析 + code splitting 3) 关键 CSS 内联 4) 预加载关键路由 |
| **技术方案** | `@next/bundle-analyzer` 分析 → 动态 import 拆分大型客户端组件 → R2 图片 CDN |
| **验收标准** | 1) Lighthouse Performance > 90 2) LCP < 2.5s 3) FID < 100ms 4) CLS < 0.1 |
| **优先级** | P2 |
| **预估工作量** | 1 个工作日 |

### 1.3 Phase 4B — V1 架构升级

#### 4B.1 Cloudflare D1 数据库

| 字段 | 内容 |
|------|------|
| **需求** | 引入 Cloudflare D1 作为用户数据存储 |
| **用户故事** | 作为运营者，我想支持用户账号系统以提供个性化功能 |
| **功能** | 1) D1 数据库创建与 schema 设计 2) Drizzle ORM 集成 3) 迁移脚本 4) CRUD 操作封装 |
| **数据库 Schema** | users, user_favorites, user_characters, shared_builds, user_sessions |
| **验收标准** | 1) D1 数据库创建成功 2) 迁移脚本可重复执行 3) CRUD 操作单元测试通过 4) Wrangler 本地开发环境正常 |
| **优先级** | P0（4B 前置） |
| **预估工作量** | 2 个工作日 |

#### 4B.2 用户认证

| 字段 | 内容 |
|------|------|
| **需求** | 实现用户注册/登录系统 |
| **用户故事** | 作为用户，我想创建账号以保存我的角色收藏和配装 |
| **功能** | 1) 邮箱/密码注册登录 2) Google OAuth 3) Session 管理 4) 个人中心页面 |
| **技术选型** | 方案 A: Better Auth (Cloudflare Workers 兼容, 自托管) 方案 B: Clerk (托管服务, 免费额度 10k MAU) |
| **验收标准** | 1) 注册/登录/登出流程完整 2) OAuth 登录正常 3) Session 7 天过期 4) 个人中心展示用户信息 |
| **优先级** | P0 |
| **预估工作量** | 2 个工作日 |

#### 4B.3 用户收藏 & 角色箱

| 字段 | 内容 |
|------|------|
| **需求** | 用户可以收藏角色并管理自己的角色库 |
| **用户故事** | 作为玩家，我想标记我拥有的角色，以便计算器自动排除我没有的角色 |
| **功能** | 1) 角色收藏/取消收藏 2) 角色箱管理（添加拥有角色 + 等级/命座）3) 收藏同步到计算器和配装页面 4) localStorage → D1 数据迁移 |
| **验收标准** | 1) 收藏操作实时同步 2) 角色箱在计算器中可用 3) 多设备登录数据一致 |
| **优先级** | P1 |
| **预估工作量** | 2 个工作日 |

#### 4B.4 配装分享持久化

| 字段 | 内容 |
|------|------|
| **需求** | 配装分享链接持久化存储到数据库 |
| **用户故事** | 作为用户，我想保存和分享我的配装方案，并且链接永久有效 |
| **功能** | 1) 配装数据存入 D1 2) 生成唯一分享 ID 3) 分享链接访问计数 4) 我的配装列表页 |
| **验收标准** | 1) 分享链接可正常打开 2) 数据库存储完整配装信息 3) 我的配装页展示所有已保存配装 |
| **优先级** | P1 |
| **预估工作量** | 1.5 个工作日 |

#### 4B.5 图片迁移至 R2

| 字段 | 内容 |
|------|------|
| **需求** | 将游戏图片资源迁移至 Cloudflare R2 |
| **用户故事** | 作为运营者，我想用 CDN 加速图片加载并降低出口费用 |
| **功能** | 1) R2 Bucket 创建 2) 图片批量上传脚本 3) URL 映射层 4) next/image 配置 R2 域名 |
| **验收标准** | 1) 所有图片从 R2 加载 2) 图片加载时间 < 500ms 3) 无 404 图片 |
| **优先级** | P2 |
| **预估工作量** | 1 个工作日 |

#### 4B.6 API Routes

| 字段 | 内容 |
|------|------|
| **需求** | 添加服务端 API Routes 支持动态数据 |
| **用户故事** | 作为开发者，我想通过 API 提供数据查询能力 |
| **功能** | 1) `/api/characters` 角色列表 API 2) `/api/builds` 配装分享 API 3) `/api/user` 用户数据 API 4) Rate limiting |
| **验收标准** | 1) API 端点返回正确 JSON 2) 认证中间件正常 3) Rate limiting 生效 |
| **优先级** | P2 |
| **预估工作量** | 2 个工作日 |

---

## 2. 技术方案

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Workers   │  │   R2     │  │   D1     │          │
│  │ (Next.js) │  │ (Images) │  │ (SQLite) │          │
│  └─────┬─────┘  └──────────┘  └──────────┘          │
│        │                                              │
│  ┌─────▼─────┐                                      │
│  │   CDN     │                                      │
│  └──────────┘                                      │
└─────────────────────────────────────────────────────┘
         │
    ┌────▼────┐
    │  User   │
    └─────────┘
```

### 2.2 当前架构（4A 阶段）

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | Next.js 15 App Router (SSG) | 所有页面静态生成 |
| 样式 | Tailwind v4 + CSS Variables | 游戏主题换肤 |
| 数据 | JSON 文件 + Zod 验证 | 编译时数据校验 |
| 搜索 | Pagefind | 静态索引，零运行时 |
| 部署 | Cloudflare Workers + OpenNext | 无服务器 |
| 分析 | Google Analytics 4 | 客户端追踪 |

### 2.3 4A 技术细节

#### 2.3.1 WuWa 计算器实现

```
新增文件:
├── packages/data/games/wuwa/raw-character-materials.json  # 升级材料数据
├── packages/data/games/wuwa/extras.ts                      # 材料数据访问层

修改文件:
├── apps/web/app/[lang]/[game]/calculator/calculator-client.tsx  # 添加 WuWa tab
├── packages/data/index.ts                                        # 导出新模块
└── packages/data/games/wuwa/index.ts                             # 导出新模块
```

**数据结构**:
```typescript
interface WuWaCharacterMaterials {
  characterId: string;
  ascensionMaterials: {
    levelRange: string;  // "1→20", "20→40", etc.
    materials: { id: string; quantity: number }[];
  }[];
}
```

**UI 复用**: 参照 StarRailCalculator 模式，在 calculator-client.tsx 中添加 `WuWaCalculator` 组件，复用已有的材料规划器 localStorage 逻辑。

#### 2.3.2 Pagefind 集成

**构建流程变更**:
```bash
# 当前流程
pnpm build --force
opennextjs-cloudflare build

# 新流程
pnpm build --force
npx pagefind --site apps/web/.next/static --output-path public/pagefind
opennextjs-cloudflare build
```

**搜索组件**:
```tsx
// components/search/search-dialog.tsx
'use client';
import { useEffect, useState } from 'react';

export function SearchDialog() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Pagefind 浏览器 API 自动加载
    async function search() {
      const pf = await (window as any).pagefind;
      const search = await pf.search(query);
      const results = await Promise.all(
        search.results.map((r: any) => r.data())
      );
      setResults(results);
    }
    if (query) search();
  }, [query]);
}
```

**数据标记**: 在各页面组件中添加 `data-pagefind-body` 属性标记可搜索内容。

#### 2.3.3 Google Analytics

```tsx
// app/[lang]/[game]/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <GoogleAnalytics gaId="G-XXXXXXXXXX" />
    </>
  );
}
```

**自定义事件**:
```typescript
// lib/analytics.ts
export function trackEvent(action: string, category: string, label?: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
    });
  }
}

// 使用
trackEvent('view_character', 'calculator', 'hu_tao');
trackEvent('calculate', 'calculator', 'ascension_80');
trackEvent('read_guide', 'guides', 'quick-start');
```

#### 2.3.4 shadcn/ui 配置

```json
// components.json
{
  "style": "default",
  "tailwind": {
    "config": "tailwind.config.ts"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

需安装组件: `button`, `card`, `dialog`, `tabs`, `badge`, `input`, `select`, `separator`, `tooltip`

### 2.4 4B 技术细节

#### 2.4.1 D1 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'email',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- 用户收藏
CREATE TABLE user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id, game_id, character_id)
);

-- 角色箱
CREATE TABLE user_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  constellation INTEGER DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id, game_id, character_id)
);

-- 配装分享
CREATE TABLE shared_builds (
  id TEXT PRIMARY KEY,  -- nanoid 生成的唯一 ID
  user_id TEXT REFERENCES users(id),
  game_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  build_data TEXT NOT NULL,  -- JSON string
  view_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER  -- NULL = 永久
);

-- 索引
CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_characters_user ON user_characters(user_id, game_id);
CREATE INDEX idx_builds_user ON shared_builds(user_id);
CREATE INDEX idx_builds_slug ON shared_builds(id);
```

#### 2.4.2 Drizzle ORM 配置

```typescript
// packages/db/src/index.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export { schema };
```

```typescript
// packages/db/src/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  provider: text('provider').default('email'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});
// ... 其他表
```

#### 2.4.3 认证方案对比

| 维度 | Better Auth | Clerk |
|------|-------------|-------|
| 部署 | 自托管 (Workers) | 托管服务 |
| 免费额度 | 无限 | 10k MAU |
| Cloudflare 兼容 | 需验证 | 官方支持 |
| 数据控制 | 完全自有 | Clerk 服务器 |
| 集成复杂度 | 中等 | 低 |
| 推荐场景 | 数据敏感、长期成本可控 | 快速上线 |

**建议**: Phase 4B 初期使用 Clerk 快速验证，后续迁移到 Better Auth 实现数据自主。

#### 2.4.4 API Routes 设计

```
/api
├── /characters
│   ├── GET  /api/characters?game=genshin    # 角色列表
│   └── GET  /api/characters/:id             # 角色详情
├── /builds
│   ├── POST   /api/builds                   # 创建配装
│   ├── GET    /api/builds/:id               # 获取配装
│   └── GET    /api/builds?user=:uid         # 用户配装列表
├── /user
│   ├── GET    /api/user/favorites           # 获取收藏
│   ├── POST   /api/user/favorites           # 添加收藏
│   ├── DELETE /api/user/favorites/:id       # 删除收藏
│   ├── GET    /api/user/characters          # 获取角色箱
│   └── PUT    /api/user/characters/:id      # 更新角色信息
└── /auth
    ├── POST /api/auth/register
    ├── POST /api/auth/login
    └── POST /api/auth/logout
```

### 2.5 目录结构变化（4B 后）

```
gachia/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── [lang]/[game]/
│       │   │   ├── calculator/
│       │   │   ├── guides/
│       │   │   ├── map/
│       │   │   ├── build/         # NEW (4A.1 后迁移)
│       │   │   ├── tier-list/
│       │   │   └── ...
│       │   ├── api/               # NEW (4B.6)
│       │   │   ├── characters/
│       │   │   ├── builds/
│       │   │   └── user/
│       │   └── ...
│       └── components/
│           ├── ui/                # NEW (4A.4) shadcn/ui 组件
│           ├── search/            # NEW (4A.2) Pagefind 搜索
│           └── ...
├── packages/
│   ├── core/                      # 核心类型和常量
│   ├── data/                      # 游戏数据 (JSON)
│   ├── db/                        # NEW (4B.1) D1 + Drizzle
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   └── index.ts
│   │   └── package.json
│   └── auth/                      # NEW (4B.2) 认证模块
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── PHASE4_PLAN.md                 # 本文档
└── ...
```

---

## 3. 部署方案

### 3.1 当前部署流程

```bash
# 1. 构建 Next.js
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build --force

# 2. 构建 Cloudflare Workers 产物
pnpm --filter @gachia/web exec opennextjs-cloudflare build

# 3. 部署到 Cloudflare Workers
pnpm --filter @gachia/web exec opennextjs-cloudflare deploy
```

**当前部署地址**: `https://gachia.aieasygames.workers.dev`

### 3.2 4A 部署流程（不变）

4A 阶段不改变部署架构，每次功能开发完成后：

1. 本地开发 → `pnpm dev` 验证
2. `pnpm build --force` 确保构建通过
3. 创建 git commit + tag
4. `opennextjs-cloudflare build && deploy`
5. 验证线上功能

**4A.2 Pagefind 特殊处理**:
```bash
# 构建后增加 Pagefind 索引步骤
pnpm build --force
npx pagefind --site apps/web/.next/static --output-path apps/web/public/pagefind
opennextjs-cloudflare build
opennextjs-cloudflare deploy
```

需在 `turbo.json` 或构建脚本中集成此步骤。

### 3.3 4B 部署流程

#### 3.3.1 Cloudflare 资源创建

```bash
# 创建 D1 数据库
wrangler d1 create gachia-db

# 创建 R2 Bucket（图片）
wrangler r2 bucket create gachia-images

# 配置 wrangler.toml / wrangler.jsonc
```

```jsonc
// apps/web/wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gachia-db",
      "database_id": "<your-database-id>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES",
      "bucket_name": "gachia-images"
    }
  ]
}
```

#### 3.3.2 环境变量

| 变量 | 用途 | 存储位置 |
|------|------|----------|
| `GA_MEASUREMENT_ID` | Google Analytics | wrangler secrets |
| `CLERK_SECRET_KEY` | Clerk 认证密钥 | wrangler secrets |
| `CLERK_PUBLISHABLE_KEY` | Clerk 公钥 | wrangler secrets |

```bash
wrangler secret put GA_MEASUREMENT_ID
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_PUBLISHABLE_KEY
```

#### 3.3.3 数据库迁移

```bash
# 本地开发
wrangler d1 migrations apply gachia-db --local

# 生产环境
wrangler d1 migrations apply gachia-db --remote
```

迁移文件存放在 `packages/db/src/migrations/` 目录。

#### 3.3.4 自定义域名绑定

当准备绑定 `gachia.com` 时：

1. 在 Cloudflare Dashboard 添加自定义域名到 Workers
2. 配置 DNS CNAME 记录
3. SSL 证书自动由 Cloudflare 管理

### 3.4 回滚方案

| 场景 | 回滚方式 |
|------|----------|
| 前端部署失败 | `wrangler rollback` 回退到上一个版本 |
| 数据库迁移失败 | 执行 down migration |
| D1 数据损坏 | 使用 `wrangler d1 export` 的备份恢复 |
| R2 图片 404 | 保留原始图片路径作为 fallback |

### 3.5 CI/CD（建议 4B 后实施）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install --frozen-lockfile
      - run: PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build --force
      - run: npx pagefind --site apps/web/.next/static --output-path apps/web/public/pagefind
      - run: pnpm --filter @gachia/web exec opennextjs-cloudflare build
      - run: pnpm --filter @gachia/web exec opennextjs-cloudflare deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 4. 测试方案

### 4.1 测试策略总览

| 层级 | 工具 | 覆盖范围 | 阶段 |
|------|------|----------|------|
| 单元测试 | Vitest | 数据访问函数、工具函数 | 4A |
| 类型检查 | TypeScript strict | 编译时类型安全 | 4A |
| 构建测试 | `pnpm build` | 全页面 SSG 渲染 | 4A |
| E2E 测试 | Playwright | 核心用户流程 | 4B |
| API 测试 | Vitest + fetch mock | API 端点 | 4B |
| 数据库测试 | Vitest + D1 local | CRUD 操作 | 4B |

### 4.2 4A 测试计划

#### 4.2.1 构建冒烟测试（每次提交必跑）

```bash
# 确保所有页面 SSG 渲染成功
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build --force
```

**检查项**:
- [ ] 构建无 TypeScript 错误
- [ ] 构建无运行时 SSG 错误
- [ ] 所有游戏路由正确生成
- [ ] 三语言页面均生成

#### 4.2.2 数据完整性测试

```typescript
// packages/data/__tests__/data-integrity.test.ts
import { describe, it, expect } from 'vitest';
import { genshinCharacters, genshinWeapons } from '../games/genshin';
import { starrailCharacters } from '../games/starrail';
import { nteCharacters } from '../games/nte';

describe('Data Integrity', () => {
  it('all genshin characters have required fields', () => {
    genshinCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.element).toBeTruthy();
      expect(c.rarity).toBeGreaterThanOrEqual(4);
    });
  });

  it('all starrail characters have ascension materials', () => {
    starrailCharacters.forEach((c) => {
      const materials = getStarRailMaterialsForCharacter(c.id);
      expect(materials).toBeDefined();
      expect(materials!.ascensionMaterials.length).toBe(6);
    });
  });

  it('no duplicate IDs across games', () => {
    const allIds = [
      ...genshinCharacters.map((c) => `genshin_${c.id}`),
      ...starrailCharacters.map((c) => `starrail_${c.id}`),
      ...nteCharacters.map((c) => `nte_${c.id}`),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
```

#### 4.2.3 手动测试检查清单

**每次部署后验证**:

| 页面 | 检查项 |
|------|--------|
| 首页 | 三语言切换、游戏导航 |
| 角色列表 | 搜索、筛选、分页 |
| 角色详情 | 属性、技能、推荐配装 |
| 计算器 | 所有游戏 tab、材料计算、库存管理 |
| 攻略列表 | 分类筛选、攻略卡片 |
| 攻略详情 | 内容渲染、FAQ、面包屑 |
| 地图 | 区域卡片、统计数据 |
| Tier List | 分级显示、角色排序 |
| 配装 | 角色选择、武器/圣遗物匹配 |

**三语言验证**: 每个页面分别在 `/zh/`, `/en/`, `/ja/` 下检查渲染。

### 4.3 4B 测试计划

#### 4.3.1 API 单元测试

```typescript
// packages/db/__tests__/crud.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../src';

// 使用 D1 本地模拟
const mockD1 = createLocalD1();
const db = createDb(mockD1);

describe('User Favorites', () => {
  it('should add favorite', async () => {
    await db.insert(userFavorites).values({
      userId: 'test-user',
      gameId: 'genshin',
      characterId: 'hu_tao',
    });
    const favorites = await db.select().from(userFavorites);
    expect(favorites).toHaveLength(1);
  });

  it('should prevent duplicate favorites', async () => {
    // UNIQUE 约束测试
  });
});
```

#### 4.3.2 认证流程测试

```typescript
describe('Auth Flow', () => {
  it('should register with email/password', async () => { });
  it('should login and receive session', async () => { });
  it('should reject invalid credentials', async () => { });
  it('should logout and clear session', async () => { });
  it('should handle OAuth callback', async () => { });
});
```

#### 4.3.3 E2E 测试（Playwright）

```typescript
// e2e/calculator.spec.ts
import { test, expect } from '@playwright/test';

test('calculator flow', async ({ page }) => {
  await page.goto('/zh/genshin/calculator');
  // 选择角色
  await page.click('[data-testid="character-hu_tao"]');
  // 设置目标等级
  await page.selectOption('[data-testid="target-level"]', '80');
  // 验证材料列表
  await expect(page.locator('.material-row')).toHaveCount(6);
  // 测试库存管理
  await page.click('[data-testid="add-inventory"]');
  // 验证缺口计算
  await expect(page.locator('.deficit-count')).toBeVisible();
});
```

#### 4.3.4 性能测试

```bash
# Lighthouse CI
npx lhci autorun --config=lighthouserc.json

# 目标
# Performance: > 90
# Accessibility: > 85
# Best Practices: > 90
# SEO: > 90
```

---

## 5. 里程碑与排期

### 5.1 Phase 4A 排期（预估 4-5 个工作日）

| 任务 | 预估 | 前置依赖 | 交付物 |
|------|------|----------|--------|
| 4A.1 WuWa 计算器 | 1d | WuWa 材料数据 | 计算器页面 WuWa tab |
| 4A.2 Pagefind 搜索 | 0.5d | 无 | 全站搜索功能 |
| 4A.3 Google Analytics | 0.5d | GA4 账号 | 数据追踪 |
| 4A.4 shadcn/ui 初始化 | 0.5d | 无 | 组件库配置 |
| 4A.5 WuWa Tier List | 1d | 评级数据 | Tier List 页面 |
| 4A.6 性能优化 | 1d | 4A.1-4A.5 完成 | Lighthouse > 90 |

### 5.2 Phase 4B 排期（预估 10-12 个工作日）

| 任务 | 预估 | 前置依赖 | 交付物 |
|------|------|----------|--------|
| 4B.1 D1 数据库 | 2d | Cloudflare 账号配置 | DB schema + 迁移 |
| 4B.2 用户认证 | 2d | 4B.1 | 注册/登录/OAuth |
| 4B.3 收藏 & 角色箱 | 2d | 4B.2 | 收藏/角色管理 |
| 4B.4 配装分享持久化 | 1.5d | 4B.1 | 分享链接存储 |
| 4B.5 R2 图片迁移 | 1d | R2 Bucket | CDN 图片 |
| 4B.6 API Routes | 2d | 4B.1, 4B.2 | REST API |
| 集成测试 | 1.5d | 全部 | E2E 测试通过 |

### 5.3 里程碑

| 里程碑 | 完成标准 | 预计时间 |
|--------|----------|----------|
| M1: 4A 完成 | 所有 4A 功能部署上线，Lighthouse > 90 | 4A 开始后 5 个工作日 |
| M2: 4B 基础设施 | D1 + Auth + 部署 pipeline 就绪 | 4B 开始后 4 个工作日 |
| M3: 4B 完成 | 所有用户功能上线，E2E 测试通过 | 4B 开始后 12 个工作日 |
| M4: V1 发布 | 自定义域名绑定，生产监控就绪 | M3 后 2 个工作日 |

---

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| OpenNext + D1 兼容问题 | 中 | 高 | 提前做 PoC 验证，准备 fallback 到 Pages Functions |
| Pagefind 中文分词质量 | 中 | 低 | 配置自定义分词规则，必要时补充拼音索引 |
| Cloudflare Workers 限制 (10ms CPU) | 低 | 高 | 已使用 SSG，动态路由少；4B API 使用 Streaming |
| shadcn/ui + Tailwind v4 兼容 | 中 | 低 | 确认 shadcn v4 版本支持 Tailwind v4，必要时降级 |
| Clerk 免费额度超限 | 低 | 中 | 监控 MAU，准备 Better Auth 迁移方案 |
| D1 数据库性能 (SQLite) | 低 | 中 | 用户量 < 100k 无问题，超限后迁移到 Turso |
| Bundle 体积过大 | 中 | 中 | 4A.6 性能优化阶段用 bundle analyzer 检查 |
| R2 图片版权 | 低 | 高 | 仅使用官方公开素材或用户原创内容 |

---

## 附录 A: 关键版本依赖

| 依赖 | 当前版本 | 说明 |
|------|----------|------|
| Next.js | 15.x | App Router |
| React | 19.x | Server Components |
| Tailwind | v4 | CSS 框架 |
| OpenNext Cloudflare | 1.19.6 | Workers 适配 |
| Cloudflare Workers | - | 运行时 |
| Drizzle ORM | 待安装 | D1 ORM (4B) |
| Pagefind | 待安装 | 静态搜索 (4A) |
| @next/third-parties | 待安装 | GA4 集成 (4A) |

## 附录 B: 快速参考命令

```bash
# 开发
pnpm dev

# 构建
PATH="/opt/homebrew/opt/node@22/bin:$PATH" pnpm build --force

# 部署
pnpm --filter @gachia/web exec opennextjs-cloudflare build
pnpm --filter @gachia/web exec opennextjs-cloudflare deploy

# D1 操作 (4B)
wrangler d1 execute gachia-db --local < migrations/001_init.sql
wrangler d1 execute gachia-db --remote < migrations/001_init.sql

# R2 操作 (4B)
wrangler r2 object put gachia-images/characters/hu_tao.png --file ./assets/hu_tao.png
```
