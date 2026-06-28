#!/usr/bin/env node
/**
 * P1内容更新脚本
 * 更新装备系统搭配指南和配队攻略
 */

const fs = require('fs');
const path = require('path');

// 装备系统更新数据
const EQUIPMENT_GUIDES = {
  // 原神圣遗物搭配指南
  genshin: {
    "冰风迷途的勇士": {
      name: "冰风迷途的勇士",
      nameEn: "Blizzard Strayer",
      bonus: "2件套：获得15%冰元素伤害加成。4件套：攻击冻结状态的敌人时，暴击率提高20%。",
      bonusEn: "2-piece: +15% Cryo DMG Bonus. 4-piece: CRIT Rate increased by 20% against frozen enemies.",
      bestCharacters: ["ayaka", "lohen", "ganyu", "eula", "kaeya"],
      description: "冰系角色首选套装，配合永冻队使用效果最佳。",
      descriptionEn: "Best-in-slot for Cryo characters, excels in permafreeze teams."
    },
    "炽烈的炎之魔女": {
      name: "炽烈的炎之魔女",
      nameEn: "Crimson Witch of Flames",
      bonus: "2件套：获得15%火元素伤害加成。4件套：超载、燃烧、绽放反应造成的伤害提升40%，蒸发、融化反应的加成系数提升15%。",
      bonusEn: "2-piece: +15% Pyro DMG Bonus. 4-piece: Overloaded, Burning, Bloom DMG increased by 40%, Vaporize and Melt DMG increased by 15%.",
      bestCharacters: ["hu-tao", "diluc", "klee", "yoimiya", "xiangling"],
      description: "火系输出角色通用套装，反应流首选。",
      descriptionEn: "Universal set for Pyro DPS, best for reaction-focused builds."
    },
    "绝缘之旗印": {
      name: "绝缘之旗印",
      nameEn: "Emblem of Severed Fate",
      bonus: "2件套：元素充能效率提高20%。4件套：元素爆发造成的伤害提高25%，该效果基于元素充能效率的140%为上限。",
      bonusEn: "2-piece: Energy Recharge +20%. 4-piece: Elemental Burst DMG increased by 25% of Energy Recharge, up to 75%.",
      bestCharacters: ["raiden", "xiangling", "kokomi", "yelan", "chongyun"],
      description: "依赖元素爆发的角色首选，副C和充电宝适用。",
      descriptionEn: "Best for characters dependent on Elemental Burst, suitable for sub-DPS and battery roles."
    }
  },

  // 星铁遗器搭配指南
  starrail: {
    "焰骸筑城者的Hurag式": {
      name: "焰骸筑城者的Hurag式",
      nameEn: "Hurag's Prison of Pyro",
      bonus: "2件套：火属性伤害提高10%。4件套：施放战技时，装备者灼烧状态下的敌人受到的伤害提高12%，持续2回合。",
      bonusEn: "2-piece: Fire DMG +10%. 4-piece: When using Skill, DMG dealt to Burn-afflicted enemies increases by 12% for 2 turns.",
      bestCharacters: ["mortenax-blade", "kafka", "hook", "asta"],
      description: "火系持续伤害角色首选，适合虚无命途。",
      descriptionEn: "Best for Fire DoT characters, suitable for Nihility path."
    },
    "停转的萨尔索图": {
      name: "停转的萨尔索图",
      nameEn: "Broken Keel",
      bonus: "2件套：使装备者受到的伤害降低16%。4件套：当装备者对敌方目标施加弱点击破效果时，恢复10点能量。",
      bonusEn: "2-piece: DMG taken -16%. 4-piece: Regain 10 Energy when breaking enemy Weakness.",
      bestCharacters: ["fu-xuan", "gepard", "gneiss", "pela"],
      description: "生存型遗器，适合坦克和辅助角色。",
      descriptionEn: "Defensive relic set, suitable for tanks and supports."
    },
    "繁星璀璨的天才": {
      name: "繁星璀璨的天才",
      nameEn: "Genius of Brilliant Stars",
      bonus: "2件套：量子属性伤害提高10%。4件套：对处于量子属性弱点的敌方目标造成伤害时，无视其20%的防御力。",
      bonusEn: "2-piece: Quantum DMG +10%. 4-piece: When attacking enemies with Quantum weakness, ignore 20% of their DEF.",
      bestCharacters: ["seele", "qingque", "silver-wolf-lv999"],
      description: "量子系输出角色首选，无视防御效果优秀。",
      descriptionEn: "Best for Quantum DPS, excellent DEF ignore effect."
    }
  },

  // 鸣潮声骸搭配指南
  wuwa: {
    "轻云出月": {
      name: "轻云出月",
      nameEn: "Moonlit Clouds",
      bonus: "2件套：冷凝伤害提高10%。5件套：施放技能时，冷凝伤害提高15%，持续10秒。",
      bonusEn: "2-piece: Glacio DMG +10%. 5-piece: Glacio DMG increased by 15% for 10s after using Skill.",
      bestCharacters: ["lucilla", "changli", "jianxin", "yangyang"],
      description: "冷凝系角色首选套装，适合副C和主C。",
      descriptionEn: "Best-in-slot for Glacio characters, suitable for both main and sub-DPS."
    },
    "彻空的长吟": {
      name: "彻空的长吟",
      nameEn: "Echoes of the Sky",
      bonus: "2件套：重击伤害提高15%。5件套：重击时，有50%概率触发连发，再次造成50%重击伤害。",
      bonusEn: "2-piece: Charged Attack DMG +15%. 5-piece: Charged Attacks have 50% chance to trigger repeat dealing 50% Charged Attack DMG.",
      bestCharacters: ["calcharo", "encore", "jiemain"],
      description: "重击流角色专用，输出爆发力强。",
      descriptionEn: "Specialized for Charged Attack builds, high burst potential."
    },
    "凝夜的披甲": {
      name: "凝夜的披甲",
      nameEn: "Night Armor",
      bonus: "2件套：受到伤害降低15%。5件套：受到致命伤害时，保留1点生命值并恢复30%生命值，每120秒触发一次。",
      bonusEn: "2-piece: DMG taken -15%. 5-piece: When receiving fatal damage, survive with 1 HP and restore 30% HP, triggers every 120s.",
      bestCharacters: ["baizhi", "verina", "jianxin"],
      description: "生存套装，适合坦克和治疗角色。",
      descriptionEn: "Survival set, suitable for tanks and healers."
    }
  },

  // 绝区零驱动盘搭配指南
  zzz: {
    "混沌爵士": {
      name: "混沌爵士",
      nameEn: "Chaos Jazz",
      bonus: "2件套：以太伤害提高10%。4件套：对处于异常状态敌人造成伤害提高20%。",
      bonusEn: "2-piece: Ether DMG +10%. 4-piece: DMG to enemies with Status Ailments increased by 20%.",
      bestCharacters: ["zhu-yuan", "ellen", "billy"],
      description: "以太系角色首选，配合异常效果输出强力。",
      descriptionEn: "Best for Ether characters, excellent synergy with status effects."
    },
    "蓝调摇滚": {
      name: "蓝调摇滚",
      nameEn: "Blues Rock",
      bonus: "2件套：暴击伤害提高15%。4件套：暴击时，额外造成50%攻击力的伤害。",
      bonusEn: "2-piece: CRIT DMG +15%. 4-piece: On CRIT hit, deal additional 50% ATK as DMG.",
      bestCharacters: ["ellen", "anby", "nicole"],
      description: "暴击流角色首选，输出稳定。",
      descriptionEn: "Best for crit-focused builds, consistent damage output."
    },
    "重金属风暴": {
      name: "重金属风暴",
      nameEn: "Heavy Metal Storm",
      bonus: "2件套：生命值上限提高15%。4件套：受到伤害时，对周围敌人造成100%攻击力的伤害。",
      bonusEn: "2-piece: Max HP +15%. 4-piece: When taking DMG, deal 100% ATK as DMG to surrounding enemies.",
      bestCharacters: ["ben-bigger", "koleda", "sober"],
      description: "生存套装，适合高血量角色。",
      descriptionEn: "Survival set, suitable for high HP characters."
    }
  }
};

// 配队攻略数据
const TEAM_COMPOSITIONS = {
  // 原神配队
  genshin: {
    "永冻队": {
      name: "永冻队",
      nameEn: "Permafreeze Team",
      description: "经典的冰水永冻控制队伍，持续输出强，生存能力优秀。",
      descriptionEn: "Classic Cryo-Hydro permafreeze control team with consistent DPS and great survivability.",
      coreCharacters: ["ayaka", "kokomi"],
      supportCharacters: ["kazuha", "shenhe", "mona"],
      buildExample: {
        mainDPS: "ayaka",
        subDPS: "shenhe",
        support: "kazuha",
        healer: "kokomi"
      },
      playstyle: "神里绫华主输出，珊瑚宫心海挂水并提供治疗，枫原万叶聚怪减抗，神华增伤。"
    },
    "融化队": {
      name: "融化队",
      nameEn: "Melt Team",
      description: "冰火反应输出队伍，爆发伤害极高。",
      descriptionEn: "Cryo-Pyro reaction team with extremely high burst damage.",
      coreCharacters: ["ayaka", "bennett", "xiangling"],
      supportCharacters: ["kazuha", "sucrose"],
      buildExample: {
        mainDPS: "ayaka",
        subDPS: "xiangling",
        support: "kazuha",
        buffer: "bennett"
      },
      playstyle: "冰系主C配合香菱脱手火和班尼特增攻，万叶减抗聚怪，实现高额融化伤害。"
    },
    "胡桃蒸发队": {
      name: "胡桃蒸发队",
      nameEn: "Hu Tao Vaporize Team",
      description: "火水反应输出队伍，胡桃最优配队。",
      descriptionEn: "Pyro-Hydro reaction team, optimal build for Hu Tao.",
      coreCharacters: ["hu-tao", "xingqiu"],
      supportCharacters: ["zhongli", "yelan", "bennett"],
      buildExample: {
        mainDPS: "hu-tao",
        subDPS: "xingqiu",
        support: "yelan",
        shielder: "zhongli"
      },
      playstyle: "胡桃主输出，行秋挂水触发蒸发，夜兰副C，钟离护盾减抗。"
    }
  },

  // 星铁配队
  starrail: {
    "虚无持续队": {
      name: "虚无持续队",
      nameEn: "Nihility DoT Team",
      description: "持续伤害输出队伍，依赖dot触发机制。",
      descriptionEn: "Damage over Time team relying on DoT trigger mechanics.",
      coreCharacters: ["kafka", "mortenax-blade"],
      supportCharacters: ["silver-wolf-lv999", "luocha", "sparkle"],
      buildExample: {
        mainDPS: "kafka",
        subDPS: "mortenax-blade",
        debuffer: "silver-wolf-lv999",
        healer: "luocha"
      },
      playstyle: "卡芙卡触发dot，银狼植入弱点，罗刹治疗，布洛妮娅拉条。"
    },
    "真托队": {
      name: "真托队",
      nameEn: "Truth and Troupe Team",
      description: "真理医生和托帕的组合队伍，追击输出强。",
      descriptionEn: "Dr. Ratio and Topaz team with excellent follow-up attack synergy.",
      coreCharacters: ["dr-ratio", "topaz"],
      supportCharacters: ["robin", "rupert", "ast"],
      buildExample: {
        mainDPS: "dr-ratio",
        subDPS: "topaz",
        support: "robin",
        harmony: "robin"
      },
      playstyle: "真理医生主输出，托帕账账协同攻击，罗布鸟增伤拉条。"
    }
  },

  // 鸣潮配队
  wuwa: {
    "冷凝爆发队": {
      name: "冷凝爆发队",
      nameEn: "Glacio Burst Team",
      description: "冷凝系爆发输出队伍，快速切换机制强。",
      descriptionEn: "Glacio burst DPS team with strong quick-swap mechanics.",
      coreCharacters: ["changli", "lucilla"],
      supportCharacters: ["jianxin", "baizhi", "yangyang"],
      buildExample: {
        mainDPS: "changli",
        subDPS: "lucilla",
        tank: "jianxin",
        healer: "baizhi"
      },
      playstyle: "长离主C，洛瑟菈副C快速切换，剑心坦克，白芷治疗。"
    },
    "雷光队": {
      name: "雷光队",
      nameEn: "Electro Flash Team",
      description: "雷系高频输出队伍，闪电链伤害丰富。",
      descriptionEn: "Electro high-frequency team with rich lightning chain damage.",
      coreCharacters: ["jiemain", " Encore"],
      supportCharacters: ["baizhi", "verina", "yangyang"],
      buildExample: {
        mainDPS: "jiemain",
        subDPS: "encore",
        healer: "verina",
        support: "yangyang"
      },
      playstyle: "戒文主C，安可副C，维里奈治疗，阳阳辅助。"
    }
  },

  // 绝区零配队
  zzz: {
    "以太强攻队": {
      name: "以太强攻队",
      nameEn: "Ether Attack Team",
      description: "以太属性强攻队伍，爆发伤害高。",
      descriptionEn: "Ether Attribute Attack team with high burst damage.",
      coreCharacters: ["zhu-yuan", "nicole"],
      supportCharacters: ["ellen", "billy", "anby"],
      buildExample: {
        mainDPS: "zhu-yuan",
        support: "nicole",
        subDPS: "ellen",
        flex: "anby"
      },
      playstyle: "朱鸢主输出，妮可减防，艾莲副C，安比控制。"
    },
    "狡兔屋队": {
      name: "狡兔屋队",
      nameEn: "Cunning Hares Team",
      description: "狡兔屋三人组，新手友好队伍。",
      descriptionEn: "Cunning Hares trio, beginner-friendly team.",
      coreCharacters: ["anby", "billy", "nicole"],
      supportCharacters: ["ellen", "souverain"],
      buildExample: {
        mainDPS: "billy",
        subDPS: "anby",
        support: "nicole",
        flex: "ellen"
      },
      playstyle: "比利主C，安比控制，妮可辅助，灵活搭配第四人。"
    }
  }
};

/**
 * 创建装备指南文件
 */
function createEquipmentGuides() {
  const outputDir = './content/equipment-guides';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  Object.entries(EQUIPMENT_GUIDES).forEach(([gameId, equipment]) => {
    const gameData = {
      gameId,
      updateTime: new Date().toISOString(),
      equipment: Object.entries(equipment).map(([setId, data]) => ({
        id: setId,
        ...data
      }))
    };

    const filename = `${gameId}-equipment-guide.json`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(gameData, null, 2)
    );

    console.log(`✅ 已创建 ${gameId} 装备指南`);
  });
}

/**
 * 创建配队攻略文件
 */
function createTeamGuides() {
  const outputDir = './content/team-guides';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  Object.entries(TEAM_COMPOSITIONS).forEach(([gameId, teams]) => {
    const gameData = {
      gameId,
      updateTime: new Date().toISOString(),
      teams: Object.entries(teams).map(([teamId, data]) => ({
        id: teamId,
        ...data
      }))
    };

    const filename = `${gameId}-team-guide.json`;
    fs.writeFileSync(
      path.join(outputDir, filename),
      JSON.stringify(gameData, null, 2)
    );

    console.log(`✅ 已创建 ${gameId} 配队指南`);
  });
}

/**
 * 主函数
 */
function main() {
  console.log('开始P1内容更新...\n');

  console.log('📦 创建装备系统搭配指南:');
  createEquipmentGuides();

  console.log('\n👥 创建配队攻略:');
  createTeamGuides();

  console.log('\n✅ P1内容更新完成!');
  console.log('📁 装备指南: ./content/equipment-guides/');
  console.log('📁 配队指南: ./content/team-guides/');
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { createEquipmentGuides, createTeamGuides };
