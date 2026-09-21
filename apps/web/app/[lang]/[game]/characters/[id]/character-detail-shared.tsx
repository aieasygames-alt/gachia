import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { ChevronRight } from 'lucide-react';
import { buildCharacterJsonLd } from '@/lib/jsonld';
import { Link } from '@/lib/i18n/navigation';
import type { ReactNode } from 'react';

type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

type CharacterFaqEntry = {
  question: string;
  answer: string;
};

type LocaleMeta = Partial<Record<SupportedLocale, {
  title: string;
  description: string;
}>>;



export const CHARACTER_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    {
      href: '/genshin/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '先把角色适配武器补齐', en: 'Fill in the best weapon options first', ja: '相性の良い武器を先に確認' },
    },
    {
      href: '/genshin/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看养成材料和刷取路径', en: 'Continue with ascension materials and farming routes', ja: '育成素材と周回ルートを確認' },
    },
    {
      href: '/genshin/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '查看这个角色相关的版本、活动和抽卡内容', en: 'Open version, event, and pull-planning links for this character', ja: 'このキャラに関連する版本・イベント・ガチャ情報を確認' },
    },
  ],
  starrail: [
    {
      href: '/starrail/weapons',
      title: { zh: '看光锥图鉴', en: 'Browse light cones', ja: '光円錐図鑑へ' },
      description: { zh: '补齐角色最适合的光锥选择', en: 'Fill in the best light cone choices', ja: '最適な光円錐を補完' },
    },
    {
      href: '/starrail/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把突破和行迹材料路线接起来', en: 'Connect ascension and trace materials', ja: '昇格素材と軌跡素材を接続' },
    },
    {
      href: '/starrail/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看版本、卡池和队伍内容', en: 'Continue into version, banner, and team content', ja: '版本・ガチャ・編成へ進む' },
    },
  ],
  wuwa: [
    {
      href: '/wuwa/version',
      title: { zh: '回到版本专题', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
      description: { zh: '先确认最新版本节点，再回头看角色强度', en: 'Check the current version node before comparing builds', ja: '現在の版本を確認してからビルドへ' },
    },
    {
      href: '/wuwa/artifacts',
      title: { zh: '看声骸图鉴', en: 'Browse echo sets', ja: 'エコー図鑑へ' },
      description: { zh: '补齐角色对应的声骸和套装思路', en: 'Fill in the matching echo sets and bonuses', ja: '対応エコーとセット効果を補完' },
    },
    {
      href: '/wuwa/guides/roya-frostlands-guide',
      title: { zh: '看新区域攻略', en: 'Read the region guide', ja: '新エリア攻略へ' },
      description: { zh: '把刷图、地图和养成路线接起来', en: 'Connect farming, map flow, and progression paths', ja: '周回、マップ、育成導線を接続' },
    },
  ],
  nte: [
    {
      href: '/nte/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '先补齐角色对应的武器选择', en: 'Review the best weapon picks first', ja: '適性武器を先に確認' },
    },
    {
      href: '/nte/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把突破材料和天赋材料串起来', en: 'Connect ascension and upgrade materials', ja: '突破素材と育成素材を接続' },
    },
    {
      href: '/nte/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看 Boss、伤害和新手专题', en: 'Continue with boss, damage, and beginner guides', ja: 'ボス・ダメージ・初心者攻略へ' },
    },
  ],
  zzz: [
    {
      href: '/zzz/version',
      title: { zh: '回到 3.3 观察入口', en: 'Back to v3.3 watch hub', ja: 'v3.3観察入口へ戻る' },
      description: { zh: '先把版本热词、福利和卡池信息补齐', en: 'Revisit version topics, rewards, and banner info', ja: '版本トピック、報酬、バナー情報を確認' },
    },
    {
      href: '/zzz/weapons',
      title: { zh: '看音擎图鉴', en: 'Browse W-Engines', ja: '音擎図鑑へ' },
      description: { zh: '继续补角色与武器的搭配关系', en: 'Continue matching characters with weapons', ja: 'キャラと武器の相性を補完' },
    },
    {
      href: '/zzz/drive-discs',
      title: { zh: '看驱动盘图鉴', en: 'Browse drive discs', ja: 'ドライブディスクへ' },
      description: { zh: '把毕业盘和替代盘补完整', en: 'Complete the endgame disc and fallback set picture', ja: '完成形と代替セットを整理' },
    },
  ],
  guihuan: [
    {
      href: '/guihuan/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '先把角色的武器选择补齐', en: 'Review the best weapon picks first', ja: '武器候補を先に確認' },
    },
    {
      href: '/guihuan/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把突破材料和培养消耗接起来', en: 'Connect ascension materials and upgrade costs', ja: '突破素材と育成コストを接続' },
    },
    {
      href: '/guihuan/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看玩法、版本和系统专题', en: 'Continue with gameplay, version, and system guides', ja: '遊び方・版本・システム解説へ' },
    },
  ],
  ananta: [
    {
      href: '/ananta/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '先看角色最适合的武器', en: 'Check the best weapons for the character first', ja: '最適武器を先に確認' },
    },
    {
      href: '/ananta/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看突破和培养材料', en: 'Continue with ascension and growth materials', ja: '突破・育成素材を確認' },
    },
    {
      href: '/ananta/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '查看这个角色相关的专题攻略', en: 'Open broader guides for this character', ja: 'このキャラに関連する攻略特集を確認' },
    },
  ],
  endfield: [
    {
      href: '/endfield/version',
      title: { zh: '回到测试专题', en: 'Back to test hub', ja: 'テスト特集へ戻る' },
      description: { zh: '先确认当前测试节奏和入口', en: 'Re-check the test cadence and entry points', ja: 'テスト時期と入口を再確認' },
    },
    {
      href: '/endfield/guides/combat-system-guide',
      title: { zh: '看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
      description: { zh: '把职业定位和战斗理解接起来', en: 'Link roles, kits, and combat understanding', ja: '職分、スキル、戦闘理解を接続' },
    },
    {
      href: '/endfield/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看养成材料和职业需求', en: 'Continue with materials and role requirements', ja: '育成素材と職分要件を確認' },
    },
  ],
  sea: [
    {
      href: '/sea/version',
      title: { zh: '回到版本中心', en: 'Back to version hub', ja: 'バージョン特集へ戻る' },
      description: { zh: '先看版本节点和首月路线', en: 'Check the version nodes and launch route first', ja: '版本ノードと開服ルートを先に確認' },
    },
    {
      href: '/sea/tier-list',
      title: { zh: '看节奏榜', en: 'Browse tier list', ja: 'Tierへ' },
      description: { zh: '继续确认船员强度和抽取优先级', en: 'Review crew strength and pull priorities', ja: '船員強度と抽選優先度を確認' },
    },
    {
      href: '/sea/guides/open-beta-version-center',
      title: { zh: '看公测专题', en: 'Open beta center', ja: 'CBT特集へ' },
      description: { zh: '继续看开服、安装和系统问题', en: 'Continue with launch, install, and system pages', ja: '開服、DL、システムへ進める' },
    },
    {
      href: '/sea/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把角色培养材料和掉落来源接起来', en: 'Connect character materials with drop sources', ja: '育成素材と入手先を接続' },
    },
  ],
};

export const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

export const NTE_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima', ja: '創生' },
  chaos: { zh: '混沌', en: 'Chaos', ja: '混沌' },
  cosmos: { zh: '宇宙', en: 'Cosmos', ja: '宇宙' },
  incantation: { zh: '咒术', en: 'Incantation', ja: '呪術' },
  lakshana: { zh: '相', en: 'Lakshana', ja: 'ラクシャナ' },
  psyche: { zh: '精神', en: 'Psyche', ja: 'サイキ' },
};

export const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};

export const GENSHIN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' },
  hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' },
  cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' },
  anemo: { zh: '风', en: 'Anemo', ja: '風' },
  geo: { zh: '岩', en: 'Geo', ja: '岩' },
};

export const GENSHIN_WEAPON_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

export const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};

export const STARRAIL_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' },
  ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' },
  wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};

export const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
};

export const GENSHIN_REGION_LABELS: Record<string, Record<string, string>> = {
  mondstadt: { zh: '蒙德', en: 'Mondstadt', ja: 'モンド' },
  liyue: { zh: '璃月', en: 'Liyue', ja: '璃月' },
  inazuma: { zh: '稻妻', en: 'Inazuma', ja: '稲妻' },
  sumeru: { zh: '须弥', en: 'Sumeru', ja: 'スメール' },
  fontaine: { zh: '枫丹', en: 'Fontaine', ja: 'フォンテーヌ' },
  natlan: { zh: '纳塔', en: 'Natlan', ja: 'ナタ' },
  snezhnaya: { zh: '至冬', en: 'Snezhnaya', ja: 'スネージナヤ' },
};

export const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9',
  electric: '#8b5cf6', ether: '#a855f7',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

export const ZZZ_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  fire: { zh: '火', en: 'Fire', ja: '炎' },
  ice: { zh: '冰', en: 'Ice', ja: '氷' },
  electric: { zh: '电', en: 'Electric', ja: '電気' },
  ether: { zh: '以太', en: 'Ether', ja: 'エーテル' },
  'auric-ink': { zh: '墨韵', en: 'Auric Ink', ja: '墨韻' },
  'honed-edge': { zh: '利刃', en: 'Honed Edge', ja: '切刃' },
  wind: { zh: '风', en: 'Wind', ja: '風' },
};

export const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  support: { zh: '支援', en: 'Support', ja: '支援' },
  defense: { zh: '防护', en: 'Defense', ja: '防護' },
  rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
};

export const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};

export const GUIHUAN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  flame: { zh: '烈焰', en: 'Flame', ja: '烈焔' },
  frost: { zh: '霜寒', en: 'Frost', ja: '霜寒' },
  thunder: { zh: '雷霆', en: 'Thunder', ja: '雷霆' },
  gale: { zh: '疾风', en: 'Gale', ja: '疾風' },
  radiance: { zh: '光辉', en: 'Radiance', ja: '光輝' },
  void: { zh: '虚空', en: 'Void', ja: '虚空' },
};

export const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9', nature: '#4ade80', electric: '#facc15',
};

export const ENDFIELD_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  heat: { zh: '炽燃', en: 'Heat', ja: 'ヒート' },
  cryo: { zh: '霜凝', en: 'Cryo', ja: 'クリオ' },
  nature: { zh: '自然', en: 'Nature', ja: 'ネイチャー' },
  electric: { zh: '电击', en: 'Electric', ja: 'エレクトリック' },
};

export const SEA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  str: { zh: '力量', en: 'STR', ja: '力' },
  agi: { zh: '敏捷', en: 'AGI', ja: '敏' },
  con: { zh: '体质', en: 'CON', ja: '体' },
  int: { zh: '智力', en: 'INT', ja: '知' },
  per: { zh: '感知', en: 'PER', ja: '感' },
  cha: { zh: '魅力', en: 'CHA', ja: '魅' },
};

export const SEA_ELEMENT_COLORS: Record<string, string> = {
  str: '#ef4444',
  agi: '#22c55e',
  con: '#f97316',
  int: '#8b5cf6',
  per: '#3b82f6',
  cha: '#ec4899',
};

export const CHARACTER_META_OVERRIDES: Record<string, LocaleMeta> = {
  'genshin/barbara': {
    zh: {
      title: '芭芭拉培养攻略：武器、圣遗物、配队与治疗手法',
      description: '原神芭芭拉培养攻略，整理武器选择、圣遗物搭配、队伍定位和治疗循环，适合想快速上手的玩家。',
    },
    en: {
      title: 'Barbara Build Guide: Weapons, Artifacts, Teams & Healing',
      description: 'Genshin Impact Barbara build guide covering weapons, artifact sets, team roles, and healing rotation tips.',
    },
  },
  'genshin/fischl': {
    zh: {
      title: '菲谢尔培养攻略：武器、圣遗物、配队与输出思路',
      description: '原神菲谢尔培养攻略，整理武器、圣遗物、配队和输出思路，帮助你把奥兹伤害吃满。',
    },
    en: {
      title: 'Fischl Build Guide: Weapons, Artifacts, Teams & DPS',
      description: 'Genshin Impact Fischl build guide covering best weapons, artifact sets, teams, and damage-focused setup tips.',
    },
  },
  'genshin/kirara': {
    zh: {
      title: '绮良良培养攻略：护盾、武器、圣遗物与配队',
      description: '原神绮良良培养攻略，包含护盾强度、武器选择、圣遗物搭配和实用配队建议。',
    },
    en: {
      title: 'Kirara Build Guide: Shields, Weapons, Artifacts & Teams',
      description: 'Genshin Impact Kirara build guide with shield value, weapon picks, artifact sets, and team options.',
    },
  },
  'genshin/beidou': {
    zh: {
      title: '北斗培养攻略：武器、圣遗物、配队与反击玩法',
      description: '原神北斗培养攻略，整理武器、圣遗物、配队与弹反思路，方便你快速搭建雷系副 C。',
    },
    en: {
      title: 'Beidou Build Guide: Weapons, Artifacts, Teams & Counterplay',
      description: 'Genshin Impact Beidou build guide covering weapons, artifact sets, teams, and counter/parry play patterns.',
    },
  },
  'roco/meewee': {
    zh: {
      title: '喵喵（Meewee）图鉴：草系御三家、栖息地与进化链',
      description: '洛克王国:世界国际服精灵图鉴：草系御三家喵喵（Meewee），整理栖息地、进化链与捕捉信息。',
    },
    en: {
      title: 'Meewee — Grass Starter Habitat, Evolution & Catching | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Meewee, the Grass-type starter — habitat, evolution, and catching notes.',
    },
    ja: {
      title: 'Meewee — 草スターターの生息地・進化 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：草スターターMeeweeの生息地、進化、捕獲情報。',
    },
  },
  'roco/sparka': {
    zh: {
      title: '火花（Sparka）图鉴：火系御三家、进化链与 Alpha 血统',
      description: '洛克王国:世界国际服精灵图鉴：火系御三家火花（Sparka），整理进化链、Pyreon 最终形态与 Alpha 血统说明。',
    },
    en: {
      title: 'Sparka — Fire Starter, Evolution & Alpha Bloodline | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Sparka, the Fire-type starter — evolution line, Pyreon, and Alpha Bloodline notes.',
    },
    ja: {
      title: 'Sparka — 炎スターターの進化とAlpha血統 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：炎スターターSparkaの進化ライン、Pyreon、Alpha血統情報。',
    },
  },
  'roco/cerulla': {
    zh: {
      title: '水蓝蓝（Cerulla）图鉴：水系御三家与栖息地',
      description: '洛克王国:世界国际服精灵图鉴：水系御三家水蓝蓝（Cerulla），整理官方命名来源、栖息地与捕捉信息。',
    },
    en: {
      title: 'Cerulla — Water Starter Habitat & Catching | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Cerulla, the Water-type starter — official naming origin, habitat, and catching notes.',
    },
    ja: {
      title: 'Cerulla — 水スターターの生息地と捕獲 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：水スターターCerullaの命名由来、生息地、捕獲情報。',
    },
  },
  'roco/blazehound': {
    zh: {
      title: '焰犬（Blazehound）图鉴：火系野外精灵与领地行为',
      description: '洛克王国:世界国际服精灵图鉴：火系野外精灵焰犬（Blazehound，非御三家），整理栖息地与领地咆哮行为。',
    },
    en: {
      title: 'Blazehound — Fire Wild Jinie, Habitat & Behavior | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Blazehound, the territorial Fire-type wild Jinie (not a starter) — habitat and behavior.',
    },
    ja: {
      title: 'Blazehound — 炎属性野生ジニーと縄張り行動 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：縄張り意識の強い炎属性野生ジニーBlazehoundの生息地と行動。',
    },
  },
  'roco/catapawn': {
    zh: {
      title: '水爪（Catapawn）图鉴：水系野外精灵与缩壳行为',
      description: '洛克王国:世界国际服精灵图鉴：水系野外精灵水爪（Catapawn，非御三家），整理湖畔栖息地与受惊缩壳行为。',
    },
    en: {
      title: 'Catapawn — Water Wild Jinie, Habitat & Behavior | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Catapawn, the Water-type wild Jinie (not a starter) — lakeside habitat and shell-up behavior.',
    },
    ja: {
      title: 'Catapawn — 水属性野生ジニーと縮殻行動 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：湖畔に生息し驚くと縮こまる水属性野生ジニーCatapawnの情報。',
    },
  },
  'roco/dustler': {
    zh: {
      title: '尘帚（Dustler）图鉴：普通系扫帚精灵与城镇栖息',
      description: '洛克王国:世界国际服精灵图鉴：普通系扫帚精灵尘帚（Dustler），整理城镇栖息地与帮忙清理帽子的行为。',
    },
    en: {
      title: 'Dustler — Normal Broom Jinie, Habitat & Behavior | Roco Kingdom',
      description: 'Roco Kingdom global Jinie database entry: Dustler, the broom-shaped Normal-type Jinie — town habitat and hat-cleaning behavior.',
    },
    ja: {
      title: 'Dustler — ノーマル箒ジニーの生息地と行動 | ロコキングダム',
      description: 'ロコキングダム（国際版）のジニー図鑑：ほうき型ノーマルジニーDustlerの街での生息地と帽子掃除の行動。',
    },
  },
};

export function CharacterJsonLd({
  gameId,
  locale,
  name,
  description,
  charId,
  image,
  faq,
  tags,
  categoryLabel,
}: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  charId: string;
  image?: string;
  faq?: CharacterFaqEntry[];
  tags?: string[];
  categoryLabel?: string;
}) {
  const schemas = buildCharacterJsonLd({ gameId, locale, name, description, charId, image, faq, tags, categoryLabel });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  );
}

export function localeStr(zh: unknown, en: unknown, locale: SupportedLocale, ja?: unknown): string {
  const zhText = typeof zh === 'string' ? zh : '';
  const enText = typeof en === 'string' ? en : zhText;
  const jaText = typeof ja === 'string' ? ja : zhText || enText;

  if (locale === 'en') return enText || zhText || jaText;
  if (locale === 'ja') return jaText || zhText || enText;
  return zhText || enText || jaText;
}

export function buildBreadcrumbJsonLd(gameId: GameId, charName: string, locale: SupportedLocale) {
  const gameName = GAMES[gameId]?.name[locale] ?? gameId;
  const homeLabel = locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
  const charsLabel = CATEGORY_LABELS.characters?.[locale] ?? 'Characters';
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeLabel, item: `https://gachia.com/${locale}` },
      { '@type': 'ListItem', position: 2, name: gameName, item: `https://gachia.com/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 3, name: charsLabel, item: `https://gachia.com/${locale}/${gameId}/characters` },
      { '@type': 'ListItem', position: 4, name: charName },
    ],
  };
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-3">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="text-lg font-bold text-game-text">{value}</div>
    </div>
  );
}

// --- Helper Components ---

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-game-primary">{title}</h2>
      {children}
    </section>
  );
}

export function SkillItem({ name, desc, label, extra }: { name: string; desc: string; label: string; extra?: string }) {
  return (
    <details className="group rounded-lg border border-game-border bg-game-surface">
      <summary className="cursor-pointer px-4 py-3">
        <span className="mr-2 text-xs text-game-primary">[{label}]</span>
        <span className="font-medium text-game-text group-hover:text-game-primary">{name}</span>
        {extra && <span className="ml-2 text-xs text-game-text-muted">{extra}</span>}
      </summary>
      <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">{desc}</div>
    </details>
  );
}

export function BuildRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-game-text-muted">{label}</span>
      <span className="text-game-text">{value}</span>
    </div>
  );
}

export function BuildRowLink({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-game-text-muted">{label}</span>
      {href ? (
        <Link href={href as '/'} className="text-game-primary hover:text-game-accent transition-colors">{value}</Link>
      ) : (
        <span className="text-game-text">{value}</span>
      )}
    </div>
  );
}

export function NextStepSection({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const links = CHARACTER_NEXT_STEPS[gameId];
  if (!links?.length) return null;

  return (
    <Section title={locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {link.title[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {link.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  );
}