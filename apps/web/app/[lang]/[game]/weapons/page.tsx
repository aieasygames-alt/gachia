import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteWeapons, getNteWeaponName, getNteWeaponEffect, genshinWeapons, getGenshinWeaponName, getGenshinWeaponEffect, starrailLightCones, getStarRailLightConeName, getStarRailLightConeEffect, wuwaWeapons, getWuWaWeaponName, getWuWaWeaponEffect, zzzWeapons, getZzzWeaponName, getZzzWeaponEffect, anantaWeapons, getAnantaWeaponName, getAnantaWeaponEffect, guihuanWeapons, getGuihuanWeaponName, getGuihuanWeaponEffect } from '@gachia/data';

const BASE_URL = 'https://gachia.com';

const WEAPON_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全武器图鉴，包含五星、四星、三星武器数据、技能效果、获取方式', en: 'Complete Genshin Impact weapon list with stats, passive effects, and how to obtain', ja: '原神全武器図鑑、ステータス、武器スキル、入手方法' },
  starrail: { zh: '崩坏：星穹铁道全光锥图鉴，包含五星、四星光锥数据、技能效果', en: 'Complete Honkai: Star Rail light cone list with stats and passive effects by path', ja: 'スターレイル全光円錐図鑑、ステータス、スキル効果' },
  wuwa: { zh: '鸣潮全武器图鉴，包含五星、四星武器数据、被动技能', en: 'Complete Wuthering Waves weapon list with stats and passive abilities', ja: '鳴潮全武器図鑑、ステータス、パッシブスキル' },
  nte: { zh: '异环全弧盘图鉴，包含S级、A级弧盘数据、技能效果', en: 'Complete Neverness to Everness Arc list with S-Rank and A-Rank data', ja: '異環全アルク図鑑、S級、A級データ' },
  zzz: { zh: '绝区零全音擎图鉴，包含S级、A级音擎数据', en: 'Complete Zenless Zone Zero W-Engine list with S-Rank and A-Rank data', ja: 'ゼンレスゾーンゼロ全Wエンジン図鑑、S級、A級データ' },
  guihuan: { zh: '归环全武器图鉴，包含SSR、SR武器数据', en: 'Complete Guihuan weapon list with SSR and SR data', ja: '帰環全武器図鑑、SSR、SR武器データ' },
  ananta: { zh: '无限大全武器图鉴，包含SSR、SR武器数据', en: 'Complete Ananta weapon list with SSR and SR data', ja: 'アナンタ全武器図鑑、SSR、SR武器データ' },
};

const NTE_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: 'シンセシス' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
};

const NTE_RANK_COLORS: Record<string, string> = { S: '#eab308', A: '#a855f7', B: '#60a5fa' };

const GENSHIN_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const GENSHIN_RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons';
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/weapons`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/weapons`;

  const desc = WEAPON_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;

  const title = locale === 'zh'
    ? `${gameName}武器图鉴 — 全武器数据与技能效果`
    : locale === 'ja'
      ? `${gameName}武器一覧 — ステータスとスキル効果`
      : `${gameName} Weapons — Complete Stats, Skills & Best Picks`;

  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/weapons`, languages },
  };
}

export default async function WeaponsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons', item: `${BASE_URL}/${locale}/${gameId}/weapons` },
    ],
  };

  if (gameId === 'genshin') {
    return <><GenshinWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'starrail') {
    return <><StarRailWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'nte') {
    return <><NteWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'wuwa') {
    return <><WuWaWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'zzz') {
    return <><ZzzWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'ananta') {
    return <><AnantaWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'guihuan') {
    return <><GuihuanWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
      </div>
    </div>
  );
}

// --- Genshin Weapons ---

function GenshinWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = genshinWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.genshin.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getGenshinWeaponEffect(w, locale);
                const typeLabel = GENSHIN_WEAPON_TYPE_LABELS[w.weaponType]?.[locale] ?? w.weaponType;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: GENSHIN_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getGenshinWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.subStatValue} {w.subStat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Star Rail Light Cones ---

const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
};

function StarRailWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = starrailLightCones;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  const label = locale === 'zh' ? '光锥' : locale === 'ja' ? '光円錐' : 'Light Cones';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.starrail.theme.primary }}>
        {label}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件光锥` : locale === 'ja' ? `${weapons.length} 個の光円錐` : `${weapons.length} Light Cones`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getStarRailLightConeEffect(w, locale);
                const pathLabel = STARRAIL_PATH_LABELS[w.path]?.[locale] ?? w.path;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: rarity === 5 ? '#eab308' : rarity === 4 ? '#a855f7' : '#60a5fa' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getStarRailLightConeName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{pathLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>HP {w.baseHp}</span>
                      <span>ATK {w.baseAtk}</span>
                      <span>DEF {w.baseDef}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- NTE Weapons ---

function NteWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = nteWeapons;
  const grouped = groupByRank(weapons);
  const ranks = ['S', 'A', 'B'] as const;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {locale === 'zh' ? '弧盘' : locale === 'ja' ? 'アルク' : 'Arcs'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件弧盘` : locale === 'ja' ? `${weapons.length} 個のアルク` : `${weapons.length} Arcs`}
      </p>

      {ranks.map((rank) => {
        const list = grouped[rank];
        if (!list || list.length === 0) return null;
        return (
          <section key={rank} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{rank}-Rank ({list.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getNteWeaponEffect(w, locale);
                const typeLabel = NTE_WEAPON_TYPE_LABELS[w.type]?.[locale] ?? w.type;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: NTE_RANK_COLORS[w.rank] || '#888' }}>{w.rank}</span>
                      <h3 className="font-semibold text-game-text">{getNteWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>
                    {w.signatureCharacter && (<p className="mt-2 text-xs text-game-primary">{locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}</p>)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Weapons ---

const WUWA_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  broadblade: { zh: '大刃', en: 'Broadblade', ja: '大剣' },
  sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
};

const WUWA_RARITY_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

function WuWaWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = wuwaWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getWuWaWeaponEffect(w, locale);
                const typeLabel = WUWA_WEAPON_TYPE_LABELS[w.weaponType]?.[locale] ?? w.weaponType;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: WUWA_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getWuWaWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      {w.subStat && <span>{w.subStat.value} {w.subStat.name}</span>}
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupByRank<T extends { rank: string }>(arr: T[]): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    (acc[item.rank] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// --- ZZZ W-Engines ---

const ZZZ_RANK_COLORS: Record<string, string> = { S: '#eab308', A: '#a855f7', B: '#60a5fa' };

const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  Attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  Stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  Anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  Support: { zh: '支援', en: 'Support', ja: '支援' },
  Defense: { zh: '防护', en: 'Defense', ja: '防護' },
};

function ZzzWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = zzzWeapons;
  const grouped = groupByRank(weapons);
  const ranks = ['S', 'A', 'B'] as const;

  const label = locale === 'zh' ? '音擎' : locale === 'ja' ? 'W-エンジン' : 'W-Engines';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {label}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件音擎` : locale === 'ja' ? `${weapons.length} 個のW-エンジン` : `${weapons.length} W-Engines`}
      </p>

      {ranks.map((rank) => {
        const list = grouped[rank];
        if (!list || list.length === 0) return null;
        return (
          <section key={rank} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{rank}-Rank ({list.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getZzzWeaponEffect(w, locale);
                const specialtyLabel = ZZZ_SPECIALTY_LABELS[w.specialtyEn]?.[locale] ?? w.specialtyEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: ZZZ_RANK_COLORS[w.rank] || '#888' }}>{w.rank}</span>
                      <h3 className="font-semibold text-game-text">{getZzzWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{specialtyLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (<p className="mt-2 text-xs text-game-primary">{locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}</p>)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Weapons ---

const ANANTA_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  'yo-yo': { zh: '溜溜球', en: 'Yo-yo', ja: 'ヨーヨー' },
  blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '触媒' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  spear: { zh: '长枪', en: 'Spear', ja: '槍' },
};

const ANANTA_RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

function AnantaWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = anantaWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getAnantaWeaponEffect(w, locale);
                const typeLabel = ANANTA_WEAPON_TYPE_LABELS[w.weaponTypeEn]?.[locale] ?? w.weaponTypeEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: ANANTA_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getAnantaWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Weapons ---

const GUIHUAN_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  Sword: { zh: '剑', en: 'Sword', ja: '剣' },
  Gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  Blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  Catalyst: { zh: '法器', en: 'Catalyst', ja: '触媒' },
  Instrument: { zh: '乐器', en: 'Instrument', ja: '楽器' },
  Hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  Bow: { zh: '弓', en: 'Bow', ja: '弓' },
  Spear: { zh: '长枪', en: 'Spear', ja: '槍' },
};

function GuihuanWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = guihuanWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>

      {[fiveStar, fourStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getGuihuanWeaponEffect(w, locale);
                const typeLabel = GUIHUAN_WEAPON_TYPE_LABELS[w.weaponTypeEn]?.[locale] ?? w.weaponTypeEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: rarity === 5 ? '#eab308' : '#a855f7' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getGuihuanWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substatEn}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
