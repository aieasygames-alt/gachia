import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  genshinWeapons, getGenshinWeaponById, getGenshinWeaponName, getGenshinWeaponEffect, getGenshinWeaponSource,
  starrailLightCones, getStarRailLightConeById, getStarRailLightConeName, getStarRailLightConeEffect, getStarRailLightConeSource,
  wuwaWeapons, getWuWaWeaponById, getWuWaWeaponName, getWuWaWeaponEffect, getWuWaWeaponSource,
  nteWeapons, getNteWeaponById, getNteWeaponName, getNteWeaponEffect, getNteWeaponSource,
  zzzWeapons, getZzzWeaponById, getZzzWeaponName, getZzzWeaponEffect, getZzzWeaponSource,
  guihuanWeapons, getGuihuanWeaponById, getGuihuanWeaponName, getGuihuanWeaponEffect, getGuihuanWeaponSource,
  anantaWeapons, getAnantaWeaponById, getAnantaWeaponName, getAnantaWeaponEffect, getAnantaWeaponSource,
} from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

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

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...genshinWeapons.map((w) => ({ lang, game: 'genshin', id: w.id })),
    ...starrailLightCones.map((w) => ({ lang, game: 'starrail', id: w.id })),
    ...wuwaWeapons.map((w) => ({ lang, game: 'wuwa', id: w.id })),
    ...nteWeapons.map((w) => ({ lang, game: 'nte', id: w.id })),
    ...zzzWeapons.map((w) => ({ lang, game: 'zzz', id: w.id })),
    ...guihuanWeapons.map((w) => ({ lang, game: 'guihuan', id: w.id })),
    ...anantaWeapons.map((w) => ({ lang, game: 'ananta', id: w.id })),
  ]);
}

const BASE_URL = 'https://gachia.com';

function buildAlternates(locale: string, gameId: string, id: string) {
  const languages: Record<string, string> = {};
  for (const l of ['zh', 'en', 'ja'] as const) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/weapons/${id}`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/weapons/${id}`;
  return { canonical: `${BASE_URL}/${locale}/${gameId}/weapons/${id}`, languages };
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

  if (gameId === 'genshin') {
    const w = getGenshinWeaponById(id);
    if (!w) return {};
    const name = getGenshinWeaponName(w, locale);
    const effect = getGenshinWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'starrail') {
    const w = getStarRailLightConeById(id);
    if (!w) return {};
    const name = getStarRailLightConeName(w, locale);
    const effect = getStarRailLightConeEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'wuwa') {
    const w = getWuWaWeaponById(id);
    if (!w) return {};
    const name = getWuWaWeaponName(w, locale);
    const effect = getWuWaWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'nte') {
    const w = getNteWeaponById(id);
    if (!w) return {};
    const name = getNteWeaponName(w, locale);
    const effect = getNteWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'zzz') {
    const w = getZzzWeaponById(id);
    if (!w) return {};
    const name = getZzzWeaponName(w, locale);
    const effect = getZzzWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'guihuan') {
    const w = getGuihuanWeaponById(id);
    if (!w) return {};
    const name = getGuihuanWeaponName(w, locale);
    const effect = getGuihuanWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
  }
  if (gameId === 'ananta') {
    const w = getAnantaWeaponById(id);
    if (!w) return {};
    const name = getAnantaWeaponName(w, locale);
    const effect = getAnantaWeaponEffect(w, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: effect ? `${name}: ${effect.description}`.slice(0, 160) : `${name} - ${gameName}${locale === 'zh' ? '武器数据' : locale === 'ja' ? '武器データ' : ' weapon stats'}`,
      alternates: buildAlternates(locale, gameId, id),
    };
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
      <Breadcrumb game="genshin" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={weaponType} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.subStat && <InfoCard label="Sub Stat" value={`${weapon.subStat} ${weapon.subStatValue}`} />}
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
      <Breadcrumb game="wuwa" gameName={gameName} locale={locale} />
      <Header name={name} nameAlt={locale === 'zh' ? weapon.nameEn : weapon.name} rarity={weapon.rarity} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={locale === 'zh' ? '武器类型' : locale === 'ja' ? '武器タイプ' : 'Weapon Type'} value={weaponType} />
        <InfoCard label="Base ATK" value={String(weapon.baseAtk)} />
        {weapon.subStat && <InfoCard label="Sub Stat" value={`${weapon.subStat.name} ${weapon.subStat.value}`} />}
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
