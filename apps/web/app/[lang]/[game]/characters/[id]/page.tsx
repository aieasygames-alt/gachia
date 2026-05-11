import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import { ChevronRight } from 'lucide-react';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  nteCharacters,
  getNteCharacterById,
  getNteCharacterName,
  getNteCharacterDescription,
  getNteCharacterImage,
  getNteCharacterTierReason,
  getNteWeaponName,
  getNteMaterialName,
  getNteMaterialById,
  getBuildsForCharacter,
  getMaterialsForCharacter,
  getNteDiskSetName,
  getNteDiskSetDesc2pc,
  getNteDiskSetDesc4pc,
  genshinCharacters,
  getGenshinCharacterById,
  getGenshinCharacterName,
  getGenshinCharacterDescription,
  getGenshinCharacterImage,
  getGenshinCharacterTierReason,
  getGenshinWeaponName,
  genshinWeapons,
  getGenshinMaterialName,
  getGenshinMaterialById,
  getGenshinMaterialsForCharacter,
  getArtifactSetName,
  genshinArtifactSets,
  starrailCharacters,
  getStarRailCharacterById,
  getStarRailCharacterName,
  getStarRailCharacterDescription,
  getStarRailCharacterImage,
  getStarRailCharacterTierReason,
  getStarRailLightConeName,
  getStarRailRelicSetName,
  getStarRailRelicSetDesc2pc,
  getStarRailRelicSetDesc4pc,
  wuwaCharacters,
  getWuWaCharacterById,
  getWuWaCharacterName,
  getWuWaCharacterDescription,
  getWuWaCharacterImage,
} from '@gachia/data';
import type { NteCharacter, GenshinCharacter, StarRailCharacter, WuWaCharacter } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

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

export async function generateStaticParams() {
  const nteParams = LOCALES.flatMap((lang) =>
    nteCharacters.map((char) => ({ lang, game: 'nte', id: char.id }))
  );
  const genshinParams = LOCALES.flatMap((lang) =>
    genshinCharacters.map((char) => ({ lang, game: 'genshin', id: char.id }))
  );
  const starrailParams = LOCALES.flatMap((lang) =>
    starrailCharacters.map((char) => ({ lang, game: 'starrail', id: char.id }))
  );
  const wuwaParams = LOCALES.flatMap((lang) =>
    wuwaCharacters.map((char) => ({ lang, game: 'wuwa', id: char.id }))
  );
  return [...nteParams, ...genshinParams, ...starrailParams, ...wuwaParams];
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

  if (gameId === 'genshin') {
    const char = getGenshinCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.genshin.name[locale];
    const name = getGenshinCharacterName(char, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: getGenshinCharacterDescription(char, locale).slice(0, 160),
      alternates: buildAlternates(id),
    };
  }

  if (gameId === 'starrail') {
    const char = getStarRailCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.starrail.name[locale];
    const name = getStarRailCharacterName(char, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: getStarRailCharacterDescription(char, locale).slice(0, 160),
      alternates: buildAlternates(id),
    };
  }

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.nte.name[locale];
    const name = getNteCharacterName(char, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: getNteCharacterDescription(char, locale).slice(0, 160),
      alternates: buildAlternates(id),
    };
  }

  if (gameId === 'wuwa') {
    const char = getWuWaCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.wuwa.name[locale];
    const name = getWuWaCharacterName(char, locale);
    return {
      title: `${name} - ${gameName} Wiki`,
      description: getWuWaCharacterDescription(char, locale).slice(0, 160),
      alternates: buildAlternates(id),
    };
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
    return <GenshinCharacterDetail char={char} locale={locale} />;
  }

  if (gameId === 'starrail') {
    const char = getStarRailCharacterById(id);
    if (!char) notFound();
    return <StarRailCharacterDetail char={char} locale={locale} />;
  }

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) notFound();
    return <NteCharacterDetail char={char} locale={locale} />;
  }

  if (gameId === 'wuwa') {
    const char = getWuWaCharacterById(id);
    if (!char) notFound();
    return <WuWaCharacterDetail char={char} locale={locale} />;
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
  const buildArtifactSet = genshinArtifactSets.find(s => s.id === build.bestArtifactSet);

  // Resolve build items for linking
  const buildWeapon = genshinWeapons.find(w => w.nameEn.toLowerCase() === build.bestWeaponEn.toLowerCase());
  const buildArtifact = genshinArtifactSets.find(s => s.nameEn.toLowerCase() === build.bestArtifactSetEn.toLowerCase());
  const altArtifact = build.alternativeArtifactSetEn ? genshinArtifactSets.find(s => s.nameEn.toLowerCase() === build.alternativeArtifactSetEn!.toLowerCase()) : null;
  const altWeapons = build.alternativeWeapons.map(aw => genshinWeapons.find(w => w.nameEn.toLowerCase() === aw.toLowerCase() || w.name === aw)).filter(Boolean);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getGenshinCharacterDescription(char, locale).slice(0, 300),
    gamePlatform: 'Genshin Impact',
    applicationCategory: 'Game',
    genre: char.element,
    image: imageUrl,
    url: `https://gachia.com/${locale}/genshin/characters/${char.id}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: char.tierRank === 'SS' ? 5 : char.tierRank === 'S' ? 4.5 : char.tierRank === 'A' ? 4 : char.tierRank === 'B' ? 3 : 2,
      bestRating: 5,
      worstRating: 1,
    },
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
          <SkillItem name={locale === 'zh' ? char.skills.normalAttack.name : char.skills.normalAttack.nameEn}
            desc={locale === 'zh' ? char.skills.normalAttack.description : char.skills.normalAttack.descriptionEn}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={locale === 'zh' ? char.skills.elementalSkill.name : char.skills.elementalSkill.nameEn}
            desc={locale === 'zh' ? char.skills.elementalSkill.description : char.skills.elementalSkill.descriptionEn}
            label={locale === 'zh' ? '元素战技' : 'Elemental Skill'}
            extra={char.skills.elementalSkill.cooldown} />
          <SkillItem name={locale === 'zh' ? char.skills.elementalBurst.name : char.skills.elementalBurst.nameEn}
            desc={locale === 'zh' ? char.skills.elementalBurst.description : char.skills.elementalBurst.descriptionEn}
            label={locale === 'zh' ? '元素爆发' : 'Elemental Burst'}
            extra={[char.skills.elementalBurst.cost ? `${char.skills.elementalBurst.cost} Energy` : '', char.skills.elementalBurst.cooldown].filter(Boolean).join(' | ')} />
          <SkillItem name={locale === 'zh' ? char.skills.passive1.name : char.skills.passive1.nameEn}
            desc={locale === 'zh' ? char.skills.passive1.description : char.skills.passive1.descriptionEn}
            label={locale === 'zh' ? '固有天赋1' : 'Passive 1'} />
          <SkillItem name={locale === 'zh' ? char.skills.passive2.name : char.skills.passive2.nameEn}
            desc={locale === 'zh' ? char.skills.passive2.description : char.skills.passive2.descriptionEn}
            label={locale === 'zh' ? '固有天赋2' : 'Passive 2'} />
          {char.skills.passive4 && (
            <SkillItem name={locale === 'zh' ? char.skills.passive4.name : char.skills.passive4.nameEn}
              desc={locale === 'zh' ? char.skills.passive4.description : char.skills.passive4.descriptionEn}
              label={locale === 'zh' ? '实用天赋' : 'Utility Passive'} />
          )}
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
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRowLink label={locale === 'zh' ? '最佳武器' : 'Best Weapon'}
            value={locale === 'zh' ? build.bestWeapon : build.bestWeaponEn}
            href={buildWeapon ? `/genshin/weapons` : undefined} />
          {altWeapons.length > 0 && (
            <BuildRow label={locale === 'zh' ? '备选武器' : 'Alt Weapons'}
              value={altWeapons.map(w => w ? getGenshinWeaponName(w, locale) : '').filter(Boolean).join(', ')} />
          )}
          <BuildRowLink label={locale === 'zh' ? '圣遗物套装' : 'Artifact Set'}
            value={locale === 'zh' ? build.bestArtifactSet : build.bestArtifactSetEn}
            href={buildArtifact ? `/genshin/artifacts` : undefined} />
          {altArtifact && (
            <BuildRowLink label={locale === 'zh' ? '备选套装' : 'Alt Set'}
              value={getArtifactSetName(altArtifact, locale)}
              href="/genshin/artifacts" />
          )}
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'} value={Object.values(locale === 'zh' ? build.mainStats : build.mainStatsEn).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'} value={(locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn).join(' > ')} />
        </div>
      </Section>

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
      {char.relatedCharacters.length > 0 && (
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

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: charName,
    description: getStarRailCharacterDescription(char, locale).slice(0, 300),
    gamePlatform: 'Honkai: Star Rail',
    applicationCategory: 'Game',
    genre: char.element,
    image: imageUrl,
    url: `https://gachia.com/${locale}/starrail/characters/${char.id}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: char.tierRank === 'SS' ? 5 : char.tierRank === 'S' ? 4.5 : char.tierRank === 'A' ? 4 : char.tierRank === 'B' ? 3 : 2,
      bestRating: 5,
      worstRating: 1,
    },
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
      {build && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: gameConfig.theme.primary }}>
            {locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめ装備' : 'Recommended Build'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '最佳光锥' : 'Best Light Cone'}
              </h3>
              <Link href="/starrail/weapons" className="text-sm font-medium text-game-primary transition-colors hover:text-game-accent">
                {localeStr(build.bestLightCone, build.bestLightConeEn, locale)}
              </Link>
              {build.alternativeLightCones.length > 0 && (
                <p className="mt-1 text-xs text-game-text-muted">
                  {locale === 'zh' ? '替代' : 'Alt'}: {build.alternativeLightCones.join(', ')}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '最佳遗器' : 'Best Relics'}
              </h3>
              <Link href="/starrail/artifacts" className="text-sm font-medium text-game-primary transition-colors hover:text-game-accent">
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
      {char.relatedCharacters.length > 0 && (
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

function localeStr(zh: string, en: string, locale: SupportedLocale): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return en;
  return zh;
}

// ============================================================
// NTE Character Detail
// ============================================================

function NteCharacterDetail({ char, locale }: { char: NteCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.nte;
  const imageUrl = getNteCharacterImage(char);
  const builds = getBuildsForCharacter(char.id);

  return (
    <div>
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

      {char.relatedCharacters.length > 0 && (
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
    gamePlatform: 'Wuthering Waves',
    applicationCategory: 'Game',
    genre: char.element,
    image: imageUrl,
    url: `https://gachia.com/${locale}/wuwa/characters/${char.id}`,
    ...(char.tierRank ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: char.tierRank === 'SS' ? 5 : char.tierRank === 'S' ? 4.5 : char.tierRank === 'A' ? 4 : char.tierRank === 'B' ? 3 : 2,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };

  return (
    <div>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
