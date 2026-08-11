import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

import {
  guihuanCharacters,
  getGuihuanCharacterById,
  getGuihuanCharacterName,
  getGuihuanCharacterDescription,
  getGuihuanCharacterImage,
  getGuihuanCharacterTierReason,
} from '@gachia/data/games/guihuan/characters';

import type { GuihuanCharacter } from '@gachia/data/games/guihuan/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



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

  const faq = char.faq.length > 0
    ? char.faq.map((f) => ({
        question: localeStr(f.questionZh, f.question, locale),
        answer: localeStr(f.answerZh, f.answer, locale),
      }))
    : undefined;

  return (
    <div>
      <CharacterJsonLd
        gameId="guihuan"
        locale={locale}
        name={charName}
        description={getGuihuanCharacterDescription(char, locale).slice(0, 300)}
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

      <NextStepSection locale={locale} gameId="guihuan" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/guihuan/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function GuihuanCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getGuihuanCharacterById(id);
  if (!char) notFound();
  return <GuihuanCharacterDetail char={char} locale={locale} />;
}
