import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import { ChevronRight } from 'lucide-react';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { buildCharacterJsonLd } from '@/lib/jsonld';
import {
  nteCharacters,
  getNteCharacterById,
  getNteCharacterName,
  getNteCharacterDescription,
  getNteCharacterImage,
  getNteCharacterTierReason,
} from '@gachia/data/games/nte/characters';
import {
  getNteWeaponName,
} from '@gachia/data/games/nte/weapons';
import {
  getNteMaterialName,
  getNteMaterialById,
} from '@gachia/data/games/nte/items';
import {
  getBuildsForCharacter,
  getMaterialsForCharacter,
  getNteDiskSetName,
  getNteDiskSetDesc2pc,
  getNteDiskSetDesc4pc,
} from '@gachia/data/games/nte/extras';
import {
  genshinCharacters,
  getGenshinCharacterById,
  getGenshinCharacterName,
  getGenshinCharacterDescription,
  getGenshinCharacterImage,
  getGenshinCharacterTierReason,
} from '@gachia/data/games/genshin/characters';
import {
  getGenshinWeaponName,
  genshinWeapons,
} from '@gachia/data/games/genshin/weapons';
import {
  getGenshinMaterialName,
  getGenshinMaterialById,
} from '@gachia/data/games/genshin/items';
import {
  getMaterialsForCharacter as getGenshinMaterialsForCharacter,
} from '@gachia/data/games/genshin/extras';
import {
  getArtifactSetName,
  artifactSets as genshinArtifactSets,
} from '@gachia/data/games/genshin/artifacts';
import {
  starrailCharacters,
  getStarRailCharacterById,
  getStarRailCharacterName,
  getStarRailCharacterDescription,
  getStarRailCharacterImage,
  getStarRailCharacterTierReason,
} from '@gachia/data/games/starrail/characters';
import {
  getStarRailLightConeName,
  starrailLightCones,
} from '@gachia/data/games/starrail/weapons';
import {
  relicSets as starrailRelicSets,
  getRelicSetName as getStarRailRelicSetName,
  getRelicSetDesc2pc as getStarRailRelicSetDesc2pc,
  getRelicSetDesc4pc as getStarRailRelicSetDesc4pc,
} from '@gachia/data/games/starrail/relics';
import {
  wuwaCharacters,
  getWuWaCharacterById,
  getWuWaCharacterName,
  getWuWaCharacterDescription,
  getWuWaCharacterImage,
} from '@gachia/data/games/wuwa/characters';
import {
  zzzCharacters,
  getZzzCharacterById,
  getZzzCharacterName,
  getZzzCharacterDescription,
  getZzzCharacterImage,
  getZzzCharacterTierReason,
} from '@gachia/data/games/zzz/characters';
import { zzzWeapons } from '@gachia/data/games/zzz/weapons';
import { zzzDriveDiscs } from '@gachia/data/games/zzz/drive-discs';
import {
  guihuanCharacters,
  getGuihuanCharacterById,
  getGuihuanCharacterName,
  getGuihuanCharacterDescription,
  getGuihuanCharacterImage,
  getGuihuanCharacterTierReason,
} from '@gachia/data/games/guihuan/characters';
import {
  anantaCharacters,
  getAnantaCharacterById,
  getAnantaCharacterName,
  getAnantaCharacterDescription,
  getAnantaCharacterImage,
  getAnantaCharacterTierReason,
} from '@gachia/data/games/ananta/characters';
import {
  endfieldCharacters,
  getEndfieldCharacterById,
  getEndfieldCharacterName,
  getEndfieldCharacterDescription,
  getEndfieldCharacterImage,
  getEndfieldCharacterTierReason,
} from '@gachia/data/games/endfield/characters';
import {
  seaCharacters,
  getSeaCharacterById,
  getSeaCharacterName,
  getSeaCharacterDescription,
  getSeaCharacterImage,
  getSeaCharacterTierReason,
} from '@gachia/data/games/sea/characters';
import type { NteCharacter } from '@gachia/data/games/nte/types';
import type { GenshinCharacter } from '@gachia/data/games/genshin/types';
import type { StarRailCharacter } from '@gachia/data/games/starrail/types';
import type { WuWaCharacter } from '@gachia/data/games/wuwa/types';
import type { ZzzCharacter } from '@gachia/data/games/zzz/types';
import type { GuihuanCharacter } from '@gachia/data/games/guihuan/types';
import type { AnantaCharacter } from '@gachia/data/games/ananta/types';
import type { EndfieldCharacter } from '@gachia/data/games/endfield/types';
import type { SeaCharacter } from '@gachia/data/games/sea/types';
import { getMaterialsForCharacter as getEndfieldMaterialsForCharacter } from '@gachia/data/games/endfield/extras';
import { getEndfieldMaterialById } from '@gachia/data/games/endfield/items';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import dynamic from 'next/dynamic';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const NTE_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima', ja: '創生' },
  chaos: { zh: '混沌', en: 'Chaos', ja: '混沌' },
  cosmos: { zh: '宇宙', en: 'Cosmos', ja: '宇宙' },
  incantation: { zh: '咒术', en: 'Incantation', ja: '呪術' },
  lakshana: { zh: '相', en: 'Lakshana', ja: 'ラクシャナ' },
  psyche: { zh: '精神', en: 'Psyche', ja: 'サイキ' },
};

const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};

const GENSHIN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' },
  hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' },
  cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' },
  anemo: { zh: '风', en: 'Anemo', ja: '風' },
  geo: { zh: '岩', en: 'Geo', ja: '岩' },
};

const GENSHIN_WEAPON_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};

const STARRAIL_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  fire: { zh: '火', en: 'Fire', ja: '炎' },
  ice: { zh: '冰', en: 'Ice', ja: '氷' },
  lightning: { zh: '雷', en: 'Lightning', ja: '雷' },
  wind: { zh: '风', en: 'Wind', ja: '風' },
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  quantum: { zh: '量子', en: 'Quantum', ja: '量子' },
  imaginary: { zh: '虚数', en: 'Imaginary', ja: '虚数' },
};

const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
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

const GENSHIN_REGION_LABELS: Record<string, Record<string, string>> = {
  mondstadt: { zh: '蒙德', en: 'Mondstadt', ja: 'モンド' },
  liyue: { zh: '璃月', en: 'Liyue', ja: '璃月' },
  inazuma: { zh: '稻妻', en: 'Inazuma', ja: '稲妻' },
  sumeru: { zh: '须弥', en: 'Sumeru', ja: 'スメール' },
  fontaine: { zh: '枫丹', en: 'Fontaine', ja: 'フォンテーヌ' },
  natlan: { zh: '纳塔', en: 'Natlan', ja: 'ナタ' },
  snezhnaya: { zh: '至冬', en: 'Snezhnaya', ja: 'スネージナヤ' },
};

const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9',
  electric: '#8b5cf6', ether: '#a855f7',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

const ZZZ_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  fire: { zh: '火', en: 'Fire', ja: '炎' },
  ice: { zh: '冰', en: 'Ice', ja: '氷' },
  electric: { zh: '电', en: 'Electric', ja: '電気' },
  ether: { zh: '以太', en: 'Ether', ja: 'エーテル' },
  'auric-ink': { zh: '墨韵', en: 'Auric Ink', ja: '墨韻' },
  'honed-edge': { zh: '利刃', en: 'Honed Edge', ja: '切刃' },
  wind: { zh: '风', en: 'Wind', ja: '風' },
};

const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  support: { zh: '支援', en: 'Support', ja: '支援' },
  defense: { zh: '防护', en: 'Defense', ja: '防護' },
  rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
};

const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  flame: '#ef4444', frost: '#67e8f9', thunder: '#8b5cf6',
  gale: '#6ee7b7', radiance: '#fbbf24', void: '#a855f7',
};

const GUIHUAN_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  flame: { zh: '烈焰', en: 'Flame', ja: '烈焔' },
  frost: { zh: '霜寒', en: 'Frost', ja: '霜寒' },
  thunder: { zh: '雷霆', en: 'Thunder', ja: '雷霆' },
  gale: { zh: '疾风', en: 'Gale', ja: '疾風' },
  radiance: { zh: '光辉', en: 'Radiance', ja: '光輝' },
  void: { zh: '虚空', en: 'Void', ja: '虚空' },
};

const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9', nature: '#4ade80', electric: '#facc15',
};

const ENDFIELD_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  heat: { zh: '炽燃', en: 'Heat', ja: 'ヒート' },
  cryo: { zh: '霜凝', en: 'Cryo', ja: 'クリオ' },
  nature: { zh: '自然', en: 'Nature', ja: 'ネイチャー' },
  electric: { zh: '电击', en: 'Electric', ja: 'エレクトリック' },
};

const SEA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  str: { zh: '力量', en: 'STR', ja: '力' },
  agi: { zh: '敏捷', en: 'AGI', ja: '敏' },
  con: { zh: '体质', en: 'CON', ja: '体' },
  int: { zh: '智力', en: 'INT', ja: '知' },
  per: { zh: '感知', en: 'PER', ja: '感' },
  cha: { zh: '魅力', en: 'CHA', ja: '魅' },
};

const SEA_ELEMENT_COLORS: Record<string, string> = {
  str: '#ef4444',
  agi: '#22c55e',
  con: '#f97316',
  int: '#8b5cf6',
  per: '#3b82f6',
  cha: '#ec4899',
};

// CRITICAL FIX: Optimize generateStaticParams to avoid loading all game data at once
export async function generateStaticParams() {
  // Use a simple array approach instead of separate variables
  const games = [
    { id: 'nte', characters: nteCharacters },
    { id: 'genshin', characters: genshinCharacters },
    { id: 'starrail', characters: starrailCharacters },
    { id: 'wuwa', characters: wuwaCharacters },
    { id: 'zzz', characters: zzzCharacters },
    { id: 'guihuan', characters: guihuanCharacters },
    { id: 'ananta', characters: anantaCharacters },
    { id: 'endfield', characters: endfieldCharacters },
    { id: 'sea', characters: seaCharacters },
  ];

  // Generate params for all games and locales
  const params = games.flatMap(({ id, characters }) =>
    LOCALES.flatMap((lang) =>
      characters.map((char) => ({ lang, game: id, id: char.id }))
    )
  );

  return params;
}

function CharJsonLd({ gameId, locale, name, description, charId }: { gameId: GameId; locale: SupportedLocale; name: string; description: string; charId: string }) {
  const schemas = buildCharacterJsonLd({ gameId, locale, name, description, charId });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  const buildAlternates = (charId: string) => ({
    canonical: `https://gachia.com/${locale}/${gameId}/characters/${charId}`,
    languages: {
      'zh-Hans': `https://gachia.com/zh/${gameId}/characters/${charId}`,
      en: `https://gachia.com/en/${gameId}/characters/${charId}`,
      ja: `https://gachia.com/ja/${gameId}/characters/${charId}`,
      'x-default': `https://gachia.com/zh/${gameId}/characters/${charId}`,
    },
  });

  const buildOg = (charName: string) => ({
    title: charName,
    images: [{ url: `/images/og/${gameId}.jpg`, width: 1200, height: 630, alt: charName }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  });

  if (gameId === 'genshin') {
    const char = getGenshinCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.genshin.name[locale];
    const name = getGenshinCharacterName(char, locale);
    const elName = GENSHIN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
    const wName = GENSHIN_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;
    const title = locale === 'zh'
      ? `${name}最佳配装攻略 — 武器、圣遗物、配队推荐（${char.tierRank}级）`
      : locale === 'ja'
        ? `${name}最強ビルド — 武器、聖遺物、編成（Tier ${char.tierRank}）`
        : `${name} Build Guide — Best Weapons, Artifacts & Teams (${char.tierRank})`;
    const desc = locale === 'zh'
      ? `${name}（${elName}${wName}）配装攻略：推荐武器、圣遗物套装、主副词条、配队组合。${char.tierRank}级角色全面解析。`
      : `${name} ${elName} ${wName} build guide: best weapons, artifact sets, main stats, team comps, and F2P options. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'starrail') {
    const char = getStarRailCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.starrail.name[locale];
    const name = getStarRailCharacterName(char, locale);
    const elName = STARRAIL_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
    const pathName = STARRAIL_PATH_LABELS[char.path]?.[locale] ?? char.path;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}${pathName}最佳光锥、遗器、配队`
      : `${name} Build Guide — ${elName} ${pathName} Best Light Cones, Relics & Teams`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐光锥、遗器套装、主词条、配队组合，${char.tierRank} Tier`
      : `${name} build guide for Honkai: Star Rail: best light cones, relic sets, main stats, team comps. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.nte.name[locale];
    const name = getNteCharacterName(char, locale);
    const elName = NTE_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}属性最佳弧盘、弧盘套装、配队`
      : `${name} — ${elName} Build: Best Arcs, Disk Sets & Teams | NTE`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐弧盘、弧盘套装、配队组合，${char.tierRank} Tier`
      : `Complete ${name} build guide for Neverness to Everness: best arcs, disk sets, team comps. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'wuwa') {
    const char = getWuWaCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.wuwa.name[locale];
    const name = getWuWaCharacterName(char, locale);
    const elName = WUWA_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
    const wName = WUWA_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}${wName}最佳武器、声骸、配队`
      : `${name} Build Guide — ${elName} ${wName} Best Weapons, Echoes & Teams`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐武器、声骸套装、配队组合，${char.tierRank ?? ''} Tier`
      : `${name} build guide for Wuthering Waves: best weapons, echo sets, team comps. ${char.tierRank ?? ''} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'zzz') {
    const char = getZzzCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.zzz.name[locale];
    const name = getZzzCharacterName(char, locale);
    const elName = ZZZ_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute;
    const specName = ZZZ_SPECIALTY_LABELS[char.specialtyEn]?.[locale] ?? char.specialtyEn;
    const title = locale === 'zh'
      ? `${name}最佳配装 — 音擎、驱动盘、配队推荐（${char.tierRank}级）`
      : `${name} Best Build — W-Engines, Drive Discs & Teams (${char.tierRank} Tier)`;
    const desc = locale === 'zh'
      ? `${name}（${elName}${specName}）配装攻略：推荐音擎、驱动盘套装、主副词条、配队组合。${char.tierRank}级角色全面解析。`
      : `${name} ${elName} ${specName} best build: recommended W-Engines, drive disc sets, main stats, and team comps. ${char.tierRank} tier ZZZ agent.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'guihuan') {
    const char = getGuihuanCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.guihuan.name[locale];
    const name = getGuihuanCharacterName(char, locale);
    const elName = GUIHUAN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}属性最佳武器、配队`
      : `${name} — ${elName} Build: Best Weapons & Teams | Guihuan`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐武器、配队组合，${char.tierRank} Tier`
      : `Complete ${name} build guide for Guihuan: best weapons, team comps. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'ananta') {
    const char = getAnantaCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.ananta.name[locale];
    const name = getAnantaCharacterName(char, locale);
    const elName = ANANTA_ELEMENT_NAMES[char.element]?.[locale] ?? char.elementEn;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}属性最佳武器、配队`
      : `${name} — ${elName} Build: Best Weapons & Teams | Ananta`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐武器、配队组合，${char.tierRank} Tier`
      : `Complete ${name} build guide for Ananta: best weapons, team comps. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'endfield') {
    const char = getEndfieldCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.endfield.name[locale];
    const name = getEndfieldCharacterName(char, locale);
    const elName = ENDFIELD_ELEMENT_NAMES[char.element]?.[locale] ?? char.elementEn;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}属性最佳武器、配队`
      : `${name} — ${elName} Build: Best Weapons & Teams | Endfield`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐武器、配队组合，${char.tierRank} Tier`
      : `Complete ${name} build guide for Arknights: Endfield: best weapons, team comps. ${char.tierRank} tier.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  if (gameId === 'sea') {
    const char = getSeaCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.sea.name[locale];
    const name = getSeaCharacterName(char, locale);
    const elName = SEA_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attributeEn;
    const title = locale === 'zh'
      ? `${name}配装攻略 — ${elName}属性最佳配队`
      : `${name} — ${elName} Build: Best Teams | Sea of Remnants`;
    const desc = locale === 'zh'
      ? `${name}配装攻略：推荐配队组合`
      : `Complete ${name} build guide for Sea of Remnants: best team comps.`;
    return { title, description: desc.slice(0, 160), openGraph: buildOg(name), alternates: buildAlternates(id) };
  }

  return {};
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    const char = getGenshinCharacterById(id);
    if (!char) notFound();
    const name = getGenshinCharacterName(char, locale);
    const desc = getGenshinCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><GenshinCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'starrail') {
    const char = getStarRailCharacterById(id);
    if (!char) notFound();
    const name = getStarRailCharacterName(char, locale);
    const desc = getStarRailCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><StarRailCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) notFound();
    const name = getNteCharacterName(char, locale);
    const desc = getNteCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><NteCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'wuwa') {
    const char = getWuWaCharacterById(id);
    if (!char) notFound();
    const name = getWuWaCharacterName(char, locale);
    const desc = getWuWaCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><WuWaCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'zzz') {
    const char = getZzzCharacterById(id);
    if (!char) notFound();
    const name = getZzzCharacterName(char, locale);
    const desc = getZzzCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><ZzzCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'guihuan') {
    const char = getGuihuanCharacterById(id);
    if (!char) notFound();
    const name = getGuihuanCharacterName(char, locale);
    const desc = getGuihuanCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><GuihuanCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'ananta') {
    const char = getAnantaCharacterById(id);
    if (!char) notFound();
    const name = getAnantaCharacterName(char, locale);
    const desc = getAnantaCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><AnantaCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'endfield') {
    const char = getEndfieldCharacterById(id);
    if (!char) notFound();
    const name = getEndfieldCharacterName(char, locale);
    const desc = getEndfieldCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><EndfieldCharacterDetail char={char} locale={locale} /></>;
  }

  if (gameId === 'sea') {
    const char = getSeaCharacterById(id);
    if (!char) notFound();
    const name = getSeaCharacterName(char, locale);
    const desc = getSeaCharacterDescription(char, locale);
    return <><CharJsonLd gameId={gameId} locale={locale} name={name} description={desc} charId={id} /><SeaCharacterDetail char={char} locale={locale} /></>;
  }

  notFound();
}

// ============================================================
// Genshin Character Detail
// ============================================================

function GenshinCharacterDetail({ char, locale }: { char: GenshinCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.genshin;
  const imageUrl = getGenshinCharacterImage(char);
  const elementColor = GENSHIN_ELEMENT_COLORS[char.element] || '#888';
  const elementName = GENSHIN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
  const weaponLabel = GENSHIN_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;
  const regionLabel = GENSHIN_REGION_LABELS[char.region]?.[locale] ?? char.region;
  const charName = getGenshinCharacterName(char, locale);

  const build = char.recommendedBuild;
  const hasBuild = !!(build && (build as unknown as Record<string, unknown>).bestWeaponEn);
  const buildArtifactSet = hasBuild ? genshinArtifactSets.find(s => s.id === build.bestArtifactSet) : undefined;

  // Resolve build items for linking
  const buildWeapon = hasBuild ? genshinWeapons.find(w => w.nameEn.toLowerCase() === build.bestWeaponEn.toLowerCase()) : undefined;
  const buildArtifact = hasBuild ? genshinArtifactSets.find(s => s.nameEn.toLowerCase() === build.bestArtifactSetEn.toLowerCase()) : undefined;
  const altArtifact = hasBuild && build.alternativeArtifactSetEn ? genshinArtifactSets.find(s => s.nameEn.toLowerCase() === build.alternativeArtifactSetEn!.toLowerCase()) : null;
  const altWeapons = hasBuild ? (build.alternativeWeapons ?? []).map(aw => genshinWeapons.find(w => w.nameEn.toLowerCase() === aw.toLowerCase() || w.name === aw)).filter(Boolean) : [];
  const mainStats = Object.values(locale === 'zh' ? build?.mainStats ?? {} : build?.mainStatsEn ?? {}).join(' / ');
  const subStatPriority = (locale === 'zh' ? build?.subStatPriority : build?.subStatPriorityEn)?.join(' > ') ?? '';
  const renderSkill = (
    skill: GenshinCharacter['skills'][keyof GenshinCharacter['skills']] | undefined,
    label: string,
    fallbackName: string,
    extra?: string
  ) => {
    if (!skill) return null;
    const name = locale === 'zh' ? skill.name : skill.nameEn;
    const desc = locale === 'zh' ? skill.description : skill.descriptionEn;
    if (!name && !desc) return null;
    return (
      <SkillItem
        name={name || fallbackName}
        desc={desc || (locale === 'zh' ? '暂无详细说明。' : 'Details coming soon.')}
        label={label}
        extra={extra}
      />
    );
  };

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getGenshinCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/genshin/characters/${char.id}`,
  };

  // FAQ JSON-LD
  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: locale === 'zh' ? f.questionZh : f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: locale === 'zh' ? f.answerZh : f.answer,
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('genshin', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/genshin" className="hover:text-game-primary transition-colors">{GAMES.genshin.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/genshin/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={getGenshinCharacterName(char, locale)}
            element={char.element}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {getGenshinCharacterName(char, locale)}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="genshin" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {char.rarity}★
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {weaponLabel}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {regionLabel}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getGenshinCharacterDescription(char, locale)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            {char.cvZh && <span>CV: {locale === 'zh' ? char.cvZh : locale === 'ja' ? (char.cvJp || '') : (char.cvEn || '')}</span>}
            <span>
              {locale === 'zh' ? '获取方式' : 'Acquisition'}:{' '}
              {char.acquisitionMethod === 'limited-banner' ? (locale === 'zh' ? '限定祈愿' : 'Limited Banner') :
               char.acquisitionMethod === 'standard' ? (locale === 'zh' ? '常驻祈愿' : 'Standard Banner') :
               char.acquisitionMethod === 'free' ? (locale === 'zh' ? '免费获取' : 'Free') : char.acquisitionMethod}
            </span>
            <span>{locale === 'zh' ? '版本' : 'Version'}: {char.releaseVersion}</span>
          </div>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getGenshinCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '天赋' : locale === 'ja' ? '天賦' : 'Talents'}>
        <div className="space-y-3">
          {renderSkill(char.skills.normalAttack, locale === 'zh' ? '普通攻击' : 'Normal Attack', locale === 'zh' ? '普通攻击' : 'Normal Attack')}
          {renderSkill(char.skills.elementalSkill, locale === 'zh' ? '元素战技' : 'Elemental Skill', locale === 'zh' ? '元素战技' : 'Elemental Skill', char.skills.elementalSkill?.cooldown)}
          {renderSkill(
            char.skills.elementalBurst,
            locale === 'zh' ? '元素爆发' : 'Elemental Burst',
            locale === 'zh' ? '元素爆发' : 'Elemental Burst',
            [char.skills.elementalBurst?.cost ? `${char.skills.elementalBurst.cost} Energy` : '', char.skills.elementalBurst?.cooldown].filter(Boolean).join(' | ')
          )}
          {renderSkill(char.skills.passive1, locale === 'zh' ? '固有天赋1' : 'Passive 1', locale === 'zh' ? '固有天赋1' : 'Passive 1')}
          {renderSkill(char.skills.passive2, locale === 'zh' ? '固有天赋2' : 'Passive 2', locale === 'zh' ? '固有天赋2' : 'Passive 2')}
          {renderSkill(char.skills.passive4, locale === 'zh' ? '实用天赋' : 'Utility Passive', locale === 'zh' ? '实用天赋' : 'Utility Passive')}
        </div>
      </Section>

      {/* Constellations */}
      {char.constellations.length > 0 && (
        <Section title={locale === 'zh' ? '命之座' : locale === 'ja' ? '命ノ星座' : 'Constellations'}>
          <div className="space-y-3">
            {char.constellations.map((c) => (
              <details key={c.level} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3">
                  <span className="mr-2 text-xs text-game-primary">[C{c.level}]</span>
                  <span className="font-medium text-game-text group-hover:text-game-primary">{locale === 'zh' ? c.name : c.nameEn}</span>
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {locale === 'zh' ? c.description : c.descriptionEn}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Recommended Build */}
      {hasBuild && (
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRowLink label={locale === 'zh' ? '最佳武器' : 'Best Weapon'}
            value={locale === 'zh' ? build.bestWeapon : build.bestWeaponEn}
            href={buildWeapon ? `/genshin/weapons/${buildWeapon.id}` : undefined} />
          {altWeapons.length > 0 && (
            <div className="flex gap-2">
              <span className="text-game-text-muted">{locale === 'zh' ? '备选武器' : 'Alt Weapons'}</span>
              <span className="text-game-text">{altWeapons.map(w => w ? <Link key={w.id} href={`/genshin/weapons/${w.id}` as '/'} className="text-game-primary hover:text-game-accent transition-colors">{getGenshinWeaponName(w, locale)}</Link> : null).filter(Boolean).reduce((prev, curr) => <>{prev}, {curr}</>)}</span>
            </div>
          )}
          <BuildRowLink label={locale === 'zh' ? '圣遗物套装' : 'Artifact Set'}
            value={locale === 'zh' ? build.bestArtifactSet : build.bestArtifactSetEn}
            href={buildArtifact ? `/genshin/artifacts#${buildArtifact.id}` : undefined} />
          {altArtifact && (
            <BuildRowLink label={locale === 'zh' ? '备选套装' : 'Alt Set'}
              value={getArtifactSetName(altArtifact, locale)}
              href={`/genshin/artifacts#${altArtifact.id}`} />
          )}
          {mainStats && <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'} value={mainStats} />}
          {subStatPriority && <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'} value={subStatPriority} />}
        </div>
      </Section>
      )}

      {/* Team Compositions */}
      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめパーティ' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{locale === 'zh' ? team.name : team.nameEn}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => {
                    const member = getGenshinCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/genshin/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getGenshinCharacterName(member, locale)}
                      </Link>
                    ) : (
                      <span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Ascension Materials */}
      {(() => {
        const charMats = getGenshinMaterialsForCharacter(char.id);
        if (!charMats) return null;
        return (
          <Section title={locale === 'zh' ? '养成材料' : locale === 'ja' ? '育成素材' : 'Ascension Materials'}>
            <div className="space-y-4">
              {/* Ascension */}
              {charMats.ascensionMaterials.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-game-text">{locale === 'zh' ? '角色突破' : 'Character Ascension'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-game-border text-left text-game-text-muted">
                          <th className="pb-2 pr-4">{locale === 'zh' ? '等级' : 'Level'}</th>
                          <th className="pb-2">{locale === 'zh' ? '材料' : 'Materials'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charMats.ascensionMaterials.map((row) => (
                          <tr key={row.levelRange} className="border-b border-game-border/50">
                            <td className="py-2 pr-4 font-medium text-game-text">{row.levelRange}</td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-2">
                                {row.materials.map((m) => {
                                  const mat = getGenshinMaterialById(m.id);
                                  return (
                                    <span key={m.id} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                                      {mat ? getGenshinMaterialName(mat, locale) : m.id} ×{m.quantity}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Talent */}
              {charMats.talentMaterials.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-game-text">{locale === 'zh' ? '天赋升级' : 'Talent Upgrade'}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-game-border text-left text-game-text-muted">
                          <th className="pb-2 pr-4">{locale === 'zh' ? '等级' : 'Level'}</th>
                          <th className="pb-2">{locale === 'zh' ? '材料' : 'Materials'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charMats.talentMaterials.map((row) => (
                          <tr key={row.talentLevel} className="border-b border-game-border/50">
                            <td className="py-2 pr-4 font-medium text-game-text">{row.talentLevel}</td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-2">
                                {row.materials.map((m) => {
                                  const mat = getGenshinMaterialById(m.id);
                                  return (
                                    <span key={m.id} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                                      {mat ? getGenshinMaterialName(mat, locale) : m.id} ×{m.quantity}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Section>
        );
      })()}

      {/* FAQ */}
      {char.faq && char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {locale === 'zh' ? faqItem.questionZh : faqItem.question}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {locale === 'zh' ? faqItem.answerZh : faqItem.answer}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getGenshinCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/genshin/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getGenshinCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Star Rail Character Detail
// ============================================================

function StarRailCharacterDetail({ char, locale }: { char: StarRailCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.starrail;
  const imageUrl = getStarRailCharacterImage(char);
  const elementColor = STARRAIL_ELEMENT_COLORS[char.element] || '#888';
  const elementName = STARRAIL_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
  const pathLabel = STARRAIL_PATH_LABELS[char.path]?.[locale] ?? char.path;
  const charName = getStarRailCharacterName(char, locale);
  const build = char.recommendedBuild;
  const hasBuild = !!(build && (build as unknown as Record<string, unknown>).bestLightConeEn);
  const buildLC = hasBuild ? starrailLightCones.find(lc => lc.nameEn.toLowerCase() === build.bestLightConeEn.toLowerCase() || lc.name === build.bestLightCone) : undefined;
  const buildRelic = hasBuild ? starrailRelicSets.find(rs => rs.nameEn.toLowerCase() === build.bestRelicSetEn.toLowerCase() || rs.name === build.bestRelicSet) : undefined;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getStarRailCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/starrail/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: locale === 'zh' ? f.questionZh : f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: locale === 'zh' ? f.answerZh : f.answer,
      },
    })),
  } : null;

  return (
    <div className="space-y-8">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('starrail', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/starrail" className="hover:text-game-primary transition-colors">{GAMES.starrail.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/starrail/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="relative h-64 w-64 flex-shrink-0 overflow-hidden rounded-xl border border-game-border bg-game-surface">
          <CharacterAvatar src={imageUrl} alt={charName} element={char.element} className="h-full w-full object-cover object-top" />
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>{elementName}</span>
            <span className="rounded bg-game-bg/80 px-2 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>{char.rarity}★</span>
          </div>
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-3xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="starrail" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-game-surface-alt px-3 py-1 text-sm text-game-text">{pathLabel}</span>
            <span className="rounded-full bg-game-surface-alt px-3 py-1 text-sm" style={{ color: elementColor }}>{elementName}</span>
            <span className="rounded-full bg-game-surface-alt px-3 py-1 text-sm text-game-text">{char.rarity}★</span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>{char.tierRank}</span>
            )}
          </div>
          <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
            {getStarRailCharacterDescription(char, locale)}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-game-text-muted">
            {char.cvZh && <span>{locale === 'zh' ? '中配' : 'CV(ZH)'}: {char.cvZh}</span>}
            {char.cvJp && <span>{locale === 'zh' ? '日配' : 'CV(JP)'}: {char.cvJp}</span>}
            {char.cvEn && <span>{locale === 'zh' ? '英配' : 'CV(EN)'}: {char.cvEn}</span>}
            <span>v{char.releaseVersion}</span>
          </div>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{locale === 'zh' ? char.tierReasonZh : char.tierReason}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      {char.skills && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'basicAtk', label: locale === 'zh' ? '普攻' : locale === 'ja' ? '通常攻撃' : 'Basic ATK' },
              { key: 'skill', label: locale === 'zh' ? '战技' : locale === 'ja' ? '戦技' : 'Skill' },
              { key: 'ultimate', label: locale === 'zh' ? '终结技' : locale === 'ja' ? '必殺技' : 'Ultimate' },
              { key: 'talent', label: locale === 'zh' ? '天赋' : locale === 'ja' ? '天賦' : 'Talent' },
              { key: 'technique', label: locale === 'zh' ? '秘技' : locale === 'ja' ? '秘技' : 'Technique' },
            ].map(({ key, label }) => {
              const skill = (char.skills as unknown as Record<string, { name: string; nameEn: string; description: string; descriptionEn: string }>)[key];
              if (!skill) return null;
              return (
                <div key={key} className="rounded-lg border border-game-border bg-game-surface p-4">
                  <h3 className="mb-2 font-semibold text-game-text">
                    {label}: {localeStr(skill.name, skill.nameEn, locale)}
                  </h3>
                  <p className="text-sm leading-relaxed text-game-text-muted">
                    {localeStr(skill.description, skill.descriptionEn, locale)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Eidolons */}
      {char.eidolons.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '星魂' : locale === 'ja' ? '星魂' : 'Eidolons'}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {char.eidolons.map((e) => (
              <div key={e.level} className="rounded-lg border border-game-border bg-game-surface p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: gameConfig.theme.accent }}>E{e.level}</span>
                  <h3 className="text-sm font-semibold text-game-text">{localeStr(e.name, e.nameEn, locale)}</h3>
                </div>
                <p className="text-xs leading-relaxed text-game-text-muted">{localeStr(e.description, e.descriptionEn, locale)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Build */}
      {hasBuild && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめ装備' : 'Recommended Build'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '最佳光锥' : 'Best Light Cone'}
              </h3>
              <Link href={buildLC ? `/starrail/weapons/${buildLC.id}` : '/starrail/weapons'} className="text-sm font-medium text-game-primary transition-colors hover:text-game-accent">
                {localeStr(build.bestLightCone, build.bestLightConeEn, locale)}
              </Link>
              {(build.alternativeLightCones?.length ?? 0) > 0 && (
                <p className="mt-1 text-xs text-game-text-muted">
                  {locale === 'zh' ? '替代' : 'Alt'}: {build.alternativeLightCones.join(', ')}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '最佳遗器' : 'Best Relics'}
              </h3>
              <Link href={buildRelic ? `/starrail/artifacts#${buildRelic.id}` : '/starrail/artifacts'} className="text-sm font-medium text-game-primary transition-colors hover:text-game-accent">
                {localeStr(build.bestRelicSet, build.bestRelicSetEn, locale)}
              </Link>
              <p className="mt-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '位面饰品' : 'Planar'}:{' '}
                <Link href="/starrail/artifacts" className="text-game-primary hover:text-game-accent transition-colors">
                  {localeStr(build.bestPlanarOrnament, build.bestPlanarOrnamentEn, locale)}
                </Link>
              </p>
            </div>
          </div>
          {(build.subStatPriority.length > 0 || build.subStatPriorityEn.length > 0) && (
            <div className="mt-3 rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '副词条优先级' : 'Substat Priority'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).map((stat, i) => (
                  <span key={i} className="rounded bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">{stat}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Team Comps */}
      {char.teamComps.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Team Compositions'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h3 className="mb-2 font-semibold text-game-text">{localeStr(team.name, team.nameEn, locale)}</h3>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {team.members.map((member) => {
                    const memberChar = starrailCharacters.find(c => c.name === member || c.nameEn === member);
                    return memberChar ? (
                      <Link key={member} href={`/starrail/characters/${memberChar.id}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {member}
                      </Link>
                    ) : (
                      <span key={member} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{member}</span>
                    );
                  })}
                </div>
                <p className="text-xs text-game-text-muted">{localeStr(team.description, team.descriptionEn, locale)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {char.faq.map((item, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(item.questionZh, item.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(item.answerZh, item.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getStarRailCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/starrail/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getStarRailCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? zh;
  return zh;
}

function buildBreadcrumbJsonLd(gameId: GameId, charName: string, locale: SupportedLocale) {
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

// ============================================================
// NTE Character Detail
// ============================================================

function NteCharacterDetail({ char, locale }: { char: NteCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.nte;
  const imageUrl = getNteCharacterImage(char);
  const builds = getBuildsForCharacter(char.id);
  const charName = getNteCharacterName(char, locale);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getNteCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/nte/characters/${char.id}`,
  };

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('nte', charName, locale)) }} />
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={getNteCharacterName(char, locale)}
            element={char.attribute}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {getNteCharacterName(char, locale)}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="nte" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: NTE_ELEMENT_COLORS[char.attribute] || '#888' }}>
              {NTE_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>{char.rank}-Rank</span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">{locale === 'zh' ? char.role : char.roleEn}</span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">{locale === 'zh' ? char.weapon : char.weaponEn}</span>
            {char.tierRank && <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>{char.tierRank}</span>}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">{getNteCharacterDescription(char, locale)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            {char.faction && <span>{locale === 'zh' ? '阵营' : 'Faction'}: {char.faction}</span>}
            {char.cvZh && <span>CV: {locale === 'zh' ? char.cvZh : locale === 'ja' ? (char.cvJp || char.cvJpEn || '') : (char.cvEn || '')}</span>}
            {char.acquisitionMethod && (
              <span>{locale === 'zh' ? '获取方式' : 'Acquisition'}: {char.acquisitionMethod === 'limited-banner' ? (locale === 'zh' ? '限定祈愿' : 'Limited Banner') : char.acquisitionMethod === 'standard' ? (locale === 'zh' ? '常驻祈愿' : 'Standard Banner') : char.acquisitionMethod === 'free' ? (locale === 'zh' ? '免费获取' : 'Free') : char.acquisitionMethod}</span>
            )}
          </div>
          {char.tierReason && <p className="mt-3 text-sm text-game-primary">{getNteCharacterTierReason(char, locale)}</p>}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={locale === 'zh' ? char.skills.normalAttack.name : char.skills.normalAttack.nameEn} desc={locale === 'zh' ? char.skills.normalAttack.description : char.skills.normalAttack.descriptionEn} label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={locale === 'zh' ? char.skills.skill.name : char.skills.skill.nameEn} desc={locale === 'zh' ? char.skills.skill.description : char.skills.skill.descriptionEn} label={locale === 'zh' ? '战技' : 'Skill'} extra={[char.skills.skill.cooldown, char.skills.skill.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={locale === 'zh' ? char.skills.ultimate.name : char.skills.ultimate.nameEn} desc={locale === 'zh' ? char.skills.ultimate.description : char.skills.ultimate.descriptionEn} label={locale === 'zh' ? '终结技' : 'Ultimate'} extra={char.skills.ultimate.cost} />
          {char.skills.passives?.map((p, i) => (
            <SkillItem key={i} name={locale === 'zh' ? p.name : p.nameEn} desc={locale === 'zh' ? p.description : p.descriptionEn} label={`${locale === 'zh' ? '被动' : 'Passive'} ${i + 1}`} />
          ))}
          {char.skills.qte?.name && <SkillItem name={locale === 'zh' ? (char.skills.qte.name ?? '') : (char.skills.qte.nameEn ?? '')} desc={locale === 'zh' ? (char.skills.qte.description ?? '') : (char.skills.qte.descriptionEn ?? '')} label="QTE" />}
        </div>
      </Section>

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRow label={locale === 'zh' ? '最佳弧盘' : 'Best Arc'} value={locale === 'zh' ? char.recommendedBuild.bestWeapon : char.recommendedBuild.bestWeaponEn} />
          {char.recommendedBuild.alternativeWeapons.length > 0 && <BuildRow label={locale === 'zh' ? '备选' : 'Alternatives'} value={char.recommendedBuild.alternativeWeapons.join(', ')} />}
          <BuildRow label={locale === 'zh' ? '光盘套装' : 'Disk Set'} value={locale === 'zh' ? char.recommendedBuild.bestDiskSet : char.recommendedBuild.bestDiskSetEn} />
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'} value={Object.values(locale === 'zh' ? char.recommendedBuild.mainStats : char.recommendedBuild.mainStatsEn).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'} value={(locale === 'zh' ? char.recommendedBuild.subStatPriority : char.recommendedBuild.subStatPriorityEn).join(' > ')} />
        </div>
      </Section>

      {builds && builds.builds.length > 0 && (
        <Section title={locale === 'zh' ? '详细配装' : locale === 'ja' ? '詳細ビルド' : 'Detailed Builds'}>
          <div className="space-y-4">
            {builds.builds.map((b) => (
              <div key={b.id} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{locale === 'zh' ? b.name : b.nameEn}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{locale === 'zh' ? b.description : b.descriptionEn}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-game-surface-alt px-2 py-0.5">{locale === 'zh' ? '主属性' : 'Main'}: {locale === 'zh' ? b.mainStat : b.mainStatEn}</span>
                  <span className="rounded bg-game-surface-alt px-2 py-0.5">{locale === 'zh' ? '副属性' : 'Sub'}: {(locale === 'zh' ? b.subStats : b.subStatsEn).join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめパーティ' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{locale === 'zh' ? team.name : team.nameEn}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{locale === 'zh' ? team.description : team.descriptionEn}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => { const member = getNteCharacterById(memberId); return member ? (<Link key={memberId} href={`/nte/characters/${memberId}` as '/'} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary hover:text-game-accent">{getNteCharacterName(member, locale)}</Link>) : (<span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>); })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(() => { const charMats = getMaterialsForCharacter(char.id); if (!charMats) return null; return (
        <Section title={locale === 'zh' ? '养成材料' : locale === 'ja' ? '育成素材' : 'Ascension Materials'}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-game-border text-left text-game-text-muted"><th className="pb-2 pr-4">{locale === 'zh' ? '等级' : 'Level'}</th><th className="pb-2">{locale === 'zh' ? '材料' : 'Materials'}</th></tr></thead><tbody>
            {charMats.levelingMaterials.map((row) => (<tr key={row.levelRange} className="border-b border-game-border/50"><td className="py-2 pr-4 font-medium text-game-text">{row.levelRange}</td><td className="py-2"><div className="flex flex-wrap gap-2">{row.materials.map((m) => { const mat = getNteMaterialById(m.id); return (<span key={m.id} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{mat ? getNteMaterialName(mat, locale) : m.id} ×{m.quantity}</span>); })}</div></td></tr>))}
          </tbody></table></div>
        </Section>); })()}

      {char.faq && char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((faqItem, i) => (<details key={i} className="group rounded-lg border border-game-border bg-game-surface"><summary className="cursor-pointer px-4 py-3 font-medium text-game-text group-hover:text-game-primary">{locale === 'zh' ? faqItem.questionZh : faqItem.question}</summary><div className="border-t border-game-border px-4 py-3 text-sm text-game-text-muted">{locale === 'zh' ? faqItem.answerZh : faqItem.answer}</div></details>))}
          </div>
        </Section>
      )}

      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => { const rel = getNteCharacterById(relId); return rel ? (<Link key={relId} href={`/nte/characters/${relId}` as '/'} className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text hover:border-game-primary hover:text-game-primary">{getNteCharacterName(rel, locale)}</Link>) : null; })}
          </div>
        </Section>
      )}

      <div className="border-t border-game-border pt-4">
        <Link href="/nte/characters" className="text-sm text-game-primary hover:text-game-accent">{locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}</Link>
      </div>
    </div>
  );
}

// ============================================================
// Wuthering Waves Character Detail
// ============================================================

const WUWA_ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};

const WUWA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  glacio: { zh: '冷凝', en: 'Glacio', ja: '氷凝' },
  fusion: { zh: '热熔', en: 'Fusion', ja: '融合' },
  electro: { zh: '导电', en: 'Electro', ja: '導電' },
  aero: { zh: '气动', en: 'Aero', ja: '気動' },
  spectro: { zh: '衍射', en: 'Spectro', ja: '回折' },
  havoc: { zh: '湮灭', en: 'Havoc', ja: '壊滅' },
};

const WUWA_WEAPON_LABELS: Record<string, Record<string, string>> = {
  broadblade: { zh: '大刃', en: 'Broadblade', ja: '大剣' },
  sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
};

function WuWaCharacterDetail({ char, locale }: { char: WuWaCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.wuwa;
  const imageUrl = getWuWaCharacterImage(char);
  const elementColor = WUWA_ELEMENT_COLORS[char.element] || '#888';
  const elementName = WUWA_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
  const weaponLabel = WUWA_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;
  const charName = getWuWaCharacterName(char, locale);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getWuWaCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/wuwa/characters/${char.id}`,
  };

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('wuwa', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/wuwa" className="hover:text-game-primary transition-colors">{GAMES.wuwa.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/wuwa/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.element}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="wuwa" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {char.rarity}★
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {weaponLabel}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getWuWaCharacterDescription(char, locale)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            {char.releaseVersion && <span>{locale === 'zh' ? '版本' : 'Version'}: {char.releaseVersion}</span>}
            {char.voiceActors?.cn && <span>{locale === 'zh' ? '中配' : 'CV(CN)'}: {char.voiceActors.cn}</span>}
            {char.voiceActors?.jp && <span>{locale === 'zh' ? '日配' : 'CV(JP)'}: {char.voiceActors.jp}</span>}
            {char.voiceActors?.en && <span>{locale === 'zh' ? '英配' : 'CV(EN)'}: {char.voiceActors.en}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <Section title={locale === 'zh' ? '基础属性 (Lv.90)' : locale === 'ja' ? '基礎ステータス (Lv.90)' : 'Base Stats (Lv.90)'}>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <StatCard label="HP" value={char.stats.hp} />
          <StatCard label="ATK" value={char.stats.atk} />
          <StatCard label="DEF" value={char.stats.def} />
          <StatCard label={locale === 'zh' ? '能量' : 'Energy'} value={char.stats.energy} />
          <StatCard label="CRIT Rate" value={`${(char.stats.critRate * 100).toFixed(1)}%`} />
          <StatCard label="CRIT DMG" value={`${(char.stats.critDmg * 100).toFixed(1)}%`} />
        </div>
      </Section>

      {/* Skills */}
      {char.skills && (
        <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
          <div className="space-y-3">
            <SkillItem name={localeStr(char.skills.basicAtk.name, char.skills.basicAtk.nameEn, locale)}
              desc={localeStr(char.skills.basicAtk.description, char.skills.basicAtk.descriptionEn, locale)}
              label={locale === 'zh' ? '普攻' : 'Basic Attack'} />
            <SkillItem name={localeStr(char.skills.resonanceSkill.name, char.skills.resonanceSkill.nameEn, locale)}
              desc={localeStr(char.skills.resonanceSkill.description, char.skills.resonanceSkill.descriptionEn, locale)}
              label={locale === 'zh' ? '共鸣技能' : 'Resonance Skill'}
              extra={char.skills.resonanceSkill.cooldown} />
            <SkillItem name={localeStr(char.skills.resonanceLiberation.name, char.skills.resonanceLiberation.nameEn, locale)}
              desc={localeStr(char.skills.resonanceLiberation.description, char.skills.resonanceLiberation.descriptionEn, locale)}
              label={locale === 'zh' ? '共鸣解放' : 'Resonance Liberation'}
              extra={char.skills.resonanceLiberation.cooldown} />
            <SkillItem name={localeStr(char.skills.forteCircuit.name, char.skills.forteCircuit.nameEn, locale)}
              desc={localeStr(char.skills.forteCircuit.description, char.skills.forteCircuit.descriptionEn, locale)}
              label={locale === 'zh' ? '固有技能' : 'Forte Circuit'} />
            <SkillItem name={localeStr(char.skills.introSkill.name, char.skills.introSkill.nameEn, locale)}
              desc={localeStr(char.skills.introSkill.description, char.skills.introSkill.descriptionEn, locale)}
              label={locale === 'zh' ? '变奏技能' : 'Intro Skill'} />
            <SkillItem name={localeStr(char.skills.outroSkill.name, char.skills.outroSkill.nameEn, locale)}
              desc={localeStr(char.skills.outroSkill.description, char.skills.outroSkill.descriptionEn, locale)}
              label={locale === 'zh' ? '延奏技能' : 'Outro Skill'} />
          </div>
        </Section>
      )}

      {/* Sequences */}
      {char.sequences && char.sequences.length > 0 && (
        <Section title={locale === 'zh' ? '共鸣链' : locale === 'ja' ? '共鳴鎖' : 'Resonance Chain'}>
          <div className="space-y-3">
            {char.sequences.map((seq) => (
              <details key={seq.level} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3">
                  <span className="mr-2 text-xs text-game-primary">[S{seq.level}]</span>
                  <span className="font-medium text-game-text group-hover:text-game-primary">{localeStr(seq.name, seq.nameEn, locale)}</span>
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(seq.description, seq.descriptionEn, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Minor Fortes */}
      {char.minorFortes && char.minorFortes.length > 0 && (
        <Section title={locale === 'zh' ? '固有技能加成' : locale === 'ja' ? '固有スキルボーナス' : 'Minor Fortes'}>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {char.minorFortes.map((forte, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-3">
                <span className="text-sm font-semibold text-game-text">{forte.stat}</span>
                <span className="ml-2 text-sm text-game-primary">{forte.value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// ZZZ Character Detail
// ============================================================

function ZzzCharacterDetail({ char, locale }: { char: ZzzCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.zzz;
  const imageUrl = getZzzCharacterImage(char);
  const elementColor = ZZZ_ELEMENT_COLORS[char.attribute] || '#888';
  const elementName = ZZZ_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute;
  const specialtyLabel = ZZZ_SPECIALTY_LABELS[char.specialtyEn]?.[locale] ?? char.specialtyEn;
  const charName = getZzzCharacterName(char, locale);
  const build = char.recommendedBuild;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getZzzCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/zzz/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: locale === 'zh' ? f.questionZh : f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: locale === 'zh' ? f.answerZh : f.answer,
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('zzz', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/zzz" className="hover:text-game-primary transition-colors">{GAMES.zzz.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/zzz/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.attribute}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="zzz" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {char.rank}-Rank
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {specialtyLabel}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getZzzCharacterDescription(char, locale)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            <span>{locale === 'zh' ? '阵营' : 'Faction'}: {locale === 'zh' ? char.faction : char.factionEn}</span>
            <span>{locale === 'zh' ? '攻击类型' : 'Attack Type'}: {locale === 'zh' ? char.attackType : char.attackTypeEn}</span>
            {char.cvZh && <span>CV: {locale === 'zh' ? char.cvZh : locale === 'ja' ? (char.cvJp || '') : (char.cvEn || '')}</span>}
            <span>
              {locale === 'zh' ? '获取方式' : 'Acquisition'}:{' '}
              {char.acquisitionMethod === 'limited-banner' ? (locale === 'zh' ? '限定卡池' : 'Limited Banner') :
               char.acquisitionMethod === 'standard' ? (locale === 'zh' ? '常驻卡池' : 'Standard Banner') :
               char.acquisitionMethod === 'free' ? (locale === 'zh' ? '免费获取' : 'Free') : char.acquisitionMethod}
            </span>
          </div>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getZzzCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={localeStr(char.skills.normalAttack.name, char.skills.normalAttack.nameEn, locale)}
            desc={localeStr(char.skills.normalAttack.description, char.skills.normalAttack.descriptionEn, locale)}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={localeStr(char.skills.dodge.name, char.skills.dodge.nameEn, locale)}
            desc={localeStr(char.skills.dodge.description, char.skills.dodge.descriptionEn, locale)}
            label={locale === 'zh' ? '闪避' : 'Dodge'} />
          <SkillItem name={localeStr(char.skills.assist.name, char.skills.assist.nameEn, locale)}
            desc={localeStr(char.skills.assist.description, char.skills.assist.descriptionEn, locale)}
            label={locale === 'zh' ? '支援' : 'Assist'} />
          <SkillItem name={localeStr(char.skills.special.name, char.skills.special.nameEn, locale)}
            desc={localeStr(char.skills.special.description, char.skills.special.descriptionEn, locale)}
            label={locale === 'zh' ? '特殊技' : 'Special Skill'}
            extra={[char.skills.special.cooldown, char.skills.special.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={localeStr(char.skills.ultimate.name, char.skills.ultimate.nameEn, locale)}
            desc={localeStr(char.skills.ultimate.description, char.skills.ultimate.descriptionEn, locale)}
            label={locale === 'zh' ? '终结技' : 'Ultimate'}
            extra={char.skills.ultimate.cost} />
          <SkillItem name={localeStr(char.skills.chain.name, char.skills.chain.nameEn, locale)}
            desc={localeStr(char.skills.chain.description, char.skills.chain.descriptionEn, locale)}
            label={locale === 'zh' ? '连携技' : 'Chain Attack'} />
          <SkillItem name={localeStr(char.skills.corePassive.name, char.skills.corePassive.nameEn, locale)}
            desc={localeStr(char.skills.corePassive.description, char.skills.corePassive.descriptionEn, locale)}
            label={locale === 'zh' ? '核心被动' : 'Core Passive'} />
          {char.skills.additionalPassives?.map((p, i) => (
            <SkillItem key={i} name={localeStr(p.name, p.nameEn, locale)}
              desc={localeStr(p.description, p.descriptionEn, locale)}
              label={`${locale === 'zh' ? '额外被动' : 'Passive'} ${i + 1}`} />
          ))}
        </div>
      </Section>

      {/* Mindscape Cinema */}
      {char.mindscapeCinema && char.mindscapeCinema.length > 0 && (
        <Section title={locale === 'zh' ? '影画' : locale === 'ja' ? '影画' : 'Mindscape Cinema'}>
          <div className="space-y-3">
            {char.mindscapeCinema.map((mc) => (
              <details key={mc.level} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3">
                  <span className="mr-2 text-xs text-game-primary">[M{mc.level}]</span>
                  <span className="font-medium text-game-text group-hover:text-game-primary">{localeStr(mc.name, mc.nameEn, locale)}</span>
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(mc.description, mc.descriptionEn, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          {(() => {
            const bestWeaponName = localeStr(build.bestWeapon, build.bestWeaponEn, locale);
            const weaponMatch = zzzWeapons.find(w => w.name === build.bestWeapon || w.nameEn === build.bestWeaponEn);
            const altWeaponMatches = (build.alternativeWeapons ?? []).map(altName => {
              const match = zzzWeapons.find(w => w.name === altName || w.nameEn === altName);
              return match ? { name: localeStr(match.name, match.nameEn, locale), id: match.id } : { name: altName, id: null };
            });
            const discName = localeStr(build.bestDriveDisc, build.bestDriveDiscEn, locale);
            const discMatch = zzzDriveDiscs.find(d => d.name === build.bestDriveDisc || d.nameEn === build.bestDriveDiscEn);
            return (
              <>
                <BuildRowLink label={locale === 'zh' ? '最佳音擎' : 'Best W-Engine'}
                  value={bestWeaponName}
                  href={weaponMatch ? `/${locale}/zzz/weapons/${weaponMatch.id}` : undefined} />
                {(build.alternativeWeapons?.length ?? 0) > 0 && (
                  <div className="flex gap-2">
                    <span className="w-24 shrink-0 text-game-text-muted">{locale === 'zh' ? '备选音擎' : 'Alt W-Engines'}</span>
                    <span className="text-game-text">
                      {altWeaponMatches.map((aw, i) => (
                        <span key={i}>
                          {aw.id ? (
                            <Link href={`/${locale}/zzz/weapons/${aw.id}` as '/'} className="text-game-primary hover:text-game-accent transition-colors">{aw.name}</Link>
                          ) : aw.name}
                          {i < altWeaponMatches.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                <BuildRowLink label={locale === 'zh' ? '驱动盘套装' : 'Drive Disc Set'}
                  value={discName}
                  href={discMatch ? `/${locale}/zzz/drive-discs/${discMatch.id}` : undefined} />
                <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'}
                  value={Object.values(locale === 'zh' ? build.mainStats ?? {} : build.mainStatsEn ?? {}).join(' / ')} />
                <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'}
                  value={(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn)?.join(' > ')} />
              </>
            );
          })()}
        </div>
      </Section>

      {/* Team Comps */}
      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{localeStr(team.name, team.nameEn, locale)}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{localeStr(team.description, team.descriptionEn, locale)}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => {
                    const member = getZzzCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/zzz/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getZzzCharacterName(member, locale)}
                      </Link>
                    ) : (
                      <span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((item, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(item.questionZh, item.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(item.answerZh, item.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getZzzCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/zzz/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getZzzCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/zzz/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Guihuan Character Detail
// ============================================================

function GuihuanCharacterDetail({ char, locale }: { char: GuihuanCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.guihuan;
  const imageUrl = getGuihuanCharacterImage(char);
  const elementColor = GUIHUAN_ELEMENT_COLORS[char.element] || '#888';
  const elementName = GUIHUAN_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
  const charName = getGuihuanCharacterName(char, locale);
  const build = char.recommendedBuild;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getGuihuanCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/guihuan/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: localeStr(f.questionZh, f.question, locale),
      acceptedAnswer: {
        '@type': 'Answer',
        text: localeStr(f.answerZh, f.answer, locale),
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('guihuan', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/guihuan" className="hover:text-game-primary transition-colors">{GAMES.guihuan.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/guihuan/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.element}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="guihuan" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {localeStr(char.role, char.roleEn, locale)}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getGuihuanCharacterDescription(char, locale)}
          </p>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getGuihuanCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={localeStr(char.skills.normalAttack.name, char.skills.normalAttack.nameEn, locale)}
            desc={localeStr(char.skills.normalAttack.description, char.skills.normalAttack.descriptionEn, locale)}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={localeStr(char.skills.skill.name, char.skills.skill.nameEn, locale)}
            desc={localeStr(char.skills.skill.description, char.skills.skill.descriptionEn, locale)}
            label={locale === 'zh' ? '战技' : 'Skill'}
            extra={[char.skills.skill.cooldown, char.skills.skill.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={localeStr(char.skills.ultimate.name, char.skills.ultimate.nameEn, locale)}
            desc={localeStr(char.skills.ultimate.description, char.skills.ultimate.descriptionEn, locale)}
            label={locale === 'zh' ? '终结技' : 'Ultimate'}
            extra={char.skills.ultimate.cost} />
          <SkillItem name={localeStr(char.skills.passive.name, char.skills.passive.nameEn, locale)}
            desc={localeStr(char.skills.passive.description, char.skills.passive.descriptionEn, locale)}
            label={locale === 'zh' ? '被动' : 'Passive'} />
          {char.skills.additionalPassives?.map((p, i) => (
            <SkillItem key={i} name={localeStr(p.name, p.nameEn, locale)}
              desc={localeStr(p.description, p.descriptionEn, locale)}
              label={`${locale === 'zh' ? '额外被动' : 'Passive'} ${i + 1}`} />
          ))}
        </div>
      </Section>

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRow label={locale === 'zh' ? '最佳武器' : 'Best Weapon'}
            value={localeStr(build.bestWeapon, build.bestWeaponEn, locale)} />
          {(build.alternativeWeapons?.length ?? 0) > 0 && (
            <BuildRow label={locale === 'zh' ? '备选武器' : 'Alt Weapons'}
              value={build.alternativeWeapons.join(', ')} />
          )}
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'}
            value={Object.values(locale === 'zh' ? build.mainStats ?? {} : build.mainStatsEn ?? {}).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'}
            value={(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn)?.join(' > ')} />
        </div>
      </Section>

      {/* Team Comps */}
      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{localeStr(team.name, team.nameEn, locale)}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{localeStr(team.description, team.descriptionEn, locale)}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => {
                    const member = getGuihuanCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/guihuan/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getGuihuanCharacterName(member, locale)}
                      </Link>
                    ) : (
                      <span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((item, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(item.questionZh, item.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(item.answerZh, item.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getGuihuanCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/guihuan/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getGuihuanCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/guihuan/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Ananta Character Detail
// ============================================================

const ANANTA_ELEMENT_COLORS: Record<string, string> = {
  chaos: '#8b5cf6', psyche: '#06b6d4', spark: '#f59e0b',
  surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
};

const ANANTA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  chaos: { zh: '混沌', en: 'Chaos', ja: 'カオス' },
  psyche: { zh: '精神', en: 'Psyche', ja: 'サイキ' },
  spark: { zh: '火花', en: 'Spark', ja: 'スパーク' },
  surge: { zh: '涌流', en: 'Surge', ja: 'サージ' },
  bloom: { zh: '绽放', en: 'Bloom', ja: 'ブルーム' },
  void: { zh: '虚空', en: 'Void', ja: 'ヴォイド' },
};

function AnantaCharacterDetail({ char, locale }: { char: AnantaCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.ananta;
  const imageUrl = getAnantaCharacterImage(char);
  const elementColor = ANANTA_ELEMENT_COLORS[char.element] || '#888';
  const elementName = ANANTA_ELEMENT_NAMES[char.element]?.[locale] ?? char.elementEn;
  const charName = getAnantaCharacterName(char, locale);
  const build = char.recommendedBuild;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getAnantaCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/ananta/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: localeStr(f.questionZh, f.question, locale),
      acceptedAnswer: {
        '@type': 'Answer',
        text: localeStr(f.answerZh, f.answer, locale),
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('ananta', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/ananta" className="hover:text-game-primary transition-colors">{GAMES.ananta.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/ananta/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.element}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="ananta" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {localeStr(char.role, char.roleEn, locale)}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getAnantaCharacterDescription(char, locale)}
          </p>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getAnantaCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={localeStr(char.skills.normalAttack.name, char.skills.normalAttack.nameEn, locale)}
            desc={localeStr(char.skills.normalAttack.description, char.skills.normalAttack.descriptionEn, locale)}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={localeStr(char.skills.skill.name, char.skills.skill.nameEn, locale)}
            desc={localeStr(char.skills.skill.description, char.skills.skill.descriptionEn, locale)}
            label={locale === 'zh' ? '战技' : 'Skill'}
            extra={[char.skills.skill.cooldown, char.skills.skill.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={localeStr(char.skills.ultimate.name, char.skills.ultimate.nameEn, locale)}
            desc={localeStr(char.skills.ultimate.description, char.skills.ultimate.descriptionEn, locale)}
            label={locale === 'zh' ? '终结技' : 'Ultimate'}
            extra={char.skills.ultimate.cost} />
          <SkillItem name={localeStr(char.skills.passive.name, char.skills.passive.nameEn, locale)}
            desc={localeStr(char.skills.passive.description, char.skills.passive.descriptionEn, locale)}
            label={locale === 'zh' ? '被动' : 'Passive'} />
          {char.skills.additionalPassives?.map((p, i) => (
            <SkillItem key={i} name={localeStr(p.name, p.nameEn, locale)}
              desc={localeStr(p.description, p.descriptionEn, locale)}
              label={`${locale === 'zh' ? '额外被动' : 'Passive'} ${i + 1}`} />
          ))}
        </div>
      </Section>

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRow label={locale === 'zh' ? '最佳武器' : 'Best Weapon'}
            value={localeStr(build.bestWeapon, build.bestWeaponEn, locale)} />
          {(build.alternativeWeapons?.length ?? 0) > 0 && (
            <BuildRow label={locale === 'zh' ? '备选武器' : 'Alt Weapons'}
              value={build.alternativeWeapons.join(', ')} />
          )}
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'}
            value={Object.values(locale === 'zh' ? build.mainStats ?? {} : build.mainStatsEn ?? {}).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'}
            value={(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn)?.join(' > ')} />
        </div>
      </Section>

      {/* Team Comps */}
      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{localeStr(team.name, team.nameEn, locale)}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{localeStr(team.description, team.descriptionEn, locale)}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => {
                    const member = getAnantaCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/ananta/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getAnantaCharacterName(member, locale)}
                      </Link>
                    ) : (
                      <span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((item, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(item.questionZh, item.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(item.answerZh, item.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getAnantaCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/ananta/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getAnantaCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/ananta/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-3">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="text-lg font-bold text-game-text">{value}</div>
    </div>
  );
}

// --- Helper Components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-game-primary">{title}</h2>
      {children}
    </section>
  );
}

function SkillItem({ name, desc, label, extra }: { name: string; desc: string; label: string; extra?: string }) {
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

function BuildRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-game-text-muted">{label}</span>
      <span className="text-game-text">{value}</span>
    </div>
  );
}

function BuildRowLink({ label, value, href }: { label: string; value: string; href?: string }) {
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

// ============================================================
// Endfield Character Detail
// ============================================================

function EndfieldCharacterDetail({ char, locale }: { char: EndfieldCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.endfield;
  const imageUrl = getEndfieldCharacterImage(char);
  const elementColor = ENDFIELD_ELEMENT_COLORS[char.element] || '#888';
  const elementName = ENDFIELD_ELEMENT_NAMES[char.element]?.[locale] ?? char.elementEn;
  const charName = getEndfieldCharacterName(char, locale);
  const build = char.recommendedBuild;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getEndfieldCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/endfield/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: localeStr(f.questionZh, f.question, locale),
      acceptedAnswer: {
        '@type': 'Answer',
        text: localeStr(f.answerZh, f.answer, locale),
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('endfield', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/endfield" className="hover:text-game-primary transition-colors">{GAMES.endfield.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/endfield/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.element}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="endfield" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {localeStr(char.profession, char.professionEn, locale)}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getEndfieldCharacterDescription(char, locale)}
          </p>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getEndfieldCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Stats Progression Table */}
      {char.stats && char.stats.hp.length > 0 && (
        <Section title={locale === 'zh' ? '属性成长' : locale === 'ja' ? 'ステータス成長' : 'Stats Progression'}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-game-border">
                  <th className="px-3 py-2 text-left text-game-text-muted"></th>
                  {(char.stats.levels ?? ['Lv.1', 'E1', 'E2', 'E3', 'E4', 'E4 Max']).map((lvl) => (
                    <th key={lvl} className="px-3 py-2 text-center text-game-text-muted whitespace-nowrap">{lvl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'HP', values: char.stats.hp },
                  { key: 'ATK', values: char.stats.atk },
                  { key: 'STR', values: char.stats.str },
                  { key: 'AGL', values: char.stats.agl },
                  { key: 'INT', values: char.stats.int },
                  { key: 'WIL', values: char.stats.wil },
                ].map(({ key, values }) => (
                  <tr key={key} className="border-b border-game-border/50">
                    <td className="px-3 py-2 font-medium text-game-text">{key}</td>
                    {values.map((v: number, i: number) => (
                      <td key={i} className="px-3 py-2 text-center text-game-text">{key === 'HP' || key === 'ATK' ? Math.round(v) : v.toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-game-border/50">
                  <td className="px-3 py-2 font-medium text-game-text">CRIT Rate</td>
                  <td colSpan={char.stats.hp.length} className="px-3 py-2 text-center text-game-text">{(char.stats.critRate * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Elite Promotion Costs */}
      {char.eliteCosts && char.eliteCosts.length > 0 && (
        <Section title={locale === 'zh' ? '精英晋升材料' : locale === 'ja' ? 'エリート昇進素材' : 'Elite Promotion Costs'}>
          <div className="space-y-3">
            {char.eliteCosts.map((tier) => (
              <div key={tier.elite} className="rounded-lg border border-game-border bg-game-surface p-3">
                <h4 className="mb-2 font-medium text-game-text">
                  {locale === 'zh' ? `精英${tier.elite}` : `Elite ${tier.elite}`}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tier.materials.map((mat, i) => (
                    <span key={i} className="rounded bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">
                      {mat.name} x{mat.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Potentials */}
      {char.potentials && char.potentials.length > 0 && (
        <Section title={locale === 'zh' ? '潜能' : locale === 'ja' ? 'ポテンシャル' : 'Potentials'}>
          <div className="space-y-2">
            {char.potentials.map((pot, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-3">
                <div className="mb-1 text-sm font-medium text-game-text">
                  <span className="mr-2 text-game-primary">P{i + 1}</span>
                  {pot.name}
                </div>
                <div className="text-sm text-game-text-muted">{pot.descriptionEn}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skill Upgrade Materials */}
      {(() => {
        const charMats = getEndfieldMaterialsForCharacter(char.id);
        if (!charMats || charMats.talentMaterials.length === 0) return null;
        return (
          <Section title={locale === 'zh' ? '技能升级材料' : locale === 'ja' ? 'スキル強化素材' : 'Skill Upgrade Materials'}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-game-border">
                    <th className="px-3 py-2 text-left text-game-text-muted">{locale === 'zh' ? '等级' : 'Rank'}</th>
                    <th className="px-3 py-2 text-left text-game-text-muted">{locale === 'zh' ? '材料' : 'Materials'}</th>
                  </tr>
                </thead>
                <tbody>
                  {charMats.talentMaterials.map((tier, i) => (
                    <tr key={i} className="border-b border-game-border/50">
                      <td className="px-3 py-2 font-medium text-game-text whitespace-nowrap">{tier.talentLevel}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {tier.materials.map((mat, j) => {
                            const matInfo = getEndfieldMaterialById(mat.materialId);
                            return (
                              <span key={j} className="inline-flex items-center gap-1.5 rounded bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">
                                {matInfo && (
                                  <img src={`/images/endfield/materials/${matInfo.id}.webp`} alt="" className="h-4 w-4 rounded" loading="lazy" />
                                )}
                                {matInfo ? (locale === 'zh' ? matInfo.name : matInfo.nameEn) : mat.materialId} x{mat.quantity}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })()}

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={localeStr(char.skills.normalAttack.name, char.skills.normalAttack.nameEn, locale)}
            desc={localeStr(char.skills.normalAttack.description, char.skills.normalAttack.descriptionEn, locale)}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={localeStr(char.skills.skill.name, char.skills.skill.nameEn, locale)}
            desc={localeStr(char.skills.skill.description, char.skills.skill.descriptionEn, locale)}
            label={locale === 'zh' ? '战技' : 'Skill'}
            extra={[char.skills.skill.cooldown, char.skills.skill.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={localeStr(char.skills.ultimate.name, char.skills.ultimate.nameEn, locale)}
            desc={localeStr(char.skills.ultimate.description, char.skills.ultimate.descriptionEn, locale)}
            label={locale === 'zh' ? '终结技' : 'Ultimate'}
            extra={char.skills.ultimate.cost} />
          <SkillItem name={localeStr(char.skills.passive.name, char.skills.passive.nameEn, locale)}
            desc={localeStr(char.skills.passive.description, char.skills.passive.descriptionEn, locale)}
            label={locale === 'zh' ? '被动' : 'Passive'} />
          {char.skills.additionalPassives?.map((p, i) => (
            <SkillItem key={i} name={localeStr(p.name, p.nameEn, locale)}
              desc={localeStr(p.description, p.descriptionEn, locale)}
              label={`${locale === 'zh' ? '额外被动' : 'Passive'} ${i + 1}`} />
          ))}
        </div>
      </Section>

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRow label={locale === 'zh' ? '最佳武器' : 'Best Weapon'}
            value={localeStr(build.bestWeapon, build.bestWeaponEn, locale)} />
          {(build.alternativeWeapons?.length ?? 0) > 0 && (
            <BuildRow label={locale === 'zh' ? '备选武器' : 'Alt Weapons'}
              value={build.alternativeWeapons.join(', ')} />
          )}
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'}
            value={Object.values(locale === 'zh' ? build.mainStats ?? {} : build.mainStatsEn ?? {}).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'}
            value={(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn)?.join(' > ')} />
        </div>
      </Section>

      {/* Team Comps */}
      {char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Team Compositions'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                <h4 className="mb-1 font-semibold text-game-text">{localeStr(team.name, team.nameEn, locale)}</h4>
                <p className="mb-2 text-sm text-game-text-muted">{localeStr(team.description, team.descriptionEn, locale)}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.map((memberId) => {
                    const member = getEndfieldCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/endfield/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getEndfieldCharacterName(member, locale)}
                      </Link>
                    ) : (
                      <span key={memberId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{memberId}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-3">
            {char.faq.map((item, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(item.questionZh, item.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(item.answerZh, item.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Related Characters */}
      {char.relatedCharacters?.length > 0 && (
        <Section title={locale === 'zh' ? '相关角色' : locale === 'ja' ? '関連キャラ' : 'Related Characters'}>
          <div className="flex flex-wrap gap-2">
            {char.relatedCharacters.map((relId) => {
              const rel = getEndfieldCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/endfield/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getEndfieldCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/endfield/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Sea Character Detail
// ============================================================

function SeaCharacterDetail({ char, locale }: { char: SeaCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.sea;
  const imageUrl = getSeaCharacterImage(char);
  const elementColor = SEA_ELEMENT_COLORS[char.attribute] || '#888';
  const elementName = SEA_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attributeEn;
  const charName = getSeaCharacterName(char, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getSeaCharacterDescription(char, locale).slice(0, 300),
    image: imageUrl,
    url: `https://gachia.com/${locale}/sea/characters/${char.id}`,
  };

  const faqJsonLd = char.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: char.faq.map((f) => ({
      '@type': 'Question',
      name: localeStr(f.questionZh, f.question, locale),
      acceptedAnswer: {
        '@type': 'Answer',
        text: localeStr(f.answerZh, f.answer, locale),
      },
    })),
  } : null;

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd('sea', charName, locale)) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/sea" className="hover:text-game-primary transition-colors">{GAMES.sea.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/sea/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.attribute}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId="sea" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {localeStr(char.role, char.roleEn, locale)}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getSeaCharacterDescription(char, locale)}
          </p>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getSeaCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="grid gap-4 lg:grid-cols-2">
          {char.skills.passive && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {localeStr(char.skills.passive.name, char.skills.passive.nameEn, locale)}
              </h3>
              <p className="text-sm text-game-text-muted">
                {localeStr(char.skills.passive.description, char.skills.passive.descriptionEn, locale)}
              </p>
            </div>
          )}
          {char.skills.signature && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {localeStr(char.skills.signature.name, char.skills.signature.nameEn, locale)}
              </h3>
              <p className="text-sm text-game-text-muted">
                {localeStr(char.skills.signature.description, char.skills.signature.descriptionEn, locale)}
              </p>
            </div>
          )}
          {char.skills.personal && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {localeStr(char.skills.personal.name, char.skills.personal.nameEn, locale)}
              </h3>
              <p className="text-sm text-game-text-muted">
                {localeStr(char.skills.personal.description, char.skills.personal.descriptionEn, locale)}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Team Comps */}
      {char.teamComps && char.teamComps.length > 0 && (
        <Section title={locale === 'zh' ? '推荐配队' : locale === 'ja' ? 'おすすめ編成' : 'Recommended Teams'}>
          <div className="space-y-3">
            {char.teamComps.map((team, i) => {
              const members = team.members
                .map((mid) => getSeaCharacterById(mid))
                .filter((m): m is NonNullable<typeof m> => Boolean(m));
              return (
                <div key={i} className="rounded-lg border border-game-border bg-game-surface p-4">
                  <h3 className="mb-2 font-semibold text-game-text">
                    {localeStr(team.name, team.nameEn, locale)}
                  </h3>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {members.map((m) => (
                      <Link
                        key={m.id}
                        href={`/sea/characters/${m.id}`}
                        className="rounded-full border border-game-border bg-game-surface-alt px-2.5 py-0.5 text-xs text-game-text transition-colors hover:border-game-primary hover:text-game-primary"
                      >
                        {getSeaCharacterName(m, locale)}
                      </Link>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-game-text-muted">
                    {localeStr(team.description, team.descriptionEn, locale)}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* FAQ */}
      {char.faq.length > 0 && (
        <Section title={locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}>
          <div className="space-y-2">
            {char.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {localeStr(faqItem.questionZh, faqItem.question, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(faqItem.answerZh, faqItem.answer, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/sea/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}
