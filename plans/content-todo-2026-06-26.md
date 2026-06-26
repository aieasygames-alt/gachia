# Gachia 内容跟迹列表 — 2026-06-26

> 基于 market-update-2026-06-26.md 的市场扫描 + 情报抓取结果，给出"应该新增/更新哪些页面 + 优先级"
> 本文档专注于 4 个极高/高优先级游戏：原神 / 遗忘之海 / 绝区零 / 星铁
> 遗忘之海按用户决定暂时跳过（今晚直播后另案处理）

---

## 优先级总览

| 优先级 | 任务 | 游戏 | 工作量 | 流量预期 |
|--------|------|------|--------|--------|
| 🔴 P0 | 桑多涅角色页（占位版） | genshin | 1-2h | 极高（7/1 上线） |
| 🔴 P0 | 「月之八」版本专题页 | genshin | 2-3h | 极高 |
| 🟠 P1 | 桑多涅命座/武器/圣遗物详情补全 | genshin | 待官方公布 | — |
| 🟠 P1 | 蕾米埃尔代理人页（占位） | zzz | 1h | 中（先发优势） |
| 🟠 P1 | 希格莉德代理人页（占位） | zzz | 1h | 中（先发优势） |
| 🟡 P2 | 「月之八」新武器「超越之匙」图鉴 | genshin | 0.5h | 中（武器搜索需求） |
| 🟡 P2 | 「魔女的谕示」新反应机制页 | genshin | 1-2h | 中（攻略刚需） |
| 🟡 P2 | zzz 3.0 版本专题页（聚合维琳娜/叶瞬光/罗斯凯利法） | zzz | 2h | 中 |
| 🟢 P3 | 千冶·刃角色页扩充 | starrail | 待评估 | 低（已收录） |
| 🟢 P3 | 4.3「沉于生者的忘川」版本专题页 | starrail | 2h | 中 |
| 🟢 P3 | 「尘灵游乐园」常驻玩法图鉴 | starrail | 1h | 低 |

---

## 详细任务

### 🔴 P0-1：原神「桑多涅」角色页（占位版）

**为什么：** 7/1 上线，6 天内搜索热度爆发，是本月最大流量入口。仓库 raw-characters.json 当前最新角色是 6.6 版本（尼可/洛恩/普鲁涅），**完全没有桑多涅**。

**做什么：**

- 把 `outputs/intel/genshin-sandrone.json` 的数据合并进 `packages/data/games/genshin/raw-characters.json`
- 字段说明（已有 schema 见 `packages/data/games/genshin/types.ts`）：
  - 完整字段：id, name, nameEn, element=cryo, rarity=5, region=Snezhnaya, releaseVersion="月之八", status="upcoming", tierRank="S"
  - 留空字段（7/1 实装后补）：skills 的具体名称/数值、6 个命座、推荐武器/圣遗物
  - 临时占位：skills 描述用"基于演示推测"+ 当前已知信息；faq 3 条已经写好
- 在 `genshin/characters.ts` 的过滤逻辑里：现有 `c.status !== 'upcoming'` 会过滤掉 upcoming 角色，需要决定：
  - **方案 A（推荐）：** 桑多涅 `status: "upcoming"` 仍然进 JSON，但用户访问 `/characters/sandrone` 时显示"即将上线 7/1"占位卡片（参考 sea 的 redeem-codes 模式）
  - 方案 B：暂时把桑多涅 status 改成 "released"，让它在角色列表里出现

**估时：** 1-2h（含决定过滤策略 + 写入数据）

**验证：** `pnpm build` 通过；`/zh/genshin/characters/sandrone` 返回 200；角色列表显示"桑多涅 - 即将上线"

---

### 🔴 P0-2：原神「月之八」版本专题页

**为什么：** 7/1 上线，玩家会搜「原神 月之八」「原神 7月版本」「原神 桑多涅 版本」。需要一个聚合页承接。

**做什么：**

新建攻略类页面 `raw-guides.json` 里加一条，沿用现有 guide schema：

```json
{
  "id": "version-lunar-8-moon-eight",
  "title": "原神「月之八」版本完全攻略",
  "titleEn": "Genshin Impact 'Moon-VIII' Version Complete Guide",
  "category": "version-guide",
  "categoryZh": "版本攻略",
  "tags": ["月之八", "7月版本", "桑多涅", "千灵节"],
  "summary": "...",
  "content": "## 新角色\n- 桑多涅（5星冰法器，愚人众执行官第七席）\n## 新武器\n- 双手剑·超越之匙\n## 新系统\n- 魔女的谕示（新反应+新天赋）\n## 新衣装\n- 夏洛蒂「赫尔洛克变奏曲」\n- 茜特菈莉「星与烟帷的夜语」\n## 活动\n- 映夏！归乡？千灵节！\n- 镜中的茶宴（限时祈愿）\n...",
  "contentEn": "...",
  "faq": [
    { "q": "月之八版本什么时候上线？", "a": "2026年7月1日。" },
    { "q": "桑多涅值得抽吗？", "a": "..." }
  ]
}
```

**估时：** 2-3h（含中英双语内容编写）

**验证：** `/zh/genshin/guides/version-lunar-8-moon-eight` 返回 200；从首页可进入

---

### 🟠 P1-1：桑多涅命座/武器/圣遗物详情补全

**触发条件：** 7/1 上线后立刻可做（不需要等直播）

**做什么：**

- 7/1 当天抓BWwiki、Honey Hunter、米游社「桑多涅角色攻略」等实战数据
- 补全 `raw-characters.json` 中桑多涅记录的 6 个命座、推荐武器、推荐圣遗物
- 替换 skills 描述为实战版本
- 移除 `unknownFields` 字段（这是 outputs/intel 里临时标注，正式 JSON 不应有）

**估时：** 2-3h（数据采集 + 写入）

---

### 🟠 P1-2 & P1-3：绝区零「蕾米埃尔」+「希格莉德」代理人页（占位）

**为什么：** 3.0 版本「挽昼」三人组的两位，目前仓库 raw-characters.json 没有她们。占位页有先发优势（玩家搜名字时直接到我们站）。

**做什么：**

- 把 `outputs/intel/zzz-new-agents.json` 里的两个角色合并进 `packages/data/games/zzz/raw-characters.json`
- 字段说明（schema 见 `packages/data/games/zzz/types.ts`）：
  - 完整字段：id, name, nameEn, nameJa, faction="罗斯凯利法", status="upcoming"
  - 留空字段（待官方前瞻直播/实装）：attribute, specialty, skills 全部, mindscapeCinema, recommendedBuild
  - 已知：cvZh, cvJp, description
- 在角色列表里 status=upcoming 怎么处理，参考维琳娜现状（仓库已有的 `velina-airgid` 也是 upcoming）

**估时：** 2h（两个角色各 1h）

**验证：** `/zh/zzz/characters/remielle` 和 `/zh/zzz/characters/sigrid` 返回 200

---

### 🟡 P2-1：原神「超越之匙」双手剑武器图鉴

**做什么：**

- 在 `packages/data/games/genshin/raw-weapons.json` 加一条
- 字段：name=「超越之匙」, weaponType=Claymore, rarity=5, howToObtain="月之八版本限定祈愿"
- 武器效果待官方实装文本（unknownFields 标注）
- 评估关联角色：桑多涅的专武可能性大

**估时：** 0.5h

---

### 🟡 P2-2：原神「魔女的谕示」新反应机制页

**为什么：** 新系统，玩家会搜「魔女的谕示」「星超导」「月之八 新反应」，是攻略刚需长尾入口。

**做什么：**

- 在 `raw-guides.json` 加一条「新系统攻略」
- 内容：基于米游社 [article/76147996](https://www.miyoushe.com/ys/article/76147996) 的"魔女的谕示 新反应&新天赋说明"文章整理
- 待 7/1 实装后补实战机制

**估时：** 1-2h

---

### 🟡 P2-3：绝区零 3.0 版本专题页

**做什么：**

- 新建 guide：`zzz-version-3-0-dreamwalker`
- 聚合：维琳娜（已收录）+ 叶瞬光（已收录）+ 蕾米埃尔（待加）+ 希格莉德（待加）+ 新区域罗斯凯利法 + 主线第三季第一章
- 引用：3.0 版本内容一览 [article/76055754](https://www.miyoushe.com/zzz/article/76055754)

**估时：** 2h

---

### 🟢 P3 系列：星铁相关（暂缓）

**为什么暂缓：** 千冶·刃已收录（仓库 4.3），无迫切新增角色。版本专题和玩法图鉴可以做但优先级低于上述任务。

**P3-1 千冶·刃扩充：** 评估现有 `mortenax-blade` 记录是否完整，如有缺字段（光锥「灼尽炼狱的新骸」搭配、配队）补全
**P3-2 4.3 版本专题：** 聚合千冶·刃 + 主线「沉于生者的忘川」+ 活动跃迁时间表
**P3-3 尘灵游乐园：** 新常驻玩法图鉴，从 [article/76189671](https://www.miyoushe.com/sr/article/76189671) 整理

---

## 执行建议（推荐顺序）

**本周内（6/26-7/1）：**
1. P0-1 桑多涅角色页（占位）→ **抢 7/1 上线流量窗口**
2. P0-2 月之八版本专题页
3. P1-2/P1-3 蕾米埃尔 + 希格莉德占位页

**7/1 公测后（一周内）：**
4. P1-1 桑多涅命座/武器补全（实装数据回来后）
5. P2-1 超越之匙武器页
6. P2-2 魔女的谕示机制页
7. P2-3 zzz 3.0 专题页

**7 月中下旬：**
8. P3 系列按需推进

---

## 数据文件位置索引

| 产出 | 源数据 | 目标位置 |
|------|--------|---------|
| 桑多涅角色 | `outputs/intel/genshin-sandrone.json` | `packages/data/games/genshin/raw-characters.json` |
| 蕾米埃尔/希格莉德 | `outputs/intel/zzz-new-agents.json` | `packages/data/games/zzz/raw-characters.json` |
| 月之八版本专题 | （需新写） | `packages/data/games/genshin/raw-guides.json` |
| zzz 3.0 版本专题 | （需新写） | `packages/data/games/zzz/raw-guides.json` |
| 超越之匙武器 | （需新写） | `packages/data/games/genshin/raw-weapons.json` |
