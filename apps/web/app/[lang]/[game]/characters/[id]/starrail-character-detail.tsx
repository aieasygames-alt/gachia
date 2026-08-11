import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

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

import type { StarRailCharacter } from '@gachia/data/games/starrail/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



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
  const buildPlanarName = hasBuild ? localeStr(
    (build as unknown as { bestPlanarOrnament?: unknown }).bestPlanarOrnament,
    (build as unknown as { bestPlanarOrnamentEn?: unknown }).bestPlanarOrnamentEn,
    locale
  ) : '';
  const buildSubStats = hasBuild
    ? (locale === 'zh'
      ? (build as unknown as { subStatPriority?: string[] }).subStatPriority
      : (build as unknown as { subStatPriorityEn?: string[]; subStatPriority?: string[] }).subStatPriorityEn)
      ?? (build as unknown as { subStatPriority?: string[] }).subStatPriority
      ?? []
    : [];

  // JSON-LD structured data
  const faq = (char.faq?.length ?? 0) > 0
    ? char.faq.map((f) => ({
        question: locale === 'zh' ? f.questionZh : f.question,
        answer: locale === 'zh' ? f.answerZh : f.answer,
      }))
    : undefined;

  return (
    <div className="space-y-8">
      <CharacterJsonLd
        gameId="starrail"
        locale={locale}
        name={charName}
        description={getStarRailCharacterDescription(char, locale).slice(0, 300)}
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
              {buildPlanarName && (
                <p className="mt-1 text-xs text-game-text-muted">
                  {locale === 'zh' ? '位面饰品' : 'Planar'}:{' '}
                  <Link href="/starrail/artifacts" className="text-game-primary hover:text-game-accent transition-colors">
                    {buildPlanarName}
                  </Link>
                </p>
              )}
            </div>
          </div>
          {buildSubStats.length > 0 && (
            <div className="mt-3 rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">
                {locale === 'zh' ? '副词条优先级' : 'Substat Priority'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {buildSubStats.map((stat, i) => (
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

      <NextStepSection locale={locale} gameId="starrail" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function StarRailCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getStarRailCharacterById(id);
  if (!char) notFound();
  return <StarRailCharacterDetail char={char} locale={locale} />;
}
