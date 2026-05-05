import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
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
  getGenshinMaterialName,
  getGenshinMaterialById,
  getGenshinMaterialsForCharacter,
  getArtifactSetName,
  genshinArtifactSets,
} from '@gachia/data';
import type { NteCharacter, GenshinCharacter } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

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
  return [...nteParams, ...genshinParams];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    const char = getGenshinCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.genshin.name[locale];
    const name = getGenshinCharacterName(char, locale);
    return {
      title: `${name} | ${gameName} Wiki | Gachia`,
      description: getGenshinCharacterDescription(char, locale).slice(0, 160),
    };
  }

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) return {};
    const gameName = GAMES.nte.name[locale];
    const name = getNteCharacterName(char, locale);
    return {
      title: `${name} | ${gameName} Wiki | Gachia`,
      description: getNteCharacterDescription(char, locale).slice(0, 160),
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

  if (gameId === 'nte') {
    const char = getNteCharacterById(id);
    if (!char) notFound();
    return <NteCharacterDetail char={char} locale={locale} />;
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

  const build = char.recommendedBuild;
  const buildArtifactSet = genshinArtifactSets.find(s => s.id === build.bestArtifactSet);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          {imageUrl ? (
            <img src={imageUrl} alt={getGenshinCharacterName(char, locale)} className="h-64 w-64 object-cover object-top" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center text-4xl font-bold text-game-text-muted">
              {char.nameEn.charAt(0)}
            </div>
          )}
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
          <BuildRow label={locale === 'zh' ? '最佳武器' : 'Best Weapon'} value={locale === 'zh' ? build.bestWeapon : build.bestWeaponEn} />
          {build.alternativeWeapons.length > 0 && (
            <BuildRow label={locale === 'zh' ? '备选武器' : 'Alt Weapons'} value={build.alternativeWeapons.join(', ')} />
          )}
          <BuildRow label={locale === 'zh' ? '圣遗物套装' : 'Artifact Set'} value={locale === 'zh' ? build.bestArtifactSet : build.bestArtifactSetEn} />
          {build.alternativeArtifactSet && build.alternativeArtifactSetEn && (
            <BuildRow label={locale === 'zh' ? '备选套装' : 'Alt Set'} value={locale === 'zh' ? build.alternativeArtifactSet : build.alternativeArtifactSetEn} />
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
          {imageUrl ? (
            <img src={imageUrl} alt={getNteCharacterName(char, locale)} className="h-64 w-64 object-cover object-top" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center text-4xl font-bold text-game-text-muted">{char.nameEn.charAt(0)}</div>
          )}
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
