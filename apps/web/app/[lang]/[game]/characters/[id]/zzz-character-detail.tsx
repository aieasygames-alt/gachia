import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

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

import type { ZzzCharacter } from '@gachia/data/games/zzz/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



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

  const faq = char.faq.length > 0
    ? char.faq.map((f) => ({
        question: localeStr(f.questionZh, f.question, locale),
        answer: localeStr(f.answerZh, f.answer, locale),
      }))
    : undefined;

  return (
    <div>
      <CharacterJsonLd
        gameId="zzz"
        locale={locale}
        name={charName}
        description={getZzzCharacterDescription(char, locale).slice(0, 300)}
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
                  href={weaponMatch ? `/zzz/weapons/${weaponMatch.id}` : undefined} />
                {(build.alternativeWeapons?.length ?? 0) > 0 && (
                  <div className="flex gap-2">
                    <span className="w-24 shrink-0 text-game-text-muted">{locale === 'zh' ? '备选音擎' : 'Alt W-Engines'}</span>
                    <span className="text-game-text">
                      {altWeaponMatches.map((aw, i) => (
                        <span key={i}>
                          {aw.id ? (
                            <Link href={`/zzz/weapons/${aw.id}` as '/'} className="text-game-primary hover:text-game-accent transition-colors">{aw.name}</Link>
                          ) : aw.name}
                          {i < altWeaponMatches.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                <BuildRowLink label={locale === 'zh' ? '驱动盘套装' : 'Drive Disc Set'}
                  value={discName}
                  href={discMatch ? `/zzz/drive-discs/${discMatch.id}` : undefined} />
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

      <NextStepSection locale={locale} gameId="zzz" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/zzz/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function ZzzCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getZzzCharacterById(id);
  if (!char) notFound();
  return <ZzzCharacterDetail char={char} locale={locale} />;
}
