# 内容升级计划 — Gachia 游戏数据更新（2026年6月）

## 背景

当前 Gachia 的游戏数据严重落后于各游戏最新版本：

| 游戏 | Gachia版本 | 最新版本 | 角色差距 | 优先级 |
|------|-----------|---------|---------|--------|
| 原神 | 5.3 | 6.6 | 82→116 (-34) | P1 |
| 崩铁 | 3.2 | 4.3 | 50→86 (-36) | P1 |
| 鸣潮 | 1.2 | 3.3 | 22→48 (-26) | P0（差距最大） |
| NTE | 1.0 | 1.1 | 41→19（需清理） | P2 |
| ZZZ | ~1.x | 2.8 | 30→52 (-22) | P1 |
| 归环 | - | 未知 | 12 | P3 |
| 无限大 | - | 未发布 | 10 | P3 |

## Phase 1 — 文案与元数据更新（快速、低成本）

### 1.1 更新游戏首页描述（GAME_DESCRIPTIONS + GAME_ABOUT）
- 反映最新版本号、新区域、新系统
- 文件: `apps/web/app/[lang]/[game]/page.tsx`
- 涉及: 7 游戏 × 3 语言 = 21 段文案

### 1.2 更新根首页统计数据
- 角色数/武器数/攻略数对齐实际数据
- 文件: `apps/web/messages/{zh,en,ja}.json`

### 1.3 更新精选角色列表
- 移除过气角色，加入新强势角色
- 文件: `apps/web/app/[lang]/[game]/page.tsx` (FEATURED_CHARS)
- 文件: `apps/web/app/[lang]/page.tsx` (FEATURED)

### 1.4 更新核心常量（新增元素/命途等）
- 原神: 新增 Lunar 相关元素（如适用）
- 崩铁: 新增 Elation（愉悦）命途
- 鸣潮: 确认元素列表是否完整
- ZZZ: 新增 Rupture（破裂）职业、新属性
- 文件: `packages/core/constants/index.ts`

## Phase 2 — 角色数据补全（核心工作量）

### 2.1 鸣潮（P0 — 差距最大 22→48）
- 新增 ~26 角色（v1.3 ~ v3.3）
- 新增对应武器
- 更新声骸/sonata 套装
- 新增区域数据
- 文件: `packages/data/games/wuwa/raw-characters.json`, `raw-weapons.json`

### 2.2 原神（P1 — 82→116）
- 新增 ~34 角色（v5.4 ~ v6.6）
- 新增对应武器
- 新增圣遗物套装
- 新增 Nod-Krai 区域
- 文件: `packages/data/games/genshin/raw-characters.json`, `raw-weapons.json`

### 2.3 崩铁（P1 — 50→86）
- 新增 ~36 角色（v3.3 ~ v4.3）
- 新增光锥
- 新增遗器套装
- 新增 Planarcadia 区域
- 文件: `packages/data/games/starrail/raw-characters.json`, `raw-light-cones.json`

### 2.4 ZZZ（P1 — 30→52）
- 新增 ~22 角色（v1.4 ~ v2.8）
- 新增音擎
- 新增驱动盘
- 文件: `packages/data/games/zzz/raw-characters.json`, `raw-weapons.json`

### 2.5 NTE（P2 — 清理对齐）
- 标记未实装角色为 upcoming
- 确认已实装角色数据准确
- 文件: `packages/data/games/nte/raw-characters.json`

## Phase 3 — 攻略内容更新

### 3.1 各游戏新增版本攻略
- 鸣潮: 3.x 版本新系统攻略（Tune Break、Motorbike 等）
- 原神: 6.x 版本攻略（Nod-Krai、Lunar 反应等）
- 崩铁: 4.x 版本攻略（Planarcadia、Elation 命途等）
- ZZZ: 2.x 版本攻略（Rupture 职业等）

### 3.2 更新现有攻略内容
- 反映最新版本数值和机制变化

## Phase 4 — 测试与验证

### 4.1 数据完整性测试
- 运行 Vitest 测试确保新数据通过 Zod 校验
- 验证角色 ID 唯一性

### 4.2 构建验证
- `pnpm build` 确保 SSG 成功
- 检查新增页面数量

### 4.3 SEO 验证
- 确认新角色页有正确 JSON-LD
- 确认 sitemap 覆盖新角色
- 提交 IndexNow

---

## 执行顺序建议

1. **Phase 1.1-1.4**: 文案和常量更新（~1小时）
2. **Phase 2.1**: 鸣潮角色数据（差距最大，优先补全）
3. **Phase 2.2**: 原神角色数据
4. **Phase 2.3**: 崩铁角色数据
5. **Phase 2.4**: ZZZ 角色数据
6. **Phase 2.5**: NTE 数据清理
7. **Phase 4**: 测试验证
8. **Phase 3**: 攻略更新（后续迭代）

> 注意: Phase 2 的角色数据需要从竞品站（honeyhunter、ambr、prydwen、game8）或官方 API 获取。
> 每个角色的 JSON 结构需要包含: id, name/nameEn/nameJa, element, weaponType/path, rarity, description/descriptionEn, image 等。
> 具体字段参考各游戏 `types.ts` 中的接口定义。
