import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

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

import type { NteCharacter } from '@gachia/data/games/nte/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



// ============================================================
// NTE Character Detail
// ============================================================

function NteCharacterDetail({ char, locale }: { char: NteCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.nte;
  const imageUrl = getNteCharacterImage(char);
  const builds = getBuildsForCharacter(char.id);
  const charName = getNteCharacterName(char, locale);
  const faq = char.faq.length > 0
    ? char.faq.map((f) => ({
        question: locale === 'zh' ? f.questionZh : f.question,
        answer: locale === 'zh' ? f.answerZh : f.answer,
      }))
    : undefined;

  return (
    <div>
      <CharacterJsonLd
        gameId="nte"
        locale={locale}
        name={charName}
        description={getNteCharacterDescription(char, locale).slice(0, 300)}
        charId={char.id}
        image={imageUrl}
        faq={faq}
      />
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

      <NextStepSection locale={locale} gameId="nte" />

      <div className="border-t border-game-border pt-4">
        <Link href="/nte/characters" className="text-sm text-game-primary hover:text-game-accent">{locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}</Link>
      </div>
    </div>
  );
}

export function NteCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getNteCharacterById(id);
  if (!char) notFound();
  return <NteCharacterDetail char={char} locale={locale} />;
}
