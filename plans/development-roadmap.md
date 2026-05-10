# Gachia 开发路线图

> 基于「定位分析」文档建议 + 当前项目现状，按优先级排列

## 当前状态总结

### 已完成 (P0)
- [x] 统一设计系统（Design Tokens、游戏主题换肤）
- [x] 统一数据模型（GameModule 注册表、BaseCharacter + 游戏扩展字段）
- [x] 统一角色模板（4 游戏共用角色详情页模板）
- [x] 核心页面：角色、武器、材料、Tier List、攻略
- [x] SEO 基础：sitemap、robots.txt、metadata、多语言
- [x] GA4 + GSC 接入
- [x] 4 游戏注册：Genshin / Star Rail / WuWa / NTE
- [x] Artifacts / Relics 详情页（Phase 1.1）
- [x] Calculator 多游戏扩展 + Material Planner（Phase 1.2）
- [x] NTE 剩余功能（disk-sets、redeem-codes、gacha）（Phase 1.3）
- [x] Build Recommender 配装推荐器（Phase 2.1）
- [x] Compare 角色对比页（Phase 3.1）
- [x] Team Builder 配队模拟器（Phase 2.3）
- [x] 角色详情页增强：JSON-LD Schema、面包屑导航、内链系统（Phase 3.2）
- [x] Tier List 增强：元素/武器/稀有度筛选、分布图可视化（Phase 3.3）

### 待开发

---

## Phase 1：补齐核心功能（1-2 周）

> 目标：把已有的数据变成可用页面，消灭 "Coming Soon"

### 1.1 Artifacts / 圣遗物详情页
- **范围**：Genshin 圣遗物、Star Rail 遗器
- **数据**：`packages/data/games/genshin/artifacts.ts` + `packages/data/games/starrail/relics.ts` 已有数据
- **页面**：`apps/web/app/[lang]/[game]/artifacts/page.tsx`（当前是 Coming Soon）
- **内容**：圣遗物套装列表 → 套装效果（2件/4件） → 推荐角色 → 获取途径
- **SEO**：`{圣遗物名} - {游戏} Wiki | Gachia`

### 1.2 Calculator 扩展到多游戏
- **现状**：仅 Genshin 有升级材料计算器 + 伤害计算器
- **目标**：Star Rail、WuWa 也接入升级材料计算器
- **方式**：每个游戏的 `GameModule` 注册 calculator 配方（材料 + 等级区间），复用同一套计算逻辑
- **数据**：需要补充 Star Rail / WuWa 的材料升级表数据

### 1.3 NTE 剩余页面
- **Disk Sets**（磁盘套装）：`packages/data/games/nte/` 数据已有
- **Redeem Codes**（兑换码）：静态页面 + 手动更新
- **Gacha**（抽卡模拟器）：纯前端概率模拟，无后端依赖

---

## Phase 2：核心壁垒 — Build 系统（2-3 周）

> 定位分析：Build + Calculator 系统是最大壁垒，Wiki 能被 AI 替代，但 Build 系统不能

### 2.1 Build Simulator（Build 模拟器）
- **路由**：`/[lang]/[game]/build`
- **功能**：
  - 选择角色 → 选择武器 → 选择圣遗物/遗器套装 → 选择主/副词条
  - 实时计算最终面板属性（ATK、HP、CRIT Rate、CRIT DMG 等）
  - 展示 DPS 估算
- **状态管理**：Zustand store 存储 build 配置
- **URL 分享**：build 配置编码到 URL（base64 或压缩参数），可分享
- **优先做**：Genshin（数据最全） → Star Rail → 其他

### 2.2 Material Planner（材料规划器）
- **路由**：`/[lang]/[game]/planner` 或集成到 calculator
- **功能**：
  - 选择多个角色 + 目标等级
  - 汇总所有需要的材料
  - 显示缺口（已有 vs 需要）
- **用户状态**：LocalStorage 存储用户已有材料
- **SEO 价值**：极高（用户会反复访问）

### 2.3 Team Builder（配队模拟器）
- **路由**：`/[lang]/[game]/teams`
- **功能**：
  - 拖拽角色到队伍槽位（4 人队）
  - 显示队伍元素共鸣 / 协同效果
  - 推荐配队（基于现有 tier-list 数据）
- **分享**：URL 编码配队，可分享链接

---

## Phase 3：SEO 增长 — Compare + 增强（2-3 周）

> 定位分析：Compare 页面是高 SEO 价值页面，容易拉流量

### 3.1 Compare 对比页
- **路由**：`/[lang]/[game]/compare`
- **功能**：
  - 选择两个角色 → 并排对比面板数据
  - 技能对比、Build 对比、适用场景对比
- **页面模板**：
  ```
  [角色A 头像 + 属性]  vs  [角色B 头像 + 属性]
  [技能对比表格]
  [推荐 Build 对比]
  [配队适配对比]
  ```
- **SEO**：`{角色A} vs {角色B} - 谁更强？| Gachia`（高搜索量关键词）

### 3.2 角色详情页增强
- **添加结构化数据**（JSON-LD Schema Markup）：
  - `VideoGame` schema（角色数据）
  - `HowTo` schema（Build 指南）
  - `FAQPage` schema（常见问题）
- **添加面包屑导航**（已有组件但未在所有页面使用）
- **添加内链系统**：角色 → 推荐武器 → 推荐圣遗物 → 相关角色

### 3.3 Tier List 增强
- **添加数据维度**：使用率、出场率（需要数据源）
- **添加筛选**：按元素、武器类型、定位筛选
- **添加可视化**：图表展示角色强度趋势

---

## Phase 4：平台化（1-2 个月）

> 定位分析：P3 阶段，社区化和平台化

### 4.1 用户系统
- 账号注册 / 登录（OAuth：Google、Discord）
- 收藏角色 / 保存 Build
- 个人主页

### 4.2 Build 分享社区
- 用户创建 Build → 发布
- 点赞 / 评论
- Build 排行榜（热门 Build）

### 4.3 后端架构升级
- 数据库：从 JSON 迁移到 Turso / D1
- API Routes：Next.js API Routes + 数据校验
- 图片：迁移到 Cloudflare R2

---

## 开发优先级总览

| 优先级 | 功能 | 预计周期 | 核心价值 |
|--------|------|---------|---------|
| **Phase 1.1** | Artifacts 详情页 | 2-3 天 | 消灭 Coming Soon，补齐数据展示 |
| **Phase 1.2** | Calculator 多游戏 | 3-5 天 | 工具覆盖面提升 |
| **Phase 1.3** | NTE 剩余页面 | 2-3 天 | NTE 玩家留存 |
| **Phase 2.1** | Build Simulator | 1-2 周 | **核心壁垒** |
| **Phase 2.2** | Material Planner | 3-5 天 | **SEO 神器** |
| **Phase 2.3** | Team Builder | 1 周 | 社区化基础 |
| **Phase 3.1** | Compare 对比页 | 3-5 天 | **高 SEO 价值** |
| **Phase 3.2** | 角色页增强 | 3-5 天 | 搜索排名提升 |
| **Phase 3.3** | Tier List 增强 | 3-5 天 | 数据深度 |

---

## 技术注意事项

1. **Build 系统状态管理**：用 Zustand，build 配置存 URL + LocalStorage
2. **计算逻辑放 packages/core**：通用计算公式（DPS、属性加成）抽象为共享模块
3. **所有新页面必须有**：metadata、hreflang、breadcrumbs、JSON-LD
4. **组件复用**：StatTable、MaterialList、CharacterCard 等组件需从现有页面抽离到 `components/wiki/`
