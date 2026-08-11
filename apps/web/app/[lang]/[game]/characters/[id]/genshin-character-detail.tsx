import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

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

import type { GenshinCharacter } from '@gachia/data/games/genshin/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



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

  const faq = char.faq.length > 0
    ? char.faq.map((f) => ({
        question: locale === 'zh' ? f.questionZh : f.question,
        answer: locale === 'zh' ? f.answerZh : f.answer,
      }))
    : undefined;

  return (
    <div>
      <CharacterJsonLd
        gameId="genshin"
        locale={locale}
        name={charName}
        description={getGenshinCharacterDescription(char, locale).slice(0, 300)}
        charId={char.id}
        image={imageUrl}
        faq={faq}
      />

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

      <NextStepSection locale={locale} gameId="genshin" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function GenshinCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getGenshinCharacterById(id);
  if (!char) notFound();
  return <GenshinCharacterDetail char={char} locale={locale} />;
}
