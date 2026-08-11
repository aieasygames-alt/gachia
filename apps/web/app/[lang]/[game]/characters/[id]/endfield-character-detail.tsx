import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

import {
  endfieldCharacters,
  getEndfieldCharacterById,
  getEndfieldCharacterName,
  getEndfieldCharacterDescription,
  getEndfieldCharacterImage,
  getEndfieldCharacterTierReason,
} from '@gachia/data/games/endfield/characters';

import type { EndfieldCharacter } from '@gachia/data/games/endfield/types';

import { getMaterialsForCharacter as getEndfieldMaterialsForCharacter } from '@gachia/data/games/endfield/extras';

import { getEndfieldMaterialById } from '@gachia/data/games/endfield/items';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';



// ============================================================
// Endfield Character Detail
// ============================================================

function EndfieldCharacterDetail({ char, locale }: { char: EndfieldCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.endfield;
  const imageUrl = getEndfieldCharacterImage(char);
  const elementColor = ENDFIELD_ELEMENT_COLORS[char.element] || '#888';
  const elementName = ENDFIELD_ELEMENT_NAMES[char.element]?.[locale] ?? char.elementEn;
  const charName = getEndfieldCharacterName(char, locale);
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
        gameId="endfield"
        locale={locale}
        name={charName}
        description={getEndfieldCharacterDescription(char, locale).slice(0, 300)}
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
            <Link href="/endfield" className="hover:text-game-primary transition-colors">{GAMES.endfield.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/endfield/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
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
            <FavoriteButton gameId="endfield" characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: elementColor }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {localeStr(char.profession, char.professionEn, locale)}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getEndfieldCharacterDescription(char, locale)}
          </p>
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">{getEndfieldCharacterTierReason(char, locale)}</p>
          )}
        </div>
      </div>

      {/* Stats Progression Table */}
      {char.stats && char.stats.hp.length > 0 && (
        <Section title={locale === 'zh' ? '属性成长' : locale === 'ja' ? 'ステータス成長' : 'Stats Progression'}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-game-border">
                  <th className="px-3 py-2 text-left text-game-text-muted"></th>
                  {(char.stats.levels ?? ['Lv.1', 'E1', 'E2', 'E3', 'E4', 'E4 Max']).map((lvl) => (
                    <th key={lvl} className="px-3 py-2 text-center text-game-text-muted whitespace-nowrap">{lvl}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'HP', values: char.stats.hp },
                  { key: 'ATK', values: char.stats.atk },
                  { key: 'STR', values: char.stats.str },
                  { key: 'AGL', values: char.stats.agl },
                  { key: 'INT', values: char.stats.int },
                  { key: 'WIL', values: char.stats.wil },
                ].map(({ key, values }) => (
                  <tr key={key} className="border-b border-game-border/50">
                    <td className="px-3 py-2 font-medium text-game-text">{key}</td>
                    {values.map((v: number, i: number) => (
                      <td key={i} className="px-3 py-2 text-center text-game-text">{key === 'HP' || key === 'ATK' ? Math.round(v) : v.toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-game-border/50">
                  <td className="px-3 py-2 font-medium text-game-text">CRIT Rate</td>
                  <td colSpan={char.stats.hp.length} className="px-3 py-2 text-center text-game-text">{(char.stats.critRate * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Elite Promotion Costs */}
      {char.eliteCosts && char.eliteCosts.length > 0 && (
        <Section title={locale === 'zh' ? '精英晋升材料' : locale === 'ja' ? 'エリート昇進素材' : 'Elite Promotion Costs'}>
          <div className="space-y-3">
            {char.eliteCosts.map((tier) => (
              <div key={tier.elite} className="rounded-lg border border-game-border bg-game-surface p-3">
                <h4 className="mb-2 font-medium text-game-text">
                  {locale === 'zh' ? `精英${tier.elite}` : `Elite ${tier.elite}`}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tier.materials.map((mat, i) => (
                    <span key={i} className="rounded bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">
                      {mat.name} x{mat.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Potentials */}
      {char.potentials && char.potentials.length > 0 && (
        <Section title={locale === 'zh' ? '潜能' : locale === 'ja' ? 'ポテンシャル' : 'Potentials'}>
          <div className="space-y-2">
            {char.potentials.map((pot, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-3">
                <div className="mb-1 text-sm font-medium text-game-text">
                  <span className="mr-2 text-game-primary">P{i + 1}</span>
                  {pot.name}
                </div>
                <div className="text-sm text-game-text-muted">{pot.descriptionEn}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Skill Upgrade Materials */}
      {(() => {
        const charMats = getEndfieldMaterialsForCharacter(char.id);
        if (!charMats || charMats.talentMaterials.length === 0) return null;
        return (
          <Section title={locale === 'zh' ? '技能升级材料' : locale === 'ja' ? 'スキル強化素材' : 'Skill Upgrade Materials'}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-game-border">
                    <th className="px-3 py-2 text-left text-game-text-muted">{locale === 'zh' ? '等级' : 'Rank'}</th>
                    <th className="px-3 py-2 text-left text-game-text-muted">{locale === 'zh' ? '材料' : 'Materials'}</th>
                  </tr>
                </thead>
                <tbody>
                  {charMats.talentMaterials.map((tier, i) => (
                    <tr key={i} className="border-b border-game-border/50">
                      <td className="px-3 py-2 font-medium text-game-text whitespace-nowrap">{tier.talentLevel}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {tier.materials.map((mat, j) => {
                            const matInfo = getEndfieldMaterialById(mat.materialId);
                            return (
                              <span key={j} className="inline-flex items-center gap-1.5 rounded bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">
                                {matInfo && (
                                  <img src={`/images/endfield/materials/${matInfo.id}.webp`} alt="" className="h-4 w-4 rounded" loading="lazy" />
                                )}
                                {matInfo ? (locale === 'zh' ? matInfo.name : matInfo.nameEn) : mat.materialId} x{mat.quantity}
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
          </Section>
        );
      })()}

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
                    const member = getEndfieldCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/endfield/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getEndfieldCharacterName(member, locale)}
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
              const rel = getEndfieldCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/endfield/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getEndfieldCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      <NextStepSection locale={locale} gameId="endfield" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/endfield/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function EndfieldCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getEndfieldCharacterById(id);
  if (!char) notFound();
  return <EndfieldCharacterDetail char={char} locale={locale} />;
}
