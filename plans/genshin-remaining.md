# Genshin Remaining Content Implementation Plan

## Overview
Complete 3 remaining Genshin pages: Calculator (材料计算器+伤害计算器), Map (区域攻略), Guides (完整攻略百科).

## Phase 1: 养成材料计算器 (`calculator/page.tsx`)

**页面功能：**
- 选择角色 → 设置目标等级(1-90)和天赋等级(1-10) → 计算所需材料总量
- 汇总显示所有材料，按类型分组（突破石/天赋书/Boss材料/特产/怪物掉落/周本材料）
- 显示每种材料的图标(emoji/颜色编码)、名称、所需数量

**数据来源：**
- 已有 `raw-character-materials.json`（90角色 × 突破+天赋材料表）
- 已有 `raw-materials.json`（185材料，含名称/类型/稀有度）
- 已有 `raw-characters.json`（82角色，含元素/稀有度/名称）

**实现方式：**
- 客户端交互组件（`'use client'`），SSG 框架
- 角色选择器：按元素分组，点击选择
- 等级滑块/选择器：当前等级 → 目标等级
- 天赋等级选择器：3个独立天赋 1→10
- 结果汇总：遍历 `ascensionMaterials` + `talentMaterials`，累加差量

## Phase 2: 伤害计算器 (同页面，Tab 切换)

**页面功能：**
- 选择角色 + 武器 + 圣遗物 → 计算期望伤害
- 输入面板：基础攻击、攻击%、暴击率、暴击伤害、元素伤害加成、元素精通
- 计算公式：ATK × (1 + ATK%) × SkillMultiplier × (1 + DMG%) × (1 + CR% × CD%) × (1 + EM_bonus)
- 显示各技能的期望伤害

**实现方式：**
- Tab 切换：养成计算 / 伤害计算
- 纯前端计算，使用 Genshin 伤害公式
- 预填角色基础属性，用户可调整

## Phase 3: 区域攻略页面 (`map/page.tsx`)

**页面功能：**
- 按7大区域展示：蒙德/璃月/稻妻/须弥/枫丹/纳塔/层岩巨渊
- 每个区域卡片：名称、描述、探索要点列表
- 点击区域展开详细内容：特产位置、Boss分布、秘境列表、传送点、收集品

**数据来源：**
- 新建 `raw-regions.json`（7区域数据）
- 新建 `regions.ts`（类型+访问函数）

**内容结构：**
```json
{
  "id": "mondstadt",
  "name": "蒙德", "nameEn": "Mondstadt", "nameJa": "モンド",
  "description": "...", "descriptionEn": "...",
  "highlights": ["风神瞳66个", "岩神瞳0个", "..."],
  "specialties": ["dandelion-seed", "cecilia", ...],
  "bosses": ["角色突破材料Boss名", ...],
  "domains": ["秘境名", ...],
  "tips": ["探索技巧1", "探索技巧2"]
}
```

## Phase 4: 攻略百科 (`guides/page.tsx` + `guides/[slug]/page.tsx`)

**改造现有 guides 页面：**
- 当前 `guides/page.tsx` 对非NTE游戏显示 "Coming Soon"
- 改为：NTE走原有逻辑，Genshin 走新逻辑
- Genshin 攻略分类：新手入门 / 角色攻略 / 深渊攻略 / 活动攻略 / 版本更新

**数据来源：**
- 新建 `raw-guides.json`（原神攻略数据）
- 新建 `guides.ts`（类型+访问函数，仿照 NTE guides.ts）

**攻略内容：**
1. **新手入门类**（5篇）：快速上手指南、元素反应详解、圣遗物入门、树脂规划、摩拉获取
2. **角色攻略类**（自动）：每个角色已有详细数据，可生成通用攻略模板
3. **深渊攻略**（3篇）：本期深渊配队、深渊通用策略、深渊阵容推荐
4. **系统攻略**（5篇）：祈愿系统详解、武器强化指南、圣遗物刷取路线、每日委托、烹饪系统

## Phase 5: 路由注册 & 导航更新

- 确认 `packages/core/constants/index.ts` 中 calculator/map/guides 路由已注册
- 确认游戏首页链接正确
- 更新 sitemap.ts 包含新页面

## Phase 6: 构建 & 部署

- `pnpm build` 验证
- 部署到 Cloudflare Workers

---

## 文件变更清单

### 新建文件
1. `packages/data/games/genshin/raw-regions.json` — 7区域数据
2. `packages/data/games/genshin/regions.ts` — 区域类型+访问函数
3. `packages/data/games/genshin/raw-guides.json` — 原神攻略数据
4. `packages/data/games/genshin/guides.ts` — 攻略类型+访问函数
5. `apps/web/app/[lang]/[game]/calculator/page.tsx` — 计算器页面
6. `apps/web/app/[lang]/[game]/map/page.tsx` — 区域攻略页面

### 修改文件
1. `packages/data/games/genshin/index.ts` — 添加 regions/guides 导出
2. `packages/data/index.ts` — 添加 Genshin regions/guides 导出
3. `apps/web/app/[lang]/[game]/guides/page.tsx` — 添加 Genshin 攻略支持
4. `apps/web/app/[lang]/[game]/guides/[slug]/page.tsx` — 添加 Genshin 攻略详情
5. `apps/web/app/sitemap.ts` — 添加新页面 URL
