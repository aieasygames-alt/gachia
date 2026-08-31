// ============================================================
// Gachia Core Types
// ============================================================

// --- Game ---

export type GameId = 'genshin' | 'starrail' | 'wuwa' | 'nte' | 'zzz' | 'guihuan' | 'ananta' | 'endfield' | 'sea' | 'skjh' | 'roco' | 'roco-cn' | 'aniimo';

export type SupportedLocale = 'zh' | 'en' | 'ja';

export interface GameTheme {
  primary: string;
  accent: string;
  background: string;
  surface: string;
}

export interface Element {
  id: string;
  name: Record<SupportedLocale, string>;
  color: string;
  icon?: string;
}

export interface Rarity {
  stars: number;
  color: string;
  label: Record<SupportedLocale, string>;
}

export interface StatConfig {
  baseStats: string[];
  subStats: string[];
  specialStats: string[];
}

export interface GameRouteConfig {
  characters: boolean;
  weapons: boolean;
  items: boolean;
  'tier-list': boolean;
  calculator: boolean;
  map: boolean;
  guides: boolean;
  version?: boolean;
  download?: boolean;
  'disk-sets'?: boolean;
  'drive-discs'?: boolean;
  'redeem-codes'?: boolean;
  gacha?: boolean;
  anomalies?: boolean;
  artifacts?: boolean;
  build?: boolean;
  compare?: boolean;
  teams?: boolean;
}

export interface GameModule {
  id: GameId;
  name: Record<SupportedLocale, string>;
  theme: GameTheme;
  elements: Element[];
  rarities: Rarity[];
  stats: StatConfig;
  routes: GameRouteConfig;
}

// --- Character ---

export type CharacterWeaponType = string;

export interface Character {
  id: string;
  gameId: GameId;
  name: Record<SupportedLocale, string>;
  rarity: number;
  element: string;
  weaponType: CharacterWeaponType;
  description: Record<SupportedLocale, string>;
  images: CharacterImages;
  stats: CharacterStatGrowths;
  materials: AscensionMaterial[];
  skills: Skill[];
  constellations?: Constellation[];
  releaseVersion: string;
}

export interface CharacterImages {
  icon: string;
  card: string;
  gachaSplash: string;
}

export interface CharacterStatGrowths {
  baseHp: number[];
  baseAtk: number[];
  baseDef: number[];
  [statName: string]: number[];
}

export interface AscensionMaterial {
  itemId: string;
  quantities: number[];
}

export interface Skill {
  id: string;
  name: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  type: 'normal' | 'elemental' | 'burst' | 'passive';
  icon?: string;
}

export interface Constellation {
  level: number;
  name: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
}

// --- Weapon ---

export interface Weapon {
  id: string;
  gameId: GameId;
  name: Record<SupportedLocale, string>;
  rarity: number;
  weaponType: CharacterWeaponType;
  description: Record<SupportedLocale, string>;
  images: WeaponImages;
  stats: WeaponStatGrowths;
  passive?: WeaponPassive;
  ascensionMaterials: AscensionMaterial[];
}

export interface WeaponImages {
  icon: string;
  awakenIcon?: string;
}

export interface WeaponStatGrowths {
  baseAtk: number[];
  subStat?: { name: string; values: number[] };
}

export interface WeaponPassive {
  name: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
}

// --- Item ---

export interface Item {
  id: string;
  gameId: GameId;
  name: Record<SupportedLocale, string>;
  type: string;
  rarity: number;
  description: Record<SupportedLocale, string>;
  icon: string;
  sources: Record<SupportedLocale, string>[];
}

// --- Tier List ---

export type TierRank = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface TierListEntry {
  characterId: string;
  tier: TierRank;
  role?: string;
}

export interface TierList {
  gameId: GameId;
  category: string;
  locale: SupportedLocale;
  entries: TierListEntry[];
  updatedAt: string;
}

// --- Guide (MDX frontmatter) ---

export interface GuideFrontmatter {
  title: string;
  gameId: GameId;
  slug: string;
  locale: SupportedLocale;
  author: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  coverImage?: string;
  description: string;
}

// --- Navigation ---

export interface NavItem {
  label: Record<SupportedLocale, string>;
  href: string;
  icon?: string;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
