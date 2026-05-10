# 崩坏：星穹铁道 (Honkai: Star Rail) 开发计划

## 概述

将星穹铁道游戏内容从当前的空 stub 升级为完整可用的游戏模块，包含角色、光锥、材料、遗器等全部数据，以及对应的 Web 页面渲染。

## 术语映射

| HSR 术语 | 等同于原神 | 说明 |
|---|---|---|
| Path (命途) | Weapon Type | Destruction/Hunt/Erudition/Harmony/Nihility/Preservation/Abundance/Remembrance |
| Light Cone (光锥) | Weapon | 武器系统，与角色的 Path 匹配 |
| Relic (遗器) | Artifact | 分为 Cavern Relic (4件套) 和 Planar Ornament (2件套) |
| Trace (行迹) | Talent | 技能升级材料 |
| Eidolon (星魂) | Constellation | C0-C6 |
| Elements | Elements | Fire/Ice/Lightning/Wind/Physical/Quantum/Imaginary (7种) |

## 数据规模 (基于竞品站点)

- **角色**: ~86 个 (含已发布和即将推出)
- **光锥**: ~157 个 (3★/4★/5★)
- **遗器**: ~30+ 套
- **材料**: ~100+ 种

## 开发阶段

### Phase 1: 数据类型定义与数据采集

**文件**: `packages/data/games/starrail/types.ts`

定义 StarRail 专有类型：
- `StarRailCharacter` - id, name/nameEn/nameJa, element, path, rarity, description, skills, eidolons, recommendedBuild, teamComps, faq, tierRank, cvZh/cvJp/cvEn
- `StarRailLightCone` - id, name/nameEn, rarity, path, baseHp/baseAtk/baseDef, passive (name + description zh/en), howToObtain, signatureCharacter
- `StarRailMaterial` - id, name/nameEn, type, rarity, source
- `StarRailRelicSet` - id, name/nameEn, type (cavern/planar), bonus2pc/bonus4pc, bestFor[]
- `StarRailCharacterMaterials` - characterId, ascensionMaterials[], traceMaterials[]

**数据采集**: 创建 `raw-characters.json`, `raw-light-cones.json`, `raw-materials.json`, `raw-relics.json`

> 数据来源: 竞品站点 (prydwen.gg, HSR Fandom Wiki), 以中英文双语存储

### Phase 2: 数据模块实现

**文件** (在 `packages/data/games/starrail/` 下):

1. `characters.ts` - 加载 raw-characters.json，导出 `starrailCharacters`, accessor 函数，映射为 core `Character[]`
2. `weapons.ts` - 加载 raw-light-cones.json，导出 `starrailLightCones`, accessor 函数，映射为 core `Weapon[]`
3. `items.ts` - 加载 raw-materials.json，导出 `starrailMaterials`, accessor 函数，映射为 core `Item[]`
4. `relics.ts` - 加载 raw-relics.json，导出 `starrailRelicSets`, accessor 函数
5. `tier-lists.ts` - 导出空 TierList[] (后续填充)
6. `index.ts` - 重新导出所有模块

### Phase 3: 数据包集成

**文件**: `packages/data/index.ts`

- 添加 starrail 命名导出 (类似 Genshin/NTE 的模式)
- 确保 `getGameData('starrail')` 返回填充的数据

### Phase 4: 核心配置更新

**文件**: `packages/core/constants/index.ts`

- 为 starrail 启用 `artifacts` 路由 (用于遗器页面)
- 添加遗器分类标签 (zh: 遗器, en: Relics, ja: 遺物)

### Phase 5: Web 页面 - 角色系统

**文件**: `apps/web/app/[lang]/[game]/characters/page.tsx`

- 添加 `gameId === 'starrail'` 分支
- 创建 `StarRailCharactersPage` 组件 (按星级分组)
- 创建 `StarRailCharacterCard` 组件 (显示元素、命途、星级)

**文件**: `apps/web/app/[lang]/[game]/characters/[id]/page.tsx`

- 添加 starrail 分支
- 创建角色详情组件 (技能、星魂、推荐光锥、遗器搭配、配队推荐)

**图片**: `apps/web/public/images/starrail/characters/` - 角色头像

### Phase 6: Web 页面 - 其他模块

**weapons 页面**: 光锥列表，按命途分组显示

**items 页面**: 材料列表，按类型分组

**artifacts/relics 页面**: 遗器套装列表，显示 2件套/4件套效果

**tier-list 页面**: 角色强度排行 (后续填充)

**guides 页面**: 攻略内容 (后续填充)

### Phase 7: SEO 与构建验证

- 更新 `sitemap.ts` 生成 starrail 路由
- 确保 `generateStaticParams()` 正确生成所有静态页面
- 构建验证 `pnpm build`

## 执行顺序

```
Phase 1 (types + raw data) → Phase 2 (data modules) → Phase 3 (data index) → Phase 4 (core config) → Phase 5 (characters page) → Phase 6 (other pages) → Phase 7 (build verification)
```

## 注意事项

- 所有文本数据需存储中英双语 (zh/en)，日文有则补充
- 遵循现有 Genshin/NTE 的数据模式 (raw JSON + typed accessor + core mapping)
- 角色图片可从官方资源或竞品站点获取，保存为 webp 格式
- HSR 的 Path 相当于角色职业分类，也决定可用光锥类型
- 遗器分两类: 洞窟遗器 (Cavern, 4件套) + 位面饰品 (Planar, 2件套)
