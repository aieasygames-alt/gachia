import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

import {
  seaCharacters,
  getSeaCharacterById,
  getSeaCharacterName,
  getSeaCharacterDescription,
  getSeaCharacterImage,
  getSeaCharacterTierReason,
} from '@gachia/data/games/sea/characters';

import type { SeaCharacter } from '@gachia/data/games/sea/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



// ============================================================
// Sea Character Detail
// ============================================================

function SeaCharacterDetail({ char, locale }: { char: SeaCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.sea;
  const imageUrl = getSeaCharacterImage(char);
  const elementColor = SEA_ELEMENT_COLORS[char.attribute] || '#888';
  const elementName = SEA_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attributeEn;
  const charName = getSeaCharacterName(char, locale);

  const faq = char.faq.length > 0
    ? char.faq.map((f) => ({
        question: localeStr(f.questionZh, f.question, locale),
        answer: localeStr(f.answerZh, f.answer, locale),
      }))
    : undefined;
  const seoTags = [char.attributeEn, char.roleEn, char.tierRank].filter(Boolean) as string[];

  return (
    <div>
      <CharacterJsonLd
        gameId="sea"
        locale={locale}
        name={charName}
        description={getSeaCharacterDescription(char, locale).slice(0, 300)}
        charId={char.id}
        image={imageUrl}
        faq={faq}
        tags={seoTags}
        categoryLabel={CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      />

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

      <NextStepSection locale={locale} gameId="sea" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/sea/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function SeaCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getSeaCharacterById(id);
  if (!char) notFound();
  return <SeaCharacterDetail char={char} locale={locale} />;
}
