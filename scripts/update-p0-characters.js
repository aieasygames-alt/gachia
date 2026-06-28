#!/usr/bin/env node
/**
 * P0角色内容更新脚本
 * 更新最新版本角色的技能描述和配装推荐
 */

const fs = require('fs');
const path = require('path');

// 游戏路径配置
const GAMES_PATH = './packages/data/games';

// 原神6.6角色更新数据
const GENSHIN_UPDATES = {
  lohen: {
    skills: {
      normalAttack: {
        description: "进行至多五段的连续长柄攻击，最后一段攻击造成更强的冰元素伤害。",
        descriptionEn: "Performs up to 5 consecutive Polearm strikes, with the final strike dealing greater Cryo DMG."
      },
      elementalSkill: {
        name: "霜寒连斩",
        nameEn: "Frostbreeze Strike",
        description: "释放冰霜之力，对前方敌人造成冰元素伤害并施加霜寒标记。标记存在期间，敌人受到的冰元素伤害增加15%。",
        descriptionEn: "Unleashes frost power to deal Cryo DMG to enemies ahead and apply Frost Mark. While marked, enemies take 15% increased Cryo DMG.",
        cooldown: "8s"
      },
      elementalBurst: {
        name: "凛冬领域",
        nameEn: "Winter Domain",
        description: "创造冰霜领域，对领域内敌人造成持续冰元素伤害，并使领域内角色获得冰元素伤害加成。",
        descriptionEn: "Creates a frost domain that deals continuous Cryo DMG to enemies within and grants Cryo DMG bonus to characters inside.",
        cost: 70,
        cooldown: "15s"
      },
      passive1: {
        name: "寒冰之心",
        nameEn: "Heart of Ice",
        description: "当洛恩处于冰元素附魔状态时，暴击率提升10%。",
        descriptionEn: "When Lohen is infused with Cryo, CRIT Rate increases by 10%."
      },
      passive2: {
        name: "西风骑士",
        nameEn: "Knight of Favonius",
        description: "队伍中每有一个冰系角色，洛恩的冰元素伤害提升8%。",
        descriptionEn: "For every Cryo character in the party, Lohen's Cryo DMG increases by 8%."
      }
    },
    recommendedBuild: {
      bestWeapon: "赤月之杖",
      bestWeaponEn: "Staff of the Scarlet Moon",
      alternativeWeapons: ["护摩之杖", "息灾", "贯月矢"],
      bestArtifactSet: "冰风迷途的勇士",
      bestArtifactSetEn: "Blizzard Strayer",
      mainStats: {
        "时之沙": "ATK%",
        "空之杯": "Cryo DMG",
        "理之冠": "CRIT Rate"
      },
      mainStatsEn: {
        "Sands": "ATK%",
        "Goblet": "Cryo DMG",
        "Circlet": "CRIT Rate"
      },
      subStatPriority: ["CRIT Rate", "CRIT DMG", "ATK%", "Energy Recharge"],
      subStatPriorityEn: ["CRIT Rate", "CRIT DMG", "ATK%", "Energy Recharge"]
    },
    teamComps: [
      {
        name: "永冻队",
        nameEn: "Permafreeze Team",
        members: ["lohen", "kokomi", "kazuha", "shenhe"],
        description: "洛恩主C，心海挂水，万叶聚怪减抗，神华增伤",
        descriptionEn: "Lohen main DPS, Kokomi for Hydro, Kazuha for CC and RES shred, Shenhe for buff"
      }
    ],
    faq: [
      {
        question: "洛恩值得培养吗？",
        questionZh: "洛恩值得培养吗？",
        answer: "洛恩是6.6版本的限定5星冰系长柄角色，拥有优秀的冰冻和碎冰机制，是目前最强的冰系主C之一。",
        answerZh: "洛恩是6.6版本的限定5星冰系长柄角色，拥有优秀的冰冻和碎冰机制，是目前最强的冰系主C之一。"
      },
      {
        question: "洛恩最佳配装是什么？",
        questionZh: "洛恩最佳配装是什么？",
        answer: "推荐使用赤月之杖或护摩之杖，圣遗物选择冰风迷途的勇士4件套，主属性优先攻击沙、冰伤杯、暴击头。",
        answerEn: "Recommend Staff of the Scarlet Moon or Staff of Homa, with Blizzard Strayer 4-piece set. Main stats: ATK% Sands, Cryo DMG Goblet, CRIT Rate Circlet."
      }
    ]
  },
  prune: {
    skills: {
      normalAttack: {
        description: "释放风元素子弹，进行至多五段的远程攻击。",
        descriptionEn: "Fires Anemo projectiles for up to 5 consecutive ranged attacks."
      },
      elementalSkill: {
        description: "创造风刃对敌人造成风元素伤害，并扩散周围元素的元素效果。",
        descriptionEn: "Creates wind blades to deal Anemo DMG and swirl elemental effects from surrounding enemies.",
        cooldown: "6s"
      }
    },
    recommendedBuild: {
      bestWeapon: "流浪乐章",
      bestWeaponEn: "The Widsith",
      alternativeWeapons: ["讨龙英杰谭", "拂玉之前"],
      bestArtifactSet: "翠绿之影",
      bestArtifactSetEn: "Viridescent Venerer"
    }
  },
  nicole: {
    skills: {
      elementalSkill: {
        description: "释放火元素花粉，对周围敌人造成火元素伤害并施加燃烧效果。",
        descriptionEn: "Releases Pyro pollen to deal AoE Pyro DMG and apply Burning to enemies.",
        cooldown: "7s"
      }
    },
    recommendedBuild: {
      bestWeapon: "四风原典",
      bestWeaponEn: "Skyward Atlas",
      alternativeWeapons: ["尘世之锁", "千夜浮梦"],
      bestArtifactSet: "炽烈的炎之魔女",
      bestArtifactSetEn: "Crimson Witch of Flames"
    }
  }
};

// 星铁4.3角色更新数据
const STARRAIL_UPDATES = {
  "mortenax-blade": {
    skills: {
      basicAtk: {
        name: "炎刃斩击",
        nameEn: "Flame Blade Strike",
        description: "对指定敌方单体造成等同于千冶·刃100%攻击力的火属性伤害。",
        descriptionEn: "Deals Fire DMG to a single enemy equal to 100% of Mortenax Blade's ATK."
      },
      skill: {
        description: "消耗战技点，对敌方全体造成火属性伤害，并使目标受到的持续伤害增加20%，持续2回合。",
        descriptionEn: "Consumes Skill Points to deal Fire DMG to all enemies and increases DoT they take by 20% for 2 turns."
      },
      ultimate: {
        description: "消耗能量，对敌方全体造成巨额火属性伤害，并有100%基础概率使目标陷入灼烧状态，持续3回合。",
        descriptionEn: "Consumes Energy to deal massive Fire DMG to all enemies, with 100% base chance to apply Burn for 3 turns."
      }
    },
    recommendedBuild: {
      bestRelicSet: "焰骸筑城者的Hurag式",
      bestRelicSetEn: "Hurag's Prison of Pyro",
      bestLightCone: "不见得",
      bestLightConeEn: "Nowhere to Run"
    }
  },
  evanescia: {
    skills: {
      basicAtk: {
        description: "对敌方单体造成物理属性伤害。",
        descriptionEn: "Deals Physical DMG to a single enemy."
      }
    }
  },
  "silver-wolf-lv999": {
    skills: {
      basicAtk: {
        description: "对敌方单体造成虚数属性伤害，并有概率降低敌方防御。",
        descriptionEn: "Deals Imaginary DMG to a single enemy, with chance to reduce enemy DEF."
      }
    }
  }
};

// 鸣潮3.4角色更新数据
const WUWA_UPDATES = {
  lucilla: {
    skills: {
      basicAtk: {
        description: "进行至多五段的冷凝属性连击攻击，快速积累冷凝能量。",
        descriptionEn: "Performs up to 5 consecutive Glacio attacks, rapidly building Glacio energy."
      },
      skill: {
        description: "释放积累的冷凝能量，对前方大范围敌人造成冷凝伤害并施加冷凝焦灼效果。",
        descriptionEn: "Releases accumulated Glacio energy to deal Glacio DMG to enemies in a large area and apply Glacio Chafe."
      },
      ultimate: {
        description: "创造超低温领域，对领域内敌人造成持续冷凝伤害并降低其移动速度。",
        descriptionEn: "Creates an ultra-low temperature field dealing continuous Glacio DMG and reducing movement speed of enemies within."
      }
    },
    recommendedBuild: {
      bestWeapon: "霜月之环",
      bestWeaponEn: "Frostmoon Ring",
      bestEchoSet: "轻云出月",
      bestEchoSetEn: "Moonlit Clouds"
    }
  },
  rebecca: {
    skills: {
      basicAtk: {
        description: "使用双枪进行快速射击，造成雷属性伤害。",
        descriptionEn: "Fires rapid shots with dual pistols, dealing Electro DMG."
      }
    }
  },
  lucy: {
    skills: {
      basicAtk: {
        description: "进行光谱属性的连击攻击，积累光谱能量。",
        descriptionEn: "Performs Spectro combo attacks to build Spectro energy."
      }
    }
  }
};

/**
 * 更新角色数据
 */
function updateCharacterData(gameId, characterId, updates) {
  const filePath = path.join(GAMES_PATH, gameId, 'raw-characters.json');

  if (!fs.existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const character = data.find(char => char.id === characterId);

    if (!character) {
      console.error(`角色不存在: ${characterId} in ${gameId}`);
      return false;
    }

    // 合并更新数据
    Object.assign(character, updates);

    // 写回文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ 已更新 ${gameId}/${characterId}`);
    return true;

  } catch (error) {
    console.error(`更新失败 ${gameId}/${characterId}:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始P0角色内容更新...\n');

  let successCount = 0;
  let failCount = 0;

  // 更新原神角色
  console.log('🎮 更新原神6.6角色:');
  Object.entries(GENSHIN_UPDATES).forEach(([charId, updates]) => {
    if (updateCharacterData('genshin', charId, updates)) {
      successCount++;
    } else {
      failCount++;
    }
  });

  // 更新星铁角色
  console.log('\n🚀 更新星铁4.3角色:');
  Object.entries(STARRAIL_UPDATES).forEach(([charId, updates]) => {
    if (updateCharacterData('starrail', charId, updates)) {
      successCount++;
    } else {
      failCount++;
    }
  });

  // 更新鸣潮角色
  console.log('\n🌊 更新鸣潮3.4角色:');
  Object.entries(WUWA_UPDATES).forEach(([charId, updates]) => {
    if (updateCharacterData('wuwa', charId, updates)) {
      successCount++;
    } else {
      failCount++;
    }
  });

  console.log(`\n✅ 成功更新: ${successCount}个角色`);
  console.log(`❌ 失败: ${failCount}个角色`);
  console.log(`总计: ${successCount + failCount}个角色`);
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { updateCharacterData };
