# 遗忘之海 (Sea of Remnants) — 内容收集

> 资料来源：官网 sea.163.com / Steam Store / Bilibili Wiki (wiki.biligame.com/sea)
> 数据版本：三测（破晓号测试 2026.05.28-06.19）
> 公测前瞻：2026.06.26 | 公测定档：2026年7月

---

## 1. 游戏基础信息

| 字段 | 值 |
|---|---|
| GameId | `sea` |
| 中文名 | 遗忘之海 |
| 英文名 | Sea of Remnants |
| 日文名 | シー・オブ・レムナンツ |
| 开发商 | Joker Studio |
| 发行商 | NetEase Games |
| 类型 | 海洋冒险开放世界 RPG |
| 战斗模式 | 陆地回合制 + 海战即时 |
| 平台 | PC (Steam) / Android / iOS / PS5 / Xbox Series X/S |
| 评级 | 16+ |
| 首测 | 2025.06.27 (漂流瓶号测试) |
| 二测 | 2026.02.05-02.12 (流浪号测试) |
| 三测 | 2026.05.28-06.19 (破晓号测试, 删档付费) |
| 获版号 | 2026.04.28 |
| 公测 | 2026年7月 |
| 官网 | https://sea.163.com |
| Steam | https://store.steampowered.com/app/3633680 |
| B站 | https://space.bilibili.com/3546811782400683 |
| BWiki | https://wiki.biligame.com/sea |

---

## 2. 游戏系统

### 2.1 属性系统（D&D 风格 6 属性）

> 注意：游戏**无传统元素系统**（无火/水/雷等），角色使用 6 大基础属性。

| 属性 ID | 中文 | 英文 | 说明 |
|---|---|---|---|
| str | 力量 | Strength | 物理伤害主属性 |
| agi | 敏捷 | Agility | 速度/暴击相关 |
| con | 体质 | Constitution | 生存/防御相关 |
| int | 智力 | Intelligence | 技能伤害主属性 |
| per | 感知 | Perception | 命中/辅助相关 |
| cha | 魅力 | Charisma | 控制/治疗相关 |

### 2.2 稀有度系统

| 稀有度 | 中文 | 说明 | 角色数 |
|---|---|---|---|
| 5 | 黑券 (Black Ticket) | 更稀有，官方声明与紫券**战力平等** | 8 |
| 4 | 紫券 (Purple Ticket) | 标准稀有度 | 10 |

### 2.3 角色定位

| 定位 ID | 中文 | 英文 |
|---|---|---|
| mainDps | 主攻 | Main DPS |
| subDps | 协攻 | Sub DPS |
| support | 辅助 | Support |
| survival | 生存 | Survival |

### 2.4 船队（阵营/Fleet）

| 船队 ID | 中文 | 英文 | 风格 |
|---|---|---|---|
| drift-bottle | 漂流瓶号 | Drift Bottle | 自由航海者，不属于任何组织 |
| wanderer | 流浪号 | Wanderer | 无拘无束的流浪者 |
| dawnbreaker | 破晓者 | Dawnbreaker | 前王国舰队，征服远洋 |
| black-baron | 黑男爵 | Black Baron | 神秘家族，优雅执法者 |
| ramble-band | 蓝波乐队 | Ramble Band | 摇滚明星四人组 |

### 2.5 战斗系统

- **陆地战斗**：回合制策略，能量系统（招牌技消耗能量）
- **海战**：实时动作
- **核心机制**：
  - 强化骰 (Enhanced Dice)：影响技能效果倍率
  - 加料 (Bonus)：随机倍率加成，最高3倍
  - 层数 Buff/Debuff 系统（如 [激昂]、[鬼点子]、[玫瑰印记]、[暗影] 等）
  - 璀璨闪光：角色的特殊被动效果

### 2.6 招募系统（抽卡）

**货币类型：**

| 货币 | 中文 | 用途 |
|---|---|---|
| feather-ticket | 羽毛票据 | 基础招募 |
| exclusive-feather-ticket | 专属羽毛票据 | 指定角色招募 |
| silver-coin | "来一杯"银币 | 新手/公共吧台招募 |
| gold-coin | "来一杯"金币 | 私人吧台招募（高稀有度） |
| rosestone | 蔷薇石 | 付费高级货币 |
| moonstone | 月光石 | 付费时装货币 |

**保底机制：**

| 池子 | 保底 |
|---|---|
| 新手池 (Memory Reunion) | 40抽保底黑券角色 |
| 限定池 | 80抽保底 |
| 遗忘之旅 (Roguelike) | 每周运行，3次保底 |

---

## 3. 角色数据

### 3.1 旅人 (Traveler)

```json
{
  "id": "traveler",
  "number": "0001",
  "name": "？？？",
  "nickname": "旅人",
  "nameEn": "Traveler",
  "nameJa": "旅人",
  "attribute": "str",
  "attributeZh": "力量",
  "role": "mainDps",
  "roleZh": "主攻",
  "rarity": 4,
  "rarityZh": "紫券",
  "fleet": "drift-bottle",
  "fleetZh": "漂流瓶号",
  "faction": "奥托皮亚",
  "position": "船长",
  "favoriteFood": "猪肉烤串",
  "description": "你也不知道自己的来历，但你现在有了一艘船，请尽情的扬帆起航！",
  "descriptionEn": "You don't know your own past, but now you have a ship. Set sail to your heart's content!",
  "speed": 101,
  "stats": {
    "str": { "base": 15, "max": 50, "breakthrough": 7 },
    "agi": { "base": 11, "max": 36, "breakthrough": 5 },
    "con": { "base": 9, "max": 29, "breakthrough": 4 },
    "int": { "base": 7, "max": 22, "breakthrough": 3 },
    "per": { "base": 10, "max": 35, "breakthrough": 5 },
    "cha": { "base": 8, "max": 28, "breakthrough": 4 }
  },
  "combatStats": {
    "atk": { "base": 44, "max": 90 },
    "def": { "base": 22, "max": 30 },
    "hp": { "base": 944, "max": 1290 }
  },
  "breakthroughBonus": {
    "type": "damageBoost",
    "value": 10.5,
    "hpBonus": 43,
    "defBonus": 1,
    "atkBonus": 3,
    "damageBonus": 0.35
  },
  "skills": {
    "passive": {
      "name": "时机已到",
      "nameEn": "Time Has Come",
      "description": "[激昂]达到9层时，立即消耗所有[激昂]发动追击，对目标造成攻击力150%/285%伤害，并获得1层[战意]。造成伤害时，获得1层[激昂]。一次攻击最多获得3层[激昂]。",
      "scaling": [
        { "name": "追击伤害", "values": ["150%", "165%", "180%", "195%", "210%", "225%", "240%", "255%", "270%", "285%"] }
      ]
    },
    "signature": {
      "name": "烈焰斩",
      "nameEn": "Flame Slash",
      "cost": "15能量",
      "description": "对敌方单体造成攻击力650%/1235%的伤害。",
      "scaling": [
        { "name": "单体伤害", "values": ["650%", "715%", "780%", "845%", "910%", "975%", "1040%", "1105%", "1170%", "1235%"] }
      ]
    },
    "personal": {
      "name": "烈火雄心",
      "nameEn": "Fierce Heart",
      "cooldown": "2回合",
      "description": "获得4层[激昂]和2层[战意]。攻击力提升15%/33%，持续2回合。不结束回合。",
      "scaling": [
        { "name": "攻击力提升", "values": ["15%", "17%", "19%", "21%", "23%", "25%", "27%", "29%", "31%", "33%"] }
      ]
    },
    "shiningSpark": "使用技能后，获得3层[激昂]，且令追击伤害提升9级，持续2回合。"
  },
  "combatTraits": [
    { "name": "更快的刀", "description": "使用个人技后，自身下次行动伤害提升10%", "scaling": ["10%"] },
    { "name": "更狂的风", "description": "[激昂]伤害提升10%", "scaling": ["10%"] },
    { "name": "更烈的火", "description": "招牌技伤害提升10%", "scaling": ["10%"] }
  ],
  "crewTraits": [
    { "name": "强运的祝福", "description": "每使用1个强化骰，获得1层[激昂]。" },
    { "name": "千锤的技艺", "description": "触发[时机已到]的追击效果时，恢复1点能量。" }
  ],
  "breakthroughLevels": [
    { "level": 2, "effect": "旅人造成的伤害提升4%" },
    { "level": 3, "effect": "旅人造成的伤害提升4%" },
    { "level": 4, "effect": "旅人造成的伤害提升4%" },
    { "level": 5, "effect": "旅人造成的伤害提升4%" },
    { "level": 6, "effect": "个人技获得的[激昂]提升至7层" }
  ],
  "secrets": [
    { "name": "初来乍到", "effect": "战斗开始时，获得9层[激昂]", "lore": "失忆的外乡人在奥托皮亚白手起家。" },
    { "name": "乐善好施", "effect": "触发被动追击时，个人技冷却时间减少1回合", "lore": "旅人化身万能帮手。" },
    { "name": "强运当头", "effect": "招牌技具有60%的[溅射]", "lore": "旅人在牌桌豪取十一连胜！" },
    { "name": "力压群雄", "effect": "[战意]提升80%的[附加伤害]", "lore": "旅人擂台夺冠尽显武力巅峰！" },
    { "name": "爱猫大使", "effect": "触发被动追击时，获得1层[战意]", "lore": "猫猫认证！旅人获封最受猫咪喜爱之人。" },
    { "name": "完美博弈", "effect": "每触发被动追击4次，便使用1次招牌技", "lore": "以德报怨！旅人勇救落水社评家。" }
  ]
}
```

### 3.2 艾丝 (Ais)

```json
{
  "id": "ais",
  "number": "0002",
  "name": "艾丝",
  "nickname": "艾丝",
  "nameEn": "Ais",
  "nameJa": "アイス",
  "attribute": "int",
  "attributeZh": "智力",
  "role": "subDps,support",
  "roleZh": "协攻、辅助",
  "rarity": 4,
  "rarityZh": "紫券",
  "fleet": "drift-bottle",
  "fleetZh": "漂流瓶号",
  "faction": "奥托皮亚",
  "position": "冒险家",
  "favoriteFood": "浆果串",
  "description": "奥托皮亚的冒险家，热爱航海与寻宝的欢脱少女。",
  "descriptionEn": "An adventurer of Orbtopia, a cheerful girl who loves sailing and treasure hunting.",
  "speed": 98,
  "stats": {
    "str": { "base": 9, "max": 34, "breakthrough": 5 },
    "agi": { "base": 12, "max": 42, "breakthrough": 6 },
    "con": { "base": 9, "max": 29, "breakthrough": 4 },
    "int": { "base": 15, "max": 55, "breakthrough": 8 },
    "per": { "base": 6, "max": 21, "breakthrough": 3 },
    "cha": { "base": 9, "max": 29, "breakthrough": 4 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 200 },
    "def": { "base": 10, "max": 67 },
    "hp": { "base": 350, "max": 3554 }
  },
  "skills": {
    "passive": {
      "name": "欢乐永不停歇",
      "nameEn": "Fun Never Stops",
      "description": "对敌方单位造成伤害后，有50%/95%概率令其获得1层[鬼点子]。每触发1倍[加料]，有100%基础概率令其额外获得1层[鬼点子]，持续3回合。",
      "scaling": [
        { "name": "基础概率", "values": ["50%", "55%", "60%", "65%", "70%", "75%", "80%", "85%", "90%", "95%"] }
      ]
    },
    "signature": {
      "name": "欢迎光临游乐园",
      "nameEn": "Welcome to the Amusement Park",
      "cost": "13能量",
      "description": "对敌方全体造成攻击力290%/551%的伤害，自身获得[灵感大爆发]，持续2回合。[灵感大爆发]：为目标施加[鬼点子]时，层数翻倍。",
      "scaling": [
        { "name": "全体伤害", "values": ["290%", "319%", "348%", "377%", "406%", "435%", "464%", "493%", "522%", "551%"] }
      ]
    },
    "personal": {
      "name": "最最可爱的玩偶",
      "nameEn": "Cutest Doll Ever",
      "cooldown": "2回合",
      "description": "对敌方全体造成攻击力185%/352%的伤害，并有100%基础概率为其施加2层[鬼点子]，持续3回合。",
      "scaling": [
        { "name": "全体伤害", "values": ["185%", "204%", "222%", "241%", "259%", "278%", "296%", "315%", "333%", "352%"] }
      ]
    },
    "shiningSpark": "技能释放后，本次、下次攻击为目标施加6层[鬼点子]。"
  },
  "combatTraits": [
    { "name": "喧闹法则", "description": "拥有[灵感大爆发]时，持续伤害提升5%/17%", "scaling": ["5%", "8%", "11%", "14%", "17%"] },
    { "name": "整蛊小窍门", "description": "攻击力提升4%/12%", "scaling": ["4%", "6%", "8%", "10%", "12%"] },
    { "name": "惊喜节目", "description": "招牌技伤害提升7%/27%", "scaling": ["7%", "12%", "17%", "22%", "27%"] }
  ],
  "crewTraits": [
    { "name": "小吵闹乐园", "description": "造成伤害后，若自身拥有[灵感大爆发]，则有100%概率令目标获得2层[鬼点子]。" },
    { "name": "再玩一次", "description": "使用招牌技后，行动提前15%。" }
  ],
  "breakthroughLevels": [
    { "level": 2, "effect": "艾丝造成的持续伤害提升5%" },
    { "level": 3, "effect": "艾丝造成的持续伤害提升5%" },
    { "level": 4, "effect": "艾丝造成的持续伤害提升5%" },
    { "level": 5, "effect": "艾丝造成的持续伤害提升5%" },
    { "level": 6, "effect": "战斗开始时，恢复50%的能量" }
  ],
  "secrets": [
    { "name": "筑梦合伙人", "effect": "[鬼点子]叠加上限提升为15层，且当其叠加至10层及以上时，结算伤害提升50%" },
    { "name": "直觉领航员", "effect": "使用个人技时，若自身拥有[灵感大爆发]，则[灵感大爆发]持续时间延长1回合" },
    { "name": "秘密调查", "effect": "[鬼点子]结算时，有100%固定概率获得1层[灵感]" },
    { "name": "强制众筹", "effect": "使用招牌技后，个人技立即完成冷却" },
    { "name": "奇迹鲇鱼号", "effect": "使用个人技后，下次攻击必定触发3倍[加料]，且不消耗[灵感]" },
    { "name": "无人问津", "effect": "[灵感大爆发]触发3次后，令全体敌方单位层数最低的1个持续伤害增至满层" }
  ]
}
```

### 3.3 小斧头 (Little Axe)

```json
{
  "id": "little-axe",
  "number": "0003",
  "name": "尤利乌斯",
  "nickname": "小斧头",
  "nameEn": "Little Axe",
  "nameJa": "リトルアックス",
  "attribute": "agi",
  "attributeZh": "敏捷",
  "role": "mainDps",
  "roleZh": "主攻",
  "rarity": 5,
  "rarityZh": "黑券",
  "fleet": "black-baron",
  "fleetZh": "黑男爵",
  "faction": "迈克尔",
  "position": "二副",
  "favoriteFood": "半熟牛排",
  "description": "黑男爵中温和优雅的少年，但另一面则藏着凶狠。",
  "descriptionEn": "A gentle and elegant boy in the Black Baron, but his other side hides ferocity.",
  "speed": 104,
  "stats": {
    "str": { "base": 13, "max": 43, "breakthrough": 6 },
    "agi": { "base": 16, "max": 56, "breakthrough": 8 },
    "con": { "base": 11, "max": 36, "breakthrough": 5 },
    "int": { "base": 8, "max": 28, "breakthrough": 4 },
    "per": { "base": 15, "max": 50, "breakthrough": 7 },
    "cha": { "base": 11, "max": 36, "breakthrough": 5 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 222 },
    "def": { "base": 10, "max": 74 },
    "hp": { "base": 350, "max": 4016 }
  },
  "skills": {
    "passive": {
      "name": "玫瑰追猎",
      "nameEn": "Rose Hunt",
      "description": "攻击拥有[玫瑰印记]的敌方单位时，立即发动[玫瑰循迹]追击，造成攻击力200%/380%伤害。拥有[玫瑰印记]的敌方单位力竭时，立即发动[玫瑰循迹]追击攻击力最高的敌方单位。使用个人技时，为其施加1层[玫瑰印记]。",
      "scaling": [
        { "name": "单体伤害", "values": ["200%", "220%", "240%", "260%", "280%", "300%", "320%", "340%", "360%", "380%"] }
      ]
    },
    "signature": {
      "name": "审判夜",
      "nameEn": "Judgment Night",
      "cost": "15能量",
      "description": "对敌方单体造成攻击力700%/1330%的伤害。"
    },
    "personal": {
      "name": "优雅处决",
      "nameEn": "Elegant Execution",
      "cooldown": "2回合",
      "description": "对敌方单体造成攻击力250%/475%伤害，并施加1层[玫瑰印记]。"
    },
    "shiningSpark": "触发[玫瑰循迹]追击时，额外对目标施加1层[玫瑰印记]。"
  }
}
```

### 3.4 茉莉 (Molly)

```json
{
  "id": "molly",
  "number": "0004",
  "name": "茉莉",
  "nickname": "妄想裁缝师",
  "nameEn": "Molly",
  "nameJa": "モリー",
  "attribute": "agi",
  "attributeZh": "敏捷",
  "role": "mainDps",
  "roleZh": "主攻",
  "rarity": 5,
  "rarityZh": "黑券",
  "fleet": "ramble-band",
  "fleetZh": "蓝波乐队",
  "faction": "奥托皮亚",
  "position": "贝斯手",
  "favoriteFood": "烤海星",
  "description": "蓝波乐队最安静的乐手，也是于梦中寻找灵感的裁缝师。",
  "descriptionEn": "The quietest musician of the Ramble Band, a tailor seeking inspiration in dreams.",
  "speed": 107,
  "stats": {
    "str": { "base": 12, "max": 42, "breakthrough": 6 },
    "agi": { "base": 20, "max": 70, "breakthrough": 10 },
    "con": { "base": 10, "max": 35, "breakthrough": 5 },
    "int": { "base": 8, "max": 28, "breakthrough": 4 },
    "per": { "base": 17, "max": 57, "breakthrough": 8 },
    "cha": { "base": 12, "max": 42, "breakthrough": 6 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 250 },
    "def": { "base": 10, "max": 73 },
    "hp": { "base": 350, "max": 3950 }
  },
  "skills": {
    "passive": {
      "name": "梦游症",
      "nameEn": "Sleepwalking",
      "description": "另一我方单位攻击时，茉莉有30%概率[协战]，对其主目标造成攻击力150%/285%的伤害，场上每有1层[暗影]，则令[协战]额外提升攻击力2%/2.9%的伤害。若此次[协战]暴击，则令目标额外获得1层[暗影]。",
      "scaling": [
        { "name": "单体伤害", "values": ["150%", "165%", "180%", "195%", "210%", "225%", "240%", "255%", "270%", "285%"] },
        { "name": "伤害提升", "values": ["2%", "2.1%", "2.2%", "2.3%", "2.4%", "2.5%", "2.6%", "2.7%", "2.8%", "2.9%"] }
      ]
    },
    "signature": {
      "name": "梦的尽头",
      "nameEn": "End of the Dream",
      "cost": "15能量",
      "description": "对敌方全体造成攻击力350%/665%的伤害，并为所有敌方单位施加3层[暗影]。"
    },
    "personal": {
      "name": "缝合噩梦",
      "nameEn": "Stitch Nightmare",
      "cooldown": "2回合",
      "description": "对敌方单体造成攻击力200%/380%伤害，并为目标施加3层[暗影]。不结束回合。"
    }
  }
}
```

### 3.5 索西亚 (Soscia)

```json
{
  "id": "soscia",
  "number": "0504",
  "name": "索西亚",
  "nickname": "发明家",
  "nameEn": "Soscia",
  "attribute": "int",
  "attributeZh": "智力",
  "role": "mainDps",
  "roleZh": "主攻",
  "rarity": 4,
  "rarityZh": "紫券",
  "fleet": "dawnbreaker",
  "fleetZh": "破晓者",
  "faction": "瑞文斯克",
  "position": "机械师",
  "favoriteFood": "黑咖啡",
  "description": "破晓者的机械师，既是天才，也是疯子。",
  "speed": 95,
  "stats": {
    "str": { "base": 8, "max": 28, "breakthrough": 4 },
    "agi": { "base": 11, "max": 36, "breakthrough": 5 },
    "con": { "base": 10, "max": 35, "breakthrough": 5 },
    "int": { "base": 15, "max": 50, "breakthrough": 7 },
    "per": { "base": 8, "max": 28, "breakthrough": 4 },
    "cha": { "base": 8, "max": 28, "breakthrough": 4 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 189 },
    "def": { "base": 10, "max": 62 },
    "hp": { "base": 350, "max": 3950 }
  },
  "skills": {
    "passive": {
      "name": "机件磨合",
      "description": "每消耗7层[灵感]，则获得[超载]。[超载]：使用强化骰时，技能伤害提升10%/19%，若技能未触发3倍[加料]，则消耗[超载]使[加料]倍数增加1倍，并陷入[过热]状态，持续2回合。",
      "scaling": [
        { "name": "伤害提升", "values": ["10%", "11%", "12%", "13%", "14%", "15%", "16%", "17%", "18%", "19%"] }
      ]
    },
    "signature": {
      "name": ""砰"",
      "nameEn": "BOOM",
      "cost": "15能量",
      "description": "对敌方单体造成攻击力650%/1235%的伤害。"
    },
    "personal": {
      "name": "灵感来了",
      "cooldown": "2回合",
      "description": "获得5层[灵感]。不结束回合。"
    }
  }
}
```

### 3.6 预兆之眼 (Omen Eye)

```json
{
  "id": "omen-eye",
  "number": "0506",
  "name": "英诺森",
  "nickname": "预兆之眼",
  "nameEn": "Omen Eye",
  "attribute": "cha",
  "attributeZh": "魅力",
  "role": "survival,support",
  "roleZh": "生存、辅助",
  "rarity": 4,
  "rarityZh": "紫券",
  "fleet": "dawnbreaker",
  "fleetZh": "破晓者",
  "faction": "瑞文斯克",
  "position": "瞭望员",
  "favoriteFood": "糖果",
  "description": "破晓者的瞭望员，从圣者学院出逃的"神子"。",
  "speed": 107,
  "stats": {
    "str": { "base": 9, "max": 34, "breakthrough": 5 },
    "agi": { "base": 8, "max": 28, "breakthrough": 4 },
    "con": { "base": 10, "max": 35, "breakthrough": 5 },
    "int": { "base": 10, "max": 30, "breakthrough": 4 },
    "per": { "base": 8, "max": 33, "breakthrough": 5 },
    "cha": { "base": 15, "max": 50, "breakthrough": 7 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 177 },
    "def": { "base": 10, "max": 67 },
    "hp": { "base": 350, "max": 3950 }
  },
  "skills": {
    "passive": {
      "name": "未来预兆",
      "description": "行动时，为我方全体恢复攻击力100%/190%的体力值，将每个我方单位的随机1个通用负面状态转化为对应的通用正面状态。若其没有通用负面状态，则令其随机获得1个通用正面状态，持续2回合。",
      "scaling": [
        { "name": "全体恢复体力值", "values": ["100%", "110%", "120%", "130%", "140%", "150%", "160%", "170%", "180%", "190%"] }
      ]
    },
    "signature": {
      "name": "未来已至",
      "cost": "15能量",
      "description": "对敌方全体造成攻击力200%/380%的伤害，并为己方全体恢复攻击力150%/285%的体力值。"
    },
    "personal": {
      "name": "神之庇佑",
      "cooldown": "2回合",
      "description": "为己方全体施加[预兆护盾]，持续2回合。"
    }
  }
}
```

### 3.7 鬼手船匠 (Ghost Shipwright)

```json
{
  "id": "ghost-shipwright",
  "number": "0605",
  "name": "提姆",
  "nickname": "鬼手船匠",
  "nameEn": "Ghost Shipwright",
  "attribute": "agi",
  "attributeZh": "敏捷",
  "role": "subDps,support",
  "roleZh": "协攻、辅助",
  "rarity": 4,
  "rarityZh": "紫券",
  "fleet": "wanderer",
  "fleetZh": "流浪号",
  "faction": "奥托皮亚",
  "position": "船匠",
  "favoriteFood": "烤菠萝",
  "description": "流浪号的改造者，恃才傲物的造船艺术家。",
  "speed": 104,
  "stats": {
    "str": { "base": 10, "max": 35, "breakthrough": 5 },
    "agi": { "base": 12, "max": 37, "breakthrough": 5 },
    "con": { "base": 11, "max": 36, "breakthrough": 5 },
    "int": { "base": 7, "max": 22, "breakthrough": 3 },
    "per": { "base": 11, "max": 41, "breakthrough": 6 },
    "cha": { "base": 9, "max": 29, "breakthrough": 4 }
  },
  "combatStats": {
    "atk": { "base": 20, "max": 184 },
    "def": { "base": 10, "max": 68 },
    "hp": { "base": 350, "max": 4016 }
  },
  "skills": {
    "passive": {
      "name": "船匠锐眼",
      "description": "战斗开始时，对场上威胁最高的1个敌方单位施加[结构缺陷]。[结构缺陷]：防御力降低15%/28%，记录携带者所受伤害的10%/19%，计数上限为鬼手船匠攻击力的450%。计数达到上限时，对敌方全体造成等同于记录值的伤害并清空计数。",
      "scaling": [
        { "name": "防御力降低", "values": ["15%", "16.4%", "17.9%", "19.3%", "20.8%", "22.2%", "23.7%", "25.1%", "26.6%", "28%"] },
        { "name": "所受伤害", "values": ["10%", "11%", "12%", "13%", "14%", "15%", "16%", "17%", "18%", "19%"] }
      ]
    },
    "signature": {
      "name": "拆！",
      "cost": "15能量",
      "description": "对敌方单体造成攻击力600%/1140%的伤害。"
    },
    "personal": {
      "name": "破坏诊断",
      "cooldown": "2回合",
      "description": "为敌方单体施加[结构缺陷]，并造成攻击力200%/380%伤害。"
    }
  }
}
```

### 3.8 其余角色（基础信息）

> 以下角色 Wiki 页面使用旧模板，技能描述完整但缺乏详细数值。

| ID | 编号 | 真名 | 绰号 | 属性 | 定位 | 稀有度 | 船队 | 职位 | 简介 |
|---|---|---|---|---|---|---|---|---|---|
| nonsense-prophet | 0003 | 迪洛芮丝 | 胡话先知 | cha/魅力 | 生存 | 紫券 | 流浪号 | 航海士 | 整天说胡话的预言家 |
| coward | 2064 | 崔维斯 | 懦夫 | con/体质 | 生存 | 紫券 | 破晓者 | 侦察兵 | 毫不避讳承认自己是懦夫 |
| tagalong | 2073 | 里昂 | 跟屁虫 | agi/敏捷 | 主攻 | 紫券 | 流浪号 | 火炮手 | 船长爱德华最忠实的跟随者 |
| haihe | 2111 | 海赫 | 狙击手 | per/感知 | 辅助、协攻 | 紫券 | 破晓者 | 士官长 | 言行精准像一台机器 |
| watchmaker | 2055 | 哈里森 | 钟表匠 | per/感知 | 协攻、辅助 | 紫券 | 黑男爵 | 航海士 | 神经衰弱的航海钟研究员 |
| princess | 2051 | 艾蕾诺尔 | 王女 | str/力量 | 主攻 | 黑券 | 破晓者 | 指挥官 | 僭越王权的"王女"，海鹰名将 |
| heige | 2053 | 黑格 | 笑脸男 | int/智力 | 主攻 | 黑券 | 蓝波乐队 | 手摇琴师 | 疯狂琴师，暗巷医生 |
| edward | 2061 | 爱德华 | 流浪船长 | per/感知 | 辅助 | 黑券 | 流浪号 | 船长 | 昔日海上传奇，如今一滩烂泥 |
| burnt-colonel | 2062 | 托马斯 | 焦面上校 | str/力量 | 主攻 | 黑券 | 破晓者 | 参谋官 | 曾效命于国王的敛财之臣 |
| gail | 2063 | 盖尔 | 虎牙弟 | cha/魅力 | 辅助、生存 | 黑券 | 蓝波乐队 | 主唱 | 奥托皮亚最闪亮的音乐之星 |
| iron-commander | 2071 | 莫里斯 | 铁腕统领 | con/体质 | 生存 | 黑券 | 破晓者 | 副官 | 爱兵如子的将领 |

---

## 4. 攻略内容

> Wiki 攻略页面尚未建立（截至2026.06），以下为基于已知信息的攻略大纲。

### 4.1 新手指南

```json
{
  "id": "beginner-guide",
  "title": "《遗忘之海》新手入门完全指南",
  "titleEn": "Sea of Remnants Complete Beginner Guide",
  "category": "beginner",
  "categoryZh": "新手指南",
  "categoryEn": "Beginner",
  "summary": "从零开始了解《遗忘之海》的世界观、回合制战斗系统、船员招募和奥托皮亚城镇经营。",
  "summaryEn": "Learn everything about Sea of Remnants' world, turn-based combat, crew recruitment, and Orbtopia city management.",
  "content": "## 欢迎，船长\n\n你是一个失去记忆的木偶船长，与自称天才冒险家的少女艾丝一起，在这片被诅咒的海洋中寻找遗忘之海。\n\n### 基础操作\n\n- **回合制战斗**：陆地战斗为回合制策略，合理安排船员行动顺序\n- **海战**：实时操控船只进行海战\n- **船队编组**：根据船员属性和技能搭配甲板小队\n\n### 属性系统\n\n每个船员有一个主属性（力量/敏捷/体质/智力/感知/魅力），决定其技能成长方向：\n\n1. **力量 (STR)** — 物理伤害主属性\n2. **敏捷 (AGI)** — 速度与暴击相关\n3. **体质 (CON)** — 生存与防御\n4. **智力 (INT)** — 技能伤害\n5. **感知 (PER)** — 命中与辅助\n6. **魅力 (CHA)** — 控制与治疗\n\n### 招募优先级\n\n1. 新手池 40 抽保底黑券角色，首抽推荐选择王女或小斧头\n2. 完成主线获取羽毛票据进行招募\n3. 优先培养 1 名主攻 + 1 名辅助 + 1 名生存",
  "contentEn": "## Welcome, Captain\n\nYou are a puppet captain who has lost their memory. Together with Ais, a self-proclaimed genius adventurer, you sail the cursed seas in search of the Sea of Remnants.\n\n### Basic Controls\n\n- **Turn-based Combat**: Land combat uses turn-based strategy\n- **Naval Combat**: Real-time ship battles\n- **Fleet Composition**: Build your deck crew based on crew attributes and skills\n\n### Attribute System\n\nEach crew member has a primary attribute that determines their growth direction:\n\n1. **Strength (STR)** — Physical damage\n2. **Agility (AGI)** — Speed and critical hits\n3. **Constitution (CON)** — Survival and defense\n4. **Intelligence (INT)** — Skill damage\n5. **Perception (PER)** — Accuracy and support\n6. **Charisma (CHA)** — Control and healing\n\n### Recruitment Priority\n\n1. The beginner banner guarantees a Black Ticket character in 40 pulls\n2. Complete main story for Feather Tickets\n3. Prioritize building 1 Main DPS + 1 Support + 1 Survival",
  "tags": ["新手", "入门", "基础", "Beginner", "Basics"],
  "faq": [
    {
      "question": "What should I do first in Sea of Remnants?",
      "questionZh": "遗忘之海开局应该做什么？",
      "answer": "Follow the main story to unlock Orbtopia features, then focus on recruiting and leveling your main DPS crew member.",
      "answerZh": "跟随主线剧情解锁奥托皮亚功能，然后集中资源招募和提升主攻船员。"
    },
    {
      "question": "Is there a gacha system?",
      "questionZh": "遗忘之海有抽卡系统吗？",
      "answer": "Yes, the game uses a Recruitment (招募) system with ticket currencies. Beginner banner has 40-pull pity, limited banners have 80-pull pity.",
      "answerZh": "有的，游戏使用票据货币的招募系统。新手池40抽保底，限定池80抽保底。"
    }
  ]
}
```

### 4.2 下载安装指南

```json
{
  "id": "download-install-guide",
  "title": "《遗忘之海》下载安装指南 — 全平台下载地址",
  "titleEn": "Sea of Remnants System Requirements & Download Guide",
  "category": "beginner",
  "categoryZh": "新手指南",
  "categoryEn": "Beginner",
  "summary": "提供《遗忘之海》在PC、PS5、安卓、iOS平台的下载安装教程和系统配置要求。",
  "summaryEn": "Sea of Remnants system requirements for PC, Android, iOS, and PS5. Download links and install guide for all platforms.",
  "content": "## 系统配置要求\n\n### PC最低配置\n- 操作系统: Windows 10/11 64-bit\n- 处理器: Intel i7-9700 / AMD Ryzen 5 3600X\n- 内存: 16GB RAM\n- 显卡: GTX 1060 (6GB) / RX 480 (8GB)\n- 存储空间: 60GB\n\n### PC推荐配置\n- 操作系统: Windows 10/11 64-bit\n- 处理器: Intel i7-12700 / AMD Ryzen 7 7700X\n- 内存: 32GB RAM\n- 显卡: RTX 3070 Ti / RX 6800XT\n- 存储空间: 80GB\n\n### 下载方式\n\n1. **PC端**: Steam 搜索\"遗忘之海\"或\"Sea of Remnants\"\n2. **移动端**: 官网 sea.163.com 下载\n3. **PS5**: PlayStation Store 搜索 Sea of Remnants",
  "contentEn": "## System Requirements\n\n### PC Minimum\n- OS: Windows 10/11 64-bit\n- CPU: Intel i7-9700 / AMD Ryzen 5 3600X\n- RAM: 16GB\n- GPU: GTX 1060 (6GB) / RX 480 (8GB)\n- Storage: 60GB\n\n### PC Recommended\n- OS: Windows 10/11 64-bit\n- CPU: Intel i7-12700 / AMD Ryzen 7 7700X\n- RAM: 32GB\n- GPU: RTX 3070 Ti / RX 6800XT\n- Storage: 80GB\n\n## How to Download\n\n1. **PC**: Search \"Sea of Remnants\" on Steam\n2. **Mobile**: Visit sea.163.com\n3. **PS5**: Search on PlayStation Store",
  "tags": ["下载", "安装", "Download", "Install"],
  "faq": [
    {
      "question": "Is Sea of Remnants free to play?",
      "questionZh": "遗忘之海是免费游戏吗？",
      "answer": "Yes, Sea of Remnants is free-to-play with in-app purchases.",
      "answerZh": "是的，遗忘之海是免费游玩，有应用内购买。"
    }
  ]
}
```

---

## 5. 待补充内容

> 以下内容 Wiki 尚未建立，需公测后补充。

### 5.1 材料/物品系统
- [ ] 养成材料列表（突破材料、技能材料）
- [ ] 消耗品列表
- [ ] 食物/料理系统
- [ ] 宝藏/收藏品

### 5.2 装备系统
- [ ] 强化骰 (Enhanced Dice) 详细机制
- [ ] 晶骸 (Crystal Bones) 详细机制
- [ ] 船歌 (Ship Songs) 详细机制
- [ ] 往日之影 (Shadows of the Past) 系统

### 5.3 舰船系统
- [ ] 船只类型与属性
- [ ] 火炮/船只组件
- [ ] 海战详细机制

### 5.4 城镇经营
- [ ] 奥托皮亚建筑系统
- [ ] 店铺经营
- [ ] NPC 互动

### 5.5 更多角色
- [ ] 妄想剧团 (Delusion Troupe) 角色：海葬、饿猫、伊莎贝拉
- [ ] 其余 280+ 船员的详细信息
- [ ] 角色配队推荐
- [ ] 角色强度节奏榜

### 5.6 攻略
- [ ] 角色详细攻略（每人一篇）
- [ ] 遗忘之旅 (Roguelike) 攻略
- [ ] 海战攻略
- [ ] 城镇经营攻略
- [ ] 活动攻略

---

## 6. 资料来源索引

| 来源 | URL | 说明 |
|---|---|---|
| 官网 | https://sea.163.com | 预约、世界观、新闻 |
| Steam | https://store.steampowered.com/app/3633680 | PC版商店页 |
| B站 | https://space.bilibili.com/3546811782400683 | 官方动态 |
| BWiki | https://wiki.biligame.com/sea | 社区Wiki，45页 |
| Wikipedia | https://en.wikipedia.org/wiki/Sea_of_Remnants | 英文百科 |

---

## 7. 项目集成备注

### GameId 建议
使用 `sea`（简短，与游戏主题契合）

### 与其他游戏的差异点
1. **无传统元素系统** — 使用6属性 (STR/AGI/CON/INT/PER/CHA) 替代
2. **无武器类型** — 角色无武器装备，技能固定
3. **无遗器/圣遗物系统** — 使用强化骰/晶骸等独特系统
4. **双战斗模式** — 陆地回合制 + 海战即时
5. **城镇经营** — 奥托皮亚主城建设系统
6. **Roguelike** — 遗忘之旅每周挑战

### 需要新增的 routes
- `fleets` (船队/阵营)
- `roguelike` (遗忘之旅)
- `ships` (舰船)

### 建议的主题色
```typescript
theme: {
  primary: '#e11d48',    // 玫红色 (记忆洋流)
  accent: '#06b6d4',     // 海蓝色
  background: '#0c1222', // 深海蓝黑
  surface: '#1e293b',    // 暗蓝灰
}
```
