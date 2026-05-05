import type { GameModule, SupportedLocale, GameId } from '../types';

// ============================================================
// Locale
// ============================================================

export const DEFAULT_LOCALE: SupportedLocale = 'zh';

export const LOCALES: SupportedLocale[] = ['zh', 'en', 'ja'];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
} as const;

// ============================================================
// Games Registry
// ============================================================

export const GAME_IDS: GameId[] = ['genshin', 'starrail', 'wuwa', 'nte'];

export const GAMES: Record<GameId, GameModule> = {
  genshin: {
    id: 'genshin',
    name: { zh: '原神', en: 'Genshin Impact', ja: '原神' },
    theme: {
      primary: '#d4a254',
      accent: '#ff6b35',
      background: '#1a1a2e',
      surface: '#16213e',
    },
    elements: [
      { id: 'pyro', name: { zh: '火', en: 'Pyro', ja: '炎' }, color: '#ef4444' },
      { id: 'hydro', name: { zh: '水', en: 'Hydro', ja: '水' }, color: '#3b82f6' },
      { id: 'electro', name: { zh: '雷', en: 'Electro', ja: '雷' }, color: '#8b5cf6' },
      { id: 'cryo', name: { zh: '冰', en: 'Cryo', ja: '氷' }, color: '#67e8f9' },
      { id: 'dendro', name: { zh: '草', en: 'Dendro', ja: '草' }, color: '#4ade80' },
      { id: 'anemo', name: { zh: '风', en: 'Anemo', ja: '風' }, color: '#6ee7b7' },
      { id: 'geo', name: { zh: '岩', en: 'Geo', ja: '岩' }, color: '#fbbf24' },
    ],
    rarities: [
      { stars: 4, color: '#a855f7', label: { zh: '四星', en: '4-Star', ja: '★4' } },
      { stars: 5, color: '#eab308', label: { zh: '五星', en: '5-Star', ja: '★5' } },
    ],
    stats: {
      baseStats: ['hp', 'atk', 'def'],
      subStats: ['hpPercent', 'atkPercent', 'defPercent', 'em', 'er', 'critRate', 'critDmg'],
      specialStats: [],
    },
    routes: {
      characters: true,
      weapons: true,
      items: true,
      tierList: true,
      calculator: true,
      map: true,
      guides: true,
    },
  },
  starrail: {
    id: 'starrail',
    name: { zh: '崩坏：星穹铁道', en: 'Honkai: Star Rail', ja: '崩壊：スターレイル' },
    theme: {
      primary: '#7b68ee',
      accent: '#e6b422',
      background: '#0f0f1a',
      surface: '#1a1a2e',
    },
    elements: [
      { id: 'fire', name: { zh: '火', en: 'Fire', ja: '炎' }, color: '#ef4444' },
      { id: 'ice', name: { zh: '冰', en: 'Ice', ja: '氷' }, color: '#67e8f9' },
      { id: 'lightning', name: { zh: '雷', en: 'Lightning', ja: '雷' }, color: '#8b5cf6' },
      { id: 'wind', name: { zh: '风', en: 'Wind', ja: '風' }, color: '#6ee7b7' },
      { id: 'physical', name: { zh: '物理', en: 'Physical', ja: '物理' }, color: '#9ca3af' },
      { id: 'quantum', name: { zh: '量子', en: 'Quantum', ja: '量子' }, color: '#6366f1' },
      { id: 'imaginary', name: { zh: '虚数', en: 'Imaginary', ja: '虚数' }, color: '#fbbf24' },
    ],
    rarities: [
      { stars: 4, color: '#a855f7', label: { zh: '四星', en: '4-Star', ja: '★4' } },
      { stars: 5, color: '#eab308', label: { zh: '五星', en: '5-Star', ja: '★5' } },
    ],
    stats: {
      baseStats: ['hp', 'atk', 'def', 'spd'],
      subStats: ['hpPercent', 'atkPercent', 'defPercent', 'spd', 'critRate', 'critDmg', 'be', 'ehr', 'res'],
      specialStats: ['be', 'ehr', 'res'],
    },
    routes: {
      characters: true,
      weapons: true,
      items: true,
      tierList: true,
      calculator: false,
      map: false,
      guides: true,
    },
  },
  wuwa: {
    id: 'wuwa',
    name: { zh: '鸣潮', en: 'Wuthering Waves', ja: '鳴潮' },
    theme: {
      primary: '#3b82f6',
      accent: '#06b6d4',
      background: '#0a0a1a',
      surface: '#111827',
    },
    elements: [
      { id: 'glacio', name: { zh: '冷凝', en: 'Glacio', ja: '氷凝' }, color: '#67e8f9' },
      { id: 'fusion', name: { zh: '热熔', en: 'Fusion', ja: '融合' }, color: '#ef4444' },
      { id: 'electro', name: { zh: '导电', en: 'Electro', ja: '導電' }, color: '#8b5cf6' },
      { id: 'aero', name: { zh: '气动', en: 'Aero', ja: '気動' }, color: '#6ee7b7' },
      { id: 'spectro', name: { zh: '衍射', en: 'Spectro', ja: '回折' }, color: '#fbbf24' },
      { id: 'havoc', name: { zh: '湮灭', en: 'Havoc', ja: '壊滅' }, color: '#a855f7' },
    ],
    rarities: [
      { stars: 4, color: '#a855f7', label: { zh: '四星', en: '4-Star', ja: '★4' } },
      { stars: 5, color: '#eab308', label: { zh: '五星', en: '5-Star', ja: '★5' } },
    ],
    stats: {
      baseStats: ['hp', 'atk', 'def'],
      subStats: ['hpPercent', 'atkPercent', 'defPercent', 'critRate', 'critDmg', 'healing'],
      specialStats: ['healing'],
    },
    routes: {
      characters: true,
      weapons: true,
      items: true,
      tierList: true,
      calculator: false,
      map: true,
      guides: true,
    },
  },
  nte: {
    id: 'nte',
    name: { zh: '异环', en: 'Neverness to Everness', ja: '異環' },
    theme: {
      primary: '#00d4aa',
      accent: '#ff6b9d',
      background: '#0a0f1a',
      surface: '#111827',
    },
    elements: [
      { id: 'anima', name: { zh: '创生', en: 'Anima', ja: '創生' }, color: '#4ade80' },
      { id: 'chaos', name: { zh: '混沌', en: 'Chaos', ja: '混沌' }, color: '#8b5cf6' },
      { id: 'cosmos', name: { zh: '宇宙', en: 'Cosmos', ja: '宇宙' }, color: '#3b82f6' },
      { id: 'incantation', name: { zh: '咒术', en: 'Incantation', ja: '呪術' }, color: '#f59e0b' },
      { id: 'lakshana', name: { zh: '相', en: 'Lakshana', ja: 'ラクシャナ' }, color: '#ec4899' },
      { id: 'psyche', name: { zh: '精神', en: 'Psyche', ja: 'サイキ' }, color: '#06b6d4' },
    ],
    rarities: [
      { stars: 5, color: '#eab308', label: { zh: 'S级', en: 'S-Rank', ja: 'S級' } },
      { stars: 4, color: '#a855f7', label: { zh: 'A级', en: 'A-Rank', ja: 'A級' } },
      { stars: 3, color: '#60a5fa', label: { zh: 'B级', en: 'B-Rank', ja: 'B級' } },
    ],
    stats: {
      baseStats: ['hp', 'atk', 'def'],
      subStats: ['hpPercent', 'atkPercent', 'defPercent', 'critRate', 'critDmg', 'chargeEff'],
      specialStats: ['chargeEff'],
    },
    routes: {
      characters: true,
      weapons: true,
      items: true,
      tierList: true,
      calculator: false,
      map: false,
      guides: true,
    },
  },
} as const;

// ============================================================
// Rarity Colors (shared across games)
// ============================================================

export const RARITY_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#4ade80',
  3: '#60a5fa',
  4: '#a855f7',
  5: '#eab308',
};

// ============================================================
// Route Categories
// ============================================================

export const CATEGORY_LABELS: Record<string, Record<SupportedLocale, string>> = {
  characters: { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' },
  weapons: { zh: '武器', en: 'Weapons', ja: '武器' },
  items: { zh: '材料道具', en: 'Items', ja: 'アイテム' },
  'tier-list': { zh: '节奏榜', en: 'Tier List', ja: 'ティアリスト' },
  calculator: { zh: '计算器', en: 'Calculator', ja: '計算機' },
  map: { zh: '地图', en: 'Map', ja: 'マップ' },
  guides: { zh: '攻略百科', en: 'Guides', ja: 'ガイド' },
  news: { zh: '资讯', en: 'News', ja: 'ニュース' },
  compare: { zh: '对比', en: 'Compare', ja: '比較' },
};
