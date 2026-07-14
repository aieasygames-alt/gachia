import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  genshinWeapons, getGenshinWeaponById, getGenshinWeaponName, getGenshinWeaponEffect, getGenshinWeaponSource,
} from '@gachia/data/games/genshin/weapons';
import {
  starrailLightCones, getStarRailLightConeById, getStarRailLightConeName, getStarRailLightConeEffect, getStarRailLightConeSource,
} from '@gachia/data/games/starrail/weapons';
import {
  wuwaWeapons, getWuWaWeaponById, getWuWaWeaponName, getWuWaWeaponEffect, getWuWaWeaponSource,
} from '@gachia/data/games/wuwa/weapons';
import {
  nteWeapons, getNteWeaponById, getNteWeaponName, getNteWeaponEffect, getNteWeaponSource,
} from '@gachia/data/games/nte/weapons';
import {
  zzzWeapons, getZzzWeaponById, getZzzWeaponName, getZzzWeaponEffect, getZzzWeaponSource,
} from '@gachia/data/games/zzz/weapons';
import {
  guihuanWeapons, getGuihuanWeaponById, getGuihuanWeaponName, getGuihuanWeaponEffect, getGuihuanWeaponSource,
} from '@gachia/data/games/guihuan/weapons';
import {
  anantaWeapons, getAnantaWeaponById, getAnantaWeaponName, getAnantaWeaponEffect, getAnantaWeaponSource,
} from '@gachia/data/games/ananta/weapons';
import {
  endfieldWeapons, getEndfieldWeaponById, getEndfieldWeaponName, getEndfieldWeaponEffect, getEndfieldWeaponSource,
} from '@gachia/data/games/endfield/weapons';
import {
  skjhWeapons, getSkjhWeaponById, getSkjhWeaponName, getSkjhWeaponEffect, getSkjhWeaponSource,
} from '@gachia/data/games/skjh/weapons';
import { Link } from '@/lib/i18n/navigation';
import { buildWeaponJsonLd } from '@/lib/jsonld';

const RARITY_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

const GENSHIN_WEAPON_TYPE: Record<string, Record<string, string>> = {
  Sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  Claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  Polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  Bow: { zh: '弓', en: 'Bow', ja: '弓' },
  Catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const STARRAIL_PATH: Record<string, Record<string, string>> = {
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

const WUWA_WEAPON_TYPE: Record<string, Record<string, string>> = {
  Broadblade: { zh: '宽刃', en: 'Broadblade', ja: '広刃刀' },
  Sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  Pistols: { zh: '佩枪', en: 'Pistols', ja: '拳銃' },
  Gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '臂鎧' },
  Rectifier: { zh: '音感仪', en: 'Rectifier', ja: '音感儀' },
};

const NTE_WEAPON_TYPE: Record<string, Record<string, string>> = {
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
  liquid: { zh: '液体', en: 'Liquid', ja: 'リキッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: '合成' },
};

const SKJH_WEAPON_TYPE: Record<string, Record<string, string>> = {
  tool: { zh: '采集工具', en: 'Tool', ja: '採集道具' },
  melee: { zh: '近战武器', en: 'Melee', ja: '近接武器' },
  ranged: { zh: '远程武器', en: 'Ranged', ja: '遠距離武器' },
  skin: { zh: '外观奖励', en: 'Cosmetic', ja: '外観報酬' },
};

type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const WEAPON_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    {
      href: '/genshin/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把武器和适合它的角色对上', en: 'Match the weapon to the right characters', ja: '適性キャラを確認' },
    },
    {
      href: '/genshin/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器突破材料来源', en: 'Continue with ascension material sources', ja: '突破素材の入手先を確認' },
    },
    {
      href: '/genshin/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到版本与养成专题', en: 'Connect the weapon page to version and build guides', ja: '武器ページを版本・育成へ接続' },
    },
  ],
  starrail: [
    {
      href: '/starrail/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看谁最适合这把光锥', en: 'See which characters fit this light cone', ja: '相性キャラを確認' },
    },
    {
      href: '/starrail/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '补齐光锥升级材料和掉落来源', en: 'Review light cone upgrade materials and drop sources', ja: '強化素材と入手先を確認' },
    },
    {
      href: '/starrail/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看养成、卡池和版本攻略', en: 'Continue with build, banner, and version guides', ja: '育成・ガチャ・版本攻略へ' },
    },
  ],
  wuwa: [
    {
      href: '/wuwa/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把武器和适配角色串起来', en: 'Connect weapons with their best characters', ja: '武器と適性キャラを接続' },
    },
    {
      href: '/wuwa/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看突破材料和刷取路线', en: 'Continue with ascension materials and farming routes', ja: '突破素材と周回ルートを確認' },
    },
    {
      href: '/wuwa/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到版本和声骸专题', en: 'Connect the weapon page to version and echo guides', ja: '版本・声骸攻略へ接続' },
    },
  ],
  nte: [
    {
      href: '/nte/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先确认武器适配的角色', en: 'Check the characters this weapon suits', ja: '適性キャラを確認' },
    },
    {
      href: '/nte/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器升级材料', en: 'Continue with weapon upgrade materials', ja: '武器強化素材を確認' },
    },
    {
      href: '/nte/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到 Boss 和养成攻略', en: 'Connect the weapon page to boss and build guides', ja: 'ボス・育成攻略へ接続' },
    },
  ],
  zzz: [
    {
      href: '/zzz/characters',
      title: { zh: '看代理人图鉴', en: 'Browse agents', ja: 'エージェント図鑑へ' },
      description: { zh: '先看适配这把音擎的代理人', en: 'See which agents fit this W-Engine', ja: '適性エージェントを確認' },
    },
    {
      href: '/zzz/drive-discs',
      title: { zh: '看驱动盘图鉴', en: 'Browse drive discs', ja: 'ドライブディスクへ' },
      description: { zh: '把音擎和驱动盘配套思路补齐', en: 'Fill in the disc pairing logic', ja: '音擎とディスクの組み合わせを補完' },
    },
    {
      href: '/zzz/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看配队、版本和养成专题', en: 'Continue with team, version, and build guides', ja: '編成・版本・育成へ' },
    },
  ],
  guihuan: [
    {
      href: '/guihuan/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看这把武器适合谁', en: 'Check which characters suit this weapon', ja: '適性キャラを確認' },
    },
    {
      href: '/guihuan/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看培养材料和来源', en: 'Continue with upgrade materials and sources', ja: '育成素材と入手先を確認' },
    },
    {
      href: '/guihuan/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到系统和版本专题', en: 'Connect the weapon page to system and version guides', ja: '武器ページをシステム・版本へ接続' },
    },
  ],
  ananta: [
    {
      href: '/ananta/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先找最适合的使用者', en: 'Find the best users first', ja: '適性キャラを確認' },
    },
    {
      href: '/ananta/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器升级材料', en: 'Continue with weapon upgrade materials', ja: '武器強化素材を確認' },
    },
    {
      href: '/ananta/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到养成专题', en: 'Connect the weapon page to build guides', ja: '武器ページを育成攻略へ接続' },
    },
  ],
  endfield: [
    {
      href: '/endfield/characters',
      title: { zh: '看干员图鉴', en: 'Browse operators', ja: 'オペレーター図鑑へ' },
      description: { zh: '先看这把武器适合哪些干员', en: 'Check which operators suit this weapon', ja: '適性オペレーターを確認' },
    },
    {
      href: '/endfield/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看升级材料和获取地点', en: 'Continue with upgrade materials and sources', ja: '強化素材と入手先を確認' },
    },
    {
      href: '/endfield/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到测试与养成专题', en: 'Connect the weapon page to test and build guides', ja: '武器ページをテスト・育成へ接続' },
    },
  ],
  skjh: [
    {
      href: '/skjh/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先找最合适的使用者', en: 'Find the best users first', ja: '適性キャラを確認' },
    },
    {
      href: '/skjh/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器获取和强化路线', en: 'Continue with acquisition and upgrade paths', ja: '入手と強化ルートを確認' },
    },
    {
      href: '/skjh/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到专题攻略', en: 'Connect the weapon page to guide content', ja: '武器ページを攻略コンテンツへ接続' },
    },
  ],
};

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...genshinWeapons.map((w) => ({ lang, game: 'genshin', id: w.id })),
    ...starrailLightCones.map((w) => ({ lang, game: 'starrail', id: w.id })),
    ...wuwaWeapons.map((w) => ({ lang, game: 'wuwa', id: w.id })),
    ...nteWeapons.map((w) => ({ lang, game: 'nte', id: w.id })),
    ...zzzWeapons.map((w) => ({ lang, game: 'zzz', id: w.id })),
    ...guihuanWeapons.map((w) => ({ lang, game: 'guihuan', id: w.id })),
    ...anantaWeapons.map((w) => ({ lang, game: 'ananta', id: w.id })),
    ...endfieldWeapons.map((w) => ({ lang, game: 'endfield', id: w.id })),
    ...skjhWeapons.map((w) => ({ lang, game: 'skjh', id: w.id })),
  ]);
}

const BASE_URL = 'https://gachia.com';

type LocaleMeta = Partial<Record<SupportedLocale, { title: string; description: string }>>;

const WEAPON_META_OVERRIDES: Record<string, LocaleMeta> = {
  'genshin/sacrificial-jade': {
    en: {
      title: 'Sacrificial Jade Genshin: Stats, Best Users & Builds',
      description: 'Sacrificial Jade guide for Genshin Impact: 4-star Catalyst, CRIT Rate 36.8% at Lv.90, HP and EM passive, best users, and builds.',
    },
    zh: {
      title: '遗祀玉珑攻略：属性、适用角色与配装推荐',
      description: '原神遗祀玉珑属性解析：4星法器，满级暴击率36.8%，离场提升生命值与元素精通，查看适用角色和配装思路。',
    },
  },
  'genshin/jadefalls-splendor': {
    en: {
      title: "Jadefall's Splendor Genshin: Stats, Best Users & Build Tips",
      description: "Jadefall's Splendor guide for Genshin Impact: 5-star Catalyst stats, passive details, best characters, and build tips.",
    },
    zh: {
      title: '碧落之珑攻略：属性、适用角色与配装推荐',
      description: '原神碧落之珑攻略，整理属性、技能效果、适用角色与配装建议，帮助你判断是否值得培养。',
    },
  },
  'genshin/favonius-codex': {
    en: {
      title: 'Favonius Codex Genshin: Stats, Best Users & Builds',
      description: 'Favonius Codex guide for Genshin Impact: 4-star Catalyst stats, Energy Recharge passive, best users, and build recommendations.',
    },
    zh: {
      title: '西风秘典攻略：属性、适用角色与配装推荐',
      description: '原神西风秘典攻略，整理属性、充能效果、适用角色和配装建议，方便快速做出培养判断。',
    },
  },
  'genshin/a-thousand-blazing-suns': {
    en: {
      title: 'A Thousand Blazing Suns Genshin: Stats, Best Users & Builds',
      description: 'A Thousand Blazing Suns guide for Genshin Impact: 5-star Claymore stats, passive, best users, and build tips.',
    },
    zh: {
      title: 'A Thousand Blazing Suns 攻略：属性、适用角色与配装推荐',
      description: '原神 A Thousand Blazing Suns 攻略，整理属性、技能效果、适用角色与配装建议，适合想快速判断是否培养。',
    },
  },
};

function buildAlternates(locale: string, gameId: string, id: string) {
  const languages: Record<string, string> = {};
  for (const l of ['zh', 'en', 'ja'] as const) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/weapons/${id}`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/weapons/${id}`;
  return { canonical: `${BASE_URL}/${locale}/${gameId}/weapons/${id}`, languages };
}

function buildOg(title: string, description: string, gameId: string, id: string, locale: string) {
  return {
    title,
    description,
    url: `${BASE_URL}/${locale}/${gameId}/weapons/${id}`,
    siteName: 'Gachia' as const,
    images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  };
}

function buildWeaponMetaDescription(base: string, locale: SupportedLocale) {
  const addition = locale === 'zh'
    ? '本页补充适配角色、获取方式和实战定位，方便你判断这把武器是否值得优先培养。'
    : locale === 'ja'
      ? 'おすすめキャラ、入手方法、実戦での役割を補足し、育成優先度の判断に役立てます。'
      : 'The page also covers recommended users, acquisition, and practical role so you can judge whether the weapon is worth investing in.';
  const text = base.trim().length >= 120 ? base.trim() : `${base.trim()} ${addition}`;
  return text.slice(0, 160);
}

function WeaponJsonLd({
  gameId,
  locale,
  name,
  description,
  weaponId,
}: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  weaponId: string;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildWeaponJsonLd({ gameId, locale, name, description, weaponId })),
      }}
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
  const gameName = GAMES[gameId]?.name[locale] ?? '';

  // Build intent-rich title & description per locale — includes stats in description for SERP CTR
  const buildWeaponMeta = (name: string, effectDesc: string | undefined, statsLine?: string, hasPassive = true, titleStat?: string) => {
    const override = WEAPON_META_OVERRIDES[`${gameId}/${id}`]?.[locale];
    if (override) return override;

    const statSuffix = titleStat ? ` (${titleStat})` : '';
    const weaponNoun = gameId === 'zzz' ? 'W-Engine' : 'Weapon';
    const title = locale === 'zh'
      ? `${name}${statSuffix} — ${gameName}武器攻略 | 给谁用最好？`
      : locale === 'ja'
        ? `${name}${statSuffix} — ${gameName}武器評価${hasPassive ? ' | スキルとおすすめキャラ' : ' | おすすめキャラ'}`
        : `${name}${statSuffix} — ${gameName} ${weaponNoun}: Stats, Best Characters & Builds`;
    let desc: string;
    if (effectDesc && statsLine) {
      desc = `${statsLine}. ${effectDesc}`.slice(0, 160);
    } else if (statsLine) {
      desc = locale === 'zh'
        ? `${name}：${statsLine}。查看${hasPassive ? '技能效果、' : ''}获取方式及推荐角色。`
        : locale === 'ja'
          ? `${name}：${statsLine}。${hasPassive ? 'スキル効果、' : ''}入手方法、おすすめキャラを確認。`
          : `${name} — ${statsLine}. See ${hasPassive ? 'skill effect, ' : ''}how to get it, and best characters.`;
    } else if (effectDesc) {
      desc = `${name}: ${effectDesc}`.slice(0, 160);
    } else {
      desc = locale === 'zh'
        ? `${name}是${gameName}中的武器，查看属性、${hasPassive ? '技能效果、' : ''}获取方式及推荐使用的角色。`
        : locale === 'ja'
          ? `${name}のステータス${hasPassive ? '、スキル効果' : ''}、入手方法、おすすめキャラクターを確認。`
          : `Complete ${name} guide for ${gameName}: stats${hasPassive ? ', skill effect' : ''}, how to get it, and best characters to use it with.`;
    }
    return { title, description: buildWeaponMetaDescription(desc, locale) };
  };

  if (gameId === 'genshin') {
    const w = getGenshinWeaponById(id);
    if (!w) return {};
    const name = getGenshinWeaponName(w, locale);
    const effect = getGenshinWeaponEffect(w, locale);
    const sub90 = w.subStat ? (() => { const v = parseFloat(w.subStatValue); return isNaN(v) ? '' : `${w.subStat} ${(v * 4.6).toFixed(1)}%`; })() : '';
    const stats = locale === 'zh'
      ? `${w.rarity}★, 基础攻击力${w.baseAtk}${sub90 ? `, 满级${sub90}` : ''}`
      : `★${w.rarity}, Base ATK ${w.baseAtk}${sub90 ? `, Lv.90 ${sub90}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats, true, sub90 || undefined);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'starrail') {
    const w = getStarRailLightConeById(id);
    if (!w) return {};
    const name = getStarRailLightConeName(w, locale);
    const effect = getStarRailLightConeEffect(w, locale);
    const stats = locale === 'zh'
      ? `${w.rarity}★, 生命${w.baseHp} 攻击${w.baseAtk} 防御${w.baseDef}`
      : `★${w.rarity}, HP ${w.baseHp} / ATK ${w.baseAtk} / DEF ${w.baseDef}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'wuwa') {
    const w = getWuWaWeaponById(id);
    if (!w) return {};
    const name = getWuWaWeaponName(w, locale);
    const effect = getWuWaWeaponEffect(w, locale);
    const sub = w.subStat ? (locale === 'zh' ? `${w.subStat.name}${w.subStat.value}` : `${w.subStat.name} ${w.subStat.value}`) : '';
    const stats = locale === 'zh'
      ? `${w.rarity}★, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `★${w.rarity}, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const hasPassive = !!effect?.name;
    const meta = buildWeaponMeta(name, effect?.description, stats, hasPassive);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'nte') {
    const w = getNteWeaponById(id);
    if (!w) return {};
    const name = getNteWeaponName(w, locale);
    const effect = getNteWeaponEffect(w, locale);
    const sub = w.substat ? (locale === 'zh' ? `${w.substat}${w.substatValue}` : `${w.substat} ${w.substatValue}`) : '';
    const stats = locale === 'zh'
      ? `${w.rank}级, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `${w.rank}-Rank, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'zzz') {
    const w = getZzzWeaponById(id);
    if (!w) return {};
    const name = getZzzWeaponName(w, locale);
    const effect = getZzzWeaponEffect(w, locale);
    const sub = w.substat ? (locale === 'zh' ? `${w.substat}${w.substatValue}` : `${w.substatEn ?? w.substat} ${w.substatValue}`) : '';
    const stats = locale === 'zh'
      ? `${w.rank}级, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `${w.rank}-Rank, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'guihuan') {
    const w = getGuihuanWeaponById(id);
    if (!w) return {};
    const name = getGuihuanWeaponName(w, locale);
    const effect = getGuihuanWeaponEffect(w, locale);
    const sub = w.substat ? (locale === 'zh' ? `${w.substat}${w.substatValue}` : `${w.substatEn ?? w.substat} ${w.substatValue}`) : '';
    const stats = locale === 'zh'
      ? `${w.rarity}★, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `★${w.rarity}, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'ananta') {
    const w = getAnantaWeaponById(id);
    if (!w) return {};
    const name = getAnantaWeaponName(w, locale);
    const effect = getAnantaWeaponEffect(w, locale);
    const sub = w.substat ? (locale === 'zh' ? `${w.substat}${w.substatValue}` : `${w.substatEn ?? w.substat} ${w.substatValue}`) : '';
    const stats = locale === 'zh'
      ? `${w.rarity}★, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `★${w.rarity}, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'endfield') {
    const w = getEndfieldWeaponById(id);
    if (!w) return {};
    const name = getEndfieldWeaponName(w, locale);
    const effect = getEndfieldWeaponEffect(w, locale);
    const sub = w.substat ? (locale === 'zh' ? `${w.substat}${w.substatValue}` : `${w.substatEn ?? w.substat} ${w.substatValue}`) : '';
    const stats = locale === 'zh'
      ? `${w.rarity}★, 基础攻击力${w.baseAtk}${sub ? `, ${sub}` : ''}`
      : `★${w.rarity}, Base ATK ${w.baseAtk}${sub ? `, ${sub}` : ''}`;
    const meta = buildWeaponMeta(name, effect?.description, stats);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  if (gameId === 'skjh') {
    const w = getSkjhWeaponById(id);
    if (!w) return {};
    const name = getSkjhWeaponName(w, locale);
    const effect = getSkjhWeaponEffect(w, locale);
    const type = SKJH_WEAPON_TYPE[w.weaponType]?.[locale] ?? w.weaponType;
    const stats = locale === 'zh' ? `${w.rarity}★, ${type}` : `★${w.rarity}, ${type}`;
    const meta = buildWeaponMeta(name, effect?.description, stats, true, type);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
  }
  return {};
}

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    const w = getGenshinWeaponById(id);
    if (!w) notFound();
    return <GenshinWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'starrail') {
    const w = getStarRailLightConeById(id);
    if (!w) notFound();
    return <StarRailLightConeDetail lc={w} locale={locale} />;
  }
  if (gameId === 'wuwa') {
    const w = getWuWaWeaponById(id);
    if (!w) notFound();
    return <WuWaWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'nte') {
    const w = getNteWeaponById(id);
    if (!w) notFound();
    return <NteWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'zzz') {
    const w = getZzzWeaponById(id);
    if (!w) notFound();
    return <ZzzWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'guihuan') {
    const w = getGuihuanWeaponById(id);
    if (!w) notFound();
    return <GuihuanWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'ananta') {
    const w = getAnantaWeaponById(id);
    if (!w) notFound();
    return <AnantaWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'endfield') {
    const w = getEndfieldWeaponById(id);
    if (!w) notFound();
    return <EndfieldWeaponDetail weapon={w} locale={locale} />;
  }
  if (gameId === 'skjh') {
    const w = getSkjhWeaponById(id);
    if (!w) notFound();
    return <SkjhWeaponDetail weapon={w} locale={locale} />;
  }

  if (gameId === 'sea') {
    notFound();
  }

  notFound();
}

/* ---------- Genshin ---------- */

function GenshinWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getGenshinWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.genshin.name[locale];
  const name = getGenshinWeaponName(weapon, locale);
  const effect = getGenshinWeaponEffect(weapon, locale);
  const source = getGenshinWeaponSource(weapon, locale);
  const weaponType = GENSHIN_WEAPON_TYPE[weapon.weaponType]?.[locale] ?? weapon.weaponType;

  return (
    <div>
      <WeaponJsonLd gameId="genshin" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="genshin" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={weaponType} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.subStat && <InfoCard label="Sub Stat (Lv.1)" value={`${weapon.subStat} ${weapon.subStatValue}`} />}
      </div>
      {weapon.subStat && (() => {
        const baseVal = parseFloat(weapon.subStatValue);
        if (isNaN(baseVal)) return null;
        const maxVal = (baseVal * 4.6).toFixed(1);
        return (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard label={locale === 'zh' ? '满级副属性 (Lv.90)' : locale === 'ja' ? 'Lv.90サブステータス' : 'Sub Stat at Lv.90'} value={`${weapon.subStat} ${maxVal}%`} />
          </div>
        );
      })()}
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="genshin" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/genshin` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/genshin/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Star Rail ---------- */

function StarRailLightConeDetail({ lc, locale }: { lc: NonNullable<ReturnType<typeof getStarRailLightConeById>>; locale: SupportedLocale }) {
  const gameName = GAMES.starrail.name[locale];
  const name = getStarRailLightConeName(lc, locale);
  const effect = getStarRailLightConeEffect(lc, locale);
  const source = getStarRailLightConeSource(lc, locale);
  const pathLabel = STARRAIL_PATH[lc.path]?.[locale] ?? lc.path;

  return (
    <div>
      <WeaponJsonLd gameId="starrail" locale={locale} name={name} description={effect.description || source || name} weaponId={lc.id} />
      <Breadcrumb game="starrail" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? lc.nameEn : lc.name} rarity={lc.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label={locale === 'zh' ? '命途' : locale === 'ja' ? '運命' : 'Path'} value={pathLabel} />
        <InfoCard label="Base HP" value={String(lc.baseHp)} />
        <InfoCard label="Base ATK" value={String(lc.baseAtk)} />
        <InfoCard label="Base DEF" value={String(lc.baseDef)} />
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '光锥技能' : locale === 'ja' ? '光円錐スキル' : 'Light Cone Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="starrail" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/starrail` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/starrail/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- WuWa ---------- */

function WuWaWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getWuWaWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.wuwa.name[locale];
  const name = getWuWaWeaponName(weapon, locale);
  const effect = getWuWaWeaponEffect(weapon, locale);
  const source = getWuWaWeaponSource(weapon, locale);
  const weaponType = WUWA_WEAPON_TYPE[weapon.weaponType]?.[locale] ?? weapon.weaponType;

  return (
    <div>
      <WeaponJsonLd gameId="wuwa" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="wuwa" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={weaponType} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.subStat && <InfoCard label="Sub Stat" value={`${weapon.subStat.name} ${weapon.subStat.value}`} />}
      </div>
      {effect.name ? (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-dashed border-game-border bg-game-surface p-4 text-center">
            <p className="text-sm text-game-text-muted">
              {locale === 'zh' ? '暂无技能效果数据' : locale === 'ja' ? 'スキル効果データなし' : 'Passive skill data not yet available'}
            </p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="wuwa" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/wuwa` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/wuwa/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- NTE ---------- */

function NteWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getNteWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.nte.name[locale];
  const name = getNteWeaponName(weapon, locale);
  const effect = getNteWeaponEffect(weapon, locale);
  const source = getNteWeaponSource(weapon, locale);
  const weaponType = NTE_WEAPON_TYPE[weapon.type]?.[locale] ?? weapon.type;

  return (
    <div>
      <WeaponJsonLd gameId="nte" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="nte" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? (weapon.nameEn ?? '') : (weapon.name ?? '')} rarity={0} rank={weapon.rank} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={weaponType} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.substat && <InfoCard label="Sub Stat" value={`${weapon.substat} ${weapon.substatValue}`} />}
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '技能效果' : locale === 'ja' ? 'スキル効果' : 'Skill Effect'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="nte" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/nte` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/nte/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- ZZZ ---------- */

function ZzzWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getZzzWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.zzz.name[locale];
  const name = getZzzWeaponName(weapon, locale);
  const effect = getZzzWeaponEffect(weapon, locale);
  const source = getZzzWeaponSource(weapon, locale);

  return (
    <div>
      <WeaponJsonLd gameId="zzz" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="zzz" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rank === 'S' ? 5 : weapon.rank === 'A' ? 4 : 3} rank={weapon.rank} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '类型' : locale === 'ja' ? 'タイプ' : 'Specialty'} value={locale === 'zh' ? weapon.specialty : weapon.specialtyEn} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '音擎效果' : locale === 'ja' ? 'Wエンジン効果' : 'W-Engine Effect'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="zzz" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/zzz` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/zzz/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Guihuan ---------- */

function GuihuanWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getGuihuanWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.guihuan.name[locale];
  const name = getGuihuanWeaponName(weapon, locale);
  const effect = getGuihuanWeaponEffect(weapon, locale);
  const source = getGuihuanWeaponSource(weapon, locale);

  return (
    <div>
      <WeaponJsonLd gameId="guihuan" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="guihuan" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={locale === 'zh' ? weapon.weaponType : weapon.weaponTypeEn} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.substat && <InfoCard label="Sub Stat" value={`${locale === 'zh' ? weapon.substat : weapon.substatEn} ${weapon.substatValue}`} />}
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="guihuan" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/guihuan` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/guihuan/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Ananta ---------- */

function AnantaWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getAnantaWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.ananta.name[locale];
  const name = getAnantaWeaponName(weapon, locale);
  const effect = getAnantaWeaponEffect(weapon, locale);
  const source = getAnantaWeaponSource(weapon, locale);

  return (
    <div>
      <WeaponJsonLd gameId="ananta" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="ananta" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={locale === 'zh' ? weapon.weaponType : weapon.weaponTypeEn} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.substat && <InfoCard label="Sub Stat" value={`${locale === 'zh' ? weapon.substat : weapon.substatEn} ${weapon.substatValue}`} />}
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="ananta" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/ananta` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/ananta/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Endfield ---------- */

const ENDFIELD_WEAPON_TYPE: Record<string, Record<string, string>> = {
  Sword: { zh: '剑', en: 'Sword', ja: '剣' },
  Greatsword: { zh: '大剑', en: 'Greatsword', ja: '大剣' },
  Spear: { zh: '长枪', en: 'Spear', ja: '槍' },
  Shield: { zh: '盾', en: 'Shield', ja: '盾' },
  Staff: { zh: '法杖', en: 'Staff', ja: '杖' },
};

function EndfieldWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getEndfieldWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.endfield.name[locale];
  const name = getEndfieldWeaponName(weapon, locale);
  const effect = getEndfieldWeaponEffect(weapon, locale);
  const source = getEndfieldWeaponSource(weapon, locale);

  return (
    <div>
      <WeaponJsonLd gameId="endfield" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="endfield" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={locale === 'zh' ? weapon.weaponType : weapon.weaponTypeEn} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.substat && <InfoCard label="Sub Stat" value={`${locale === 'zh' ? weapon.substat : weapon.substatEn} ${weapon.substatValue}`} />}
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '武器技能' : locale === 'ja' ? '武器スキル' : 'Weapon Skill'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="endfield" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/endfield` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/endfield/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Ashfall Evolution ---------- */

function SkjhWeaponDetail({ weapon, locale }: { weapon: NonNullable<ReturnType<typeof getSkjhWeaponById>>; locale: SupportedLocale }) {
  const gameName = GAMES.skjh.name[locale];
  const name = getSkjhWeaponName(weapon, locale);
  const effect = getSkjhWeaponEffect(weapon, locale);
  const source = getSkjhWeaponSource(weapon, locale);
  const weaponType = SKJH_WEAPON_TYPE[weapon.weaponType]?.[locale] ?? weapon.weaponType;

  return (
    <div>
      <WeaponJsonLd gameId="skjh" locale={locale} name={name} description={effect.description || source || name} weaponId={weapon.id} />
      <Breadcrumb game="skjh" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '类型' : locale === 'ja' ? 'タイプ' : 'Type'} value={weaponType} />
        <InfoCard label={locale === 'zh' ? '定位' : locale === 'ja' ? '役割' : 'Role'} value={effect.name} />
        <InfoCard label={locale === 'zh' ? '稀有度' : locale === 'ja' ? 'レア度' : 'Rarity'} value={`${weapon.rarity}★`} />
      </div>
      {effect.name && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '用途说明' : locale === 'ja' ? '用途' : 'Use Case'}
          </h2>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">{effect.name}</div>
            <p className="text-sm text-game-text-muted">{effect.description}</p>
          </div>
        </section>
      )}
      {source && <SourceSection source={source} locale={locale} />}
      <UsageTipsSection name={name} gameName={gameName} locale={locale} />
      <NextStepSection gameId="skjh" locale={locale} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/skjh` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/skjh/weapons` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

/* ---------- Shared Components ---------- */

function Breadcrumb({ game, gameName, locale }: { game: string; gameName: string; locale: SupportedLocale }) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
      <Link href={`/${game}` as '/'} className="hover:text-game-primary">{gameName}</Link>
      <span>/</span>
      <Link href={`/${game}/weapons` as '/'} className="hover:text-game-primary">
        {locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons'}
      </Link>
      <span>/</span>
    </nav>
  );
}

function Header({ name, nameAlt, rarity, rank }: { name: string; nameAlt: string; rarity: number; rank?: string }) {
  return (
    <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-game-text">{name}</h1>
        {rank && (
          <span className="rounded bg-game-primary/20 px-2 py-0.5 text-sm font-bold text-game-primary">{rank}</span>
        )}
        {rarity > 0 && (
          <span className="text-sm font-bold" style={{ color: RARITY_COLORS[rarity] || '#888' }}>
            {'★'.repeat(rarity)}
          </span>
        )}
      </div>
      {nameAlt && <p className="mt-1 text-sm text-game-text-muted">{nameAlt}</p>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-1 text-xs text-game-text-muted">{label}</div>
      <div className="text-sm font-medium text-game-text">{value}</div>
    </div>
  );
}

function SourceSection({ source, locale }: { source: string; locale: SupportedLocale }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '获取途径' : locale === 'ja' ? '入手方法' : 'How to Obtain'}
      </h2>
      <div className="rounded-lg border border-game-border bg-game-surface p-4">
        <p className="text-sm text-game-text-muted">{source}</p>
      </div>
    </section>
  );
}

function UsageTipsSection({ name, gameName, locale }: { name: string; gameName: string; locale: SupportedLocale }) {
  const tips = locale === 'zh'
    ? `${name}是${gameName}中的一把武器，选择适合角色的武器能显著提升战斗力。建议根据角色的定位和属性需求来搭配武器，优先提升主C角色的武器等级。注意武器副属性的配合，例如暴击率副属性的武器适合需要暴击的角色。`
    : locale === 'ja'
      ? `${name}は${gameName}の武器です。キャラクターに合った武器を選ぶことで戦力が大きく向上します。キャラの役割とステータス要件に合わせて武器を装備し、メインアタッカーの武器レベルを優先して上げましょう。サブステータスとの相性も重要です。`
      : `${name} is a weapon in ${gameName}. Choosing the right weapon for each character significantly boosts combat effectiveness. Match weapons to character roles and stat needs — prioritize leveling your main DPS weapon first. Pay attention to substat synergy; for example, weapons with CRIT Rate substats pair well with characters who need higher crit consistency.`;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-semibold text-game-text">
        {locale === 'zh' ? '使用建议' : locale === 'ja' ? '使用アドバイス' : 'Usage Tips'}
      </h2>
      <div className="rounded-lg border border-game-border bg-game-surface p-4">
        <p className="text-sm leading-relaxed text-game-text-muted">{tips}</p>
      </div>
    </section>
  );
}

function NextStepSection({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const links = WEAPON_NEXT_STEPS[gameId];
  if (!links?.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
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
    </section>
  );
}
