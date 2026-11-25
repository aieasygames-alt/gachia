// Explicit route ownership and verified light-cone relationships; withdrawal never restores legacy data.
export const STARRAIL_CMS_MATERIALS = {
  "immortal-scionette": {
    "name": "永寿幼芽",
    "sourceId": "113001",
    "equipment": [
      "before-dawn",
      "brighter-than-the-sun",
      "geniuses-repose",
      "trend-of-the-universal-market"
    ]
  },
  "immortal-flower": {
    "name": "永寿天华",
    "sourceId": "113002",
    "equipment": [
      "before-dawn",
      "brighter-than-the-sun",
      "geniuses-repose",
      "trend-of-the-universal-market"
    ]
  },
  "immortal-leaf": {
    "name": "永寿荣枝",
    "sourceId": "113003",
    "equipment": [
      "before-dawn",
      "brighter-than-the-sun",
      "geniuses-repose",
      "trend-of-the-universal-market"
    ]
  },
  "shattered-blade": {
    "name": "破碎残刃",
    "sourceId": "110111",
    "equipment": [
      "brighter-than-the-sun",
      "shattered-home"
    ]
  },
  "lifeless-blade": {
    "name": "无生残刃",
    "sourceId": "110112",
    "equipment": [
      "brighter-than-the-sun",
      "shattered-home"
    ]
  },
  "worldbreaker-blade": {
    "name": "净世残刃",
    "sourceId": "110113",
    "equipment": [
      "brighter-than-the-sun",
      "shattered-home"
    ]
  },
  "key-of-inspiration": {
    "name": "灵感之钥",
    "sourceId": "110131",
    "equipment": [
      "before-dawn",
      "geniuses-repose"
    ]
  },
  "key-of-knowledge": {
    "name": "启迪之钥",
    "sourceId": "110132",
    "equipment": [
      "before-dawn",
      "geniuses-repose"
    ]
  },
  "key-of-wisdom": {
    "name": "智识之钥",
    "sourceId": "110133",
    "equipment": [
      "before-dawn",
      "geniuses-repose"
    ]
  },
  "extinguished-acorn": {
    "name": "熄灭原核",
    "sourceId": "111001",
    "equipment": [
      "shattered-home",
      "day-one-of-my-new-life",
      "fine-fruit"
    ]
  },
  "kindled-acorn": {
    "name": "微光原核",
    "sourceId": "111002",
    "equipment": [
      "shattered-home",
      "day-one-of-my-new-life",
      "fine-fruit"
    ]
  },
  "scorched-acorn": {
    "name": "蠢动原核",
    "sourceId": "111003",
    "equipment": [
      "shattered-home",
      "day-one-of-my-new-life",
      "fine-fruit"
    ]
  },
  "artifexs-module": {
    "name": "工造机杼",
    "sourceId": "113011",
    "equipment": [
      "shadowed-by-night"
    ]
  },
  "artifexs-cyberheart": {
    "name": "工造迴轮",
    "sourceId": "113012",
    "equipment": [
      "shadowed-by-night"
    ]
  },
  "artifexs-gyreheart": {
    "name": "工造浑心",
    "sourceId": "113013",
    "equipment": [
      "shadowed-by-night"
    ]
  },
  "dream-collection-plan": {
    "name": "蓄梦元件",
    "sourceId": "114001",
    "equipment": [
      "along-the-passing-shore",
      "indelible-promise"
    ]
  },
  "dream-fire": {
    "name": "流梦阀门",
    "sourceId": "114002",
    "equipment": [
      "along-the-passing-shore",
      "indelible-promise"
    ]
  },
  "dream-element": {
    "name": "造梦马达",
    "sourceId": "114003",
    "equipment": [
      "along-the-passing-shore",
      "indelible-promise"
    ]
  }
} as const;
export function isStarRailCmsMaterial(id: string): id is keyof typeof STARRAIL_CMS_MATERIALS {
  return Object.hasOwn(STARRAIL_CMS_MATERIALS, id);
}
