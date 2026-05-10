# Genshin Impact (原神) 内容开发计划

> 目标：为 Gachia 平台添加完整的原神游戏内容，包括角色图鉴、武器、圣遗物、材料数据
> 范围：全部90+角色、120+武器、40+圣遗物套装、200+材料
> 图片：本地 webp 存储
> 参考：完全遵循 NTE 已有的数据模式和页面渲染模式

---

## Phase 1: 核心类型与注册表更新

### 1.1 添加 artifacts 路由到核心类型

- `packages/core/types/index.ts` — `GameRouteConfig` 添加 `artifacts?: boolean`
- `packages/core/constants/index.ts` — Genshin routes 添加 `artifacts: true`；`CATEGORY_LABELS` 添加 `artifacts` 条目
- `packages/core/schemas/index.ts` — 对应 schema 添加 `artifacts` 字段

### 1.2 创建 Genshin 专属类型

- **新建** `packages/data/games/genshin/types.ts`

关键类型：
```
GenshinCharacter {
  id, name, nameEn, nameJa?, element, weaponType, rarity(4|5),
  region, description, descriptionEn, releaseVersion,
  acquisitionMethod, cvZh?, cvJp?, cvEn?,
  skills: {
    normalAttack, elementalSkill(cooldown), elementalBurst(cost, cooldown),
    passive1, passive2, passive4?
  },
  constellations: [{ level:1-6, name, nameEn, description, descriptionEn }],
  recommendedBuild: { bestWeapon, alternativeWeapons, bestArtifactSet, mainStats, subStatPriority },
  teamComps: [{ name, members, description }],
  faq: [{ question, questionZh, answer, answerZh }],
  relatedCharacters, tierRank, tierReason, tierReasonZh
}

GenshinWeapon {
  id, name, nameEn, rarity(3|4|5), weaponType,
  baseAtk, subStat, subStatValue,
  effectName, effectNameEn, effectDescription, effectDescriptionEn,
  howToObtain, howToObtainZh, howToObtainEn, signatureCharacter?
}

GenshinMaterial {
  id, name, nameEn, type, rarity, source, sourceEn
}

GenshinArtifactSet {
  id, name, nameEn, rarity(3|4|5),
  bonus2pc, bonus2pcEn, bonus4pc, bonus4pcEn,
  bestFor: string[], characters: string[]
}

GenshinCharacterMaterials {
  characterId,
  ascensionMaterials: [{ levelRange, materials: [{id, quantity}] }],
  talentMaterials: [{ talentLevel, materials: [{id, quantity}] }]
}
```

localeStr(zh, en, locale) 辅助函数（ja → en 回退）

---

## Phase 2: 原始数据文件

### 2.1 角色数据
- **新建** `packages/data/games/genshin/raw-characters.json`
- 约90+角色，含全部 zh/en 双语字段、技能、命座、配装、配队
- 数据来源：ambr.top API（结构化JSON最优）+ honeyhunterworld（15语言交叉验证）

### 2.2 武器数据
- **新建** `packages/data/games/genshin/raw-weapons.json`
- 约120+武器（3★-5★），5种类型：单手剑/双手剑/长柄武器/弓/法器

### 2.3 圣遗物数据
- **新建** `packages/data/games/genshin/raw-artifacts.json`
- 约40+套装，含2件套/4件套效果、推荐角色

### 2.4 材料数据
- **新建** `packages/data/games/genshin/raw-materials.json`
- 约200+材料：角色突破材料、天赋书、BOSS掉落、区域特产、普通怪物掉落

### 2.5 角色材料对照表
- **新建** `packages/data/games/genshin/raw-character-materials.json`
- 每个角色的突破材料清单 + 天赋升级材料清单

---

## Phase 3: TypeScript 转换层

### 3.1 角色转换
- **新建** `packages/data/games/genshin/characters.ts`
- 导出：`genshinCharacters` + `getGenshinCharacterName/Description/Image/ById/TierReason`
- 导出：`characters: Character[]`（映射到核心类型，含 skills + constellations）

### 3.2 武器转换
- **新建** `packages/data/games/genshin/weapons.ts`
- 导出：`genshinWeapons` + `getGenshinWeaponName/ById/Effect/Source`
- 导出：`weapons: Weapon[]`

### 3.3 材料转换
- **新建** `packages/data/games/genshin/items.ts`
- 导出：`genshinMaterials` + `getGenshinMaterialName/ById`
- 导出：`items: Item[]`

### 3.4 圣遗物转换
- **新建** `packages/data/games/genshin/artifacts.ts`
- 导出：`artifactSets` + `getArtifactSetName/Desc2pc/Desc4pc`

### 3.5 额外数据
- **新建** `packages/data/games/genshin/extras.ts`
- 导出：`characterMaterials` + `getMaterialsForCharacter`

### 3.6 Tier List（空占位）
- **新建** `packages/data/games/genshin/tier-lists.ts`
- 导出：`tierLists: TierList[] = []`

### 3.7 更新 Genshin 数据索引
- **修改** `packages/data/games/genshin/index.ts`
- 从各转换文件 re-export 四个核心数组

### 3.8 更新中央数据索引
- **修改** `packages/data/index.ts`
- 添加 Genshin 相关的 import 和 re-export 块（参照 NTE 的模式）

---

## Phase 4: 页面渲染

### 4.1 角色列表页
- **修改** `apps/web/app/[lang]/[game]/characters/page.tsx`
- 添加 Genshin 分支：按5★/4★分组，使用原神元素色

### 4.2 角色详情页
- **修改** `apps/web/app/[lang]/[game]/characters/[id]/page.tsx`
- 添加 Genshin 分支：基本信息、技能、命座（新增）、推荐配装、配队、材料、FAQ
- 更新 `generateStaticParams` 包含 genshin 角色ID
- 更新 `generateMetadata` 处理 genshin

### 4.3 武器列表页
- **修改** `apps/web/app/[lang]/[game]/weapons/page.tsx`
- 添加 Genshin 分支：按5★/4★/3★分组，显示武器类型和被动效果

### 4.4 材料列表页
- **修改** `apps/web/app/[lang]/[game]/items/page.tsx`
- 添加 Genshin 分支：按类型分组（突破材料、天赋书、BOSS掉落等）

### 4.5 圣遗物页面（新路由）
- **新建** `apps/web/app/[lang]/[game]/artifacts/page.tsx`
- 参照 NTE disk-sets 页面模式：展示套装名、2件套/4件套效果、推荐角色

### 4.6 节奏榜页面
- **修改** `apps/web/app/[lang]/[game]/tier-list/page.tsx`
- 添加 Genshin 分支：使用 `tierRank` 字段分组

---

## Phase 5: 图片资源

- 下载角色图片 → 转换 webp → 存放到 `apps/web/public/images/characters/`
- 命名规则：`{id}.webp`（如 `hu-tao.webp`, `raiden-shogun.webp`）

---

## Phase 6: 验证与构建

- 运行数据校验：`pnpm --filter @gachia/data validate`
- 运行全站构建：`pnpm build`
- 检查 `localhost:3000/zh/genshin/` 各页面渲染

---

## 实施顺序

```
Phase 1 (核心类型) ──→ Phase 2 (JSON数据) ──→ Phase 3 (TS转换层) ──→ Phase 4 (页面) ──→ Phase 5 (图片) ──→ Phase 6 (验证)
                                                │
                                                └── 可并行 ──→ Phase 5 (图片下载)
```

预计涉及文件：
- 新建约 12 个文件（types.ts + 5个raw-*.json + 6个.ts转换文件 + artifacts页面）
- 修改约 7 个文件（core types/constants/schemas + data index + 4个页面文件）
