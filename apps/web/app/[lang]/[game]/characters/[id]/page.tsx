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
  getNteWeaponById,
  getNteMaterialName,
  getNteMaterialById,
  getBuildsForCharacter,
  getMaterialsForCharacter,
  getNteDiskSetName,
  getNteDiskSetDesc2pc,
  getNteDiskSetDesc4pc,
  nteDiskSets,
} from '@gachia/data';
import type { NteCharacter } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const ELEMENT_NAMES: Record<string, Record<string, string>> = {
  anima: { zh: '创生', en: 'Anima', ja: '創生' },
  chaos: { zh: '混沌', en: 'Chaos', ja: '混沌' },
  cosmos: { zh: '宇宙', en: 'Cosmos', ja: '宇宙' },
  incantation: { zh: '咒术', en: 'Incantation', ja: '呪術' },
  lakshana: { zh: '相', en: 'Lakshana', ja: 'ラクシャナ' },
  psyche: { zh: '精神', en: 'Psyche', ja: 'サイキ' },
};

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    nteCharacters.map((char) => ({
      lang,
      game: 'nte',
      id: char.id,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const char = getNteCharacterById(id);

  if (!char || gameId !== 'nte') return {};

  const gameName = GAMES.nte.name[locale];
  const name = getNteCharacterName(char, locale);

  return {
    title: `${name} | ${gameName} Wiki | Gachia`,
    description: getNteCharacterDescription(char, locale).slice(0, 160),
  };
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId !== 'nte') notFound();

  const char = getNteCharacterById(id);
  if (!char) notFound();

  const gameConfig = GAMES.nte;
  const imageUrl = getNteCharacterImage(char);
  const builds = getBuildsForCharacter(char.id);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        {/* Portrait */}
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          {imageUrl ? (
            <img src={imageUrl} alt={getNteCharacterName(char, locale)} className="h-64 w-64 object-cover object-top" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center text-4xl font-bold text-game-text-muted">
              {char.nameEn.charAt(0)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {getNteCharacterName(char, locale)}
          </h1>

          {/* Tags row */}
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: ELEMENT_COLORS[char.attribute] || '#888' }}>
              {ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attribute}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {char.rank}-Rank
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {locale === 'zh' ? char.role : char.roleEn}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
              {locale === 'zh' ? char.weapon : char.weaponEn}
            </span>
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getNteCharacterDescription(char, locale)}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            {char.faction && <span>{locale === 'zh' ? '阵营' : 'Faction'}: {char.faction}</span>}
            {char.cvZh && <span>CV: {locale === 'zh' ? char.cvZh : locale === 'ja' ? (char.cvJp || char.cvJpEn || '') : (char.cvEn || '')}</span>}
            {char.acquisitionMethod && (
              <span>
                {locale === 'zh' ? '获取方式' : 'Acquisition'}:{' '}
                {char.acquisitionMethod === 'limited-banner' ? (locale === 'zh' ? '限定祈愿' : 'Limited Banner') :
                 char.acquisitionMethod === 'standard' ? (locale === 'zh' ? '常驻祈愿' : 'Standard Banner') :
                 char.acquisitionMethod === 'free' ? (locale === 'zh' ? '免费获取' : 'Free') : char.acquisitionMethod}
              </span>
            )}
          </div>

          {/* Tier reason */}
          {char.tierReason && (
            <p className="mt-3 text-sm text-game-primary">
              {getNteCharacterTierReason(char, locale)}
            </p>
          )}
        </div>
      </div>

      {/* Skills */}
      <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
        <div className="space-y-3">
          <SkillItem name={locale === 'zh' ? char.skills.normalAttack.name : char.skills.normalAttack.nameEn}
            desc={locale === 'zh' ? char.skills.normalAttack.description : char.skills.normalAttack.descriptionEn}
            label={locale === 'zh' ? '普通攻击' : 'Normal Attack'} />
          <SkillItem name={locale === 'zh' ? char.skills.skill.name : char.skills.skill.nameEn}
            desc={locale === 'zh' ? char.skills.skill.description : char.skills.skill.descriptionEn}
            label={locale === 'zh' ? '战技' : 'Skill'}
            extra={[char.skills.skill.cooldown, char.skills.skill.cost].filter(Boolean).join(' | ')} />
          <SkillItem name={locale === 'zh' ? char.skills.ultimate.name : char.skills.ultimate.nameEn}
            desc={locale === 'zh' ? char.skills.ultimate.description : char.skills.ultimate.descriptionEn}
            label={locale === 'zh' ? '终结技' : 'Ultimate'}
            extra={char.skills.ultimate.cost} />
          {char.skills.passives?.map((p, i) => (
            <SkillItem key={i} name={locale === 'zh' ? p.name : p.nameEn}
              desc={locale === 'zh' ? p.description : p.descriptionEn}
              label={`${locale === 'zh' ? '被动' : 'Passive'} ${i + 1}`} />
          ))}
          {char.skills.qte?.name && (
            <SkillItem name={locale === 'zh' ? (char.skills.qte.name ?? '') : (char.skills.qte.nameEn ?? '')}
              desc={locale === 'zh' ? (char.skills.qte.description ?? '') : (char.skills.qte.descriptionEn ?? '')}
              label="QTE" />
          )}
          {char.skills.resonance?.map((r, i) => (
            <SkillItem key={`r${i}`} name={locale === 'zh' ? (r.name ?? '') : (r.nameEn ?? '')}
              desc={locale === 'zh' ? (r.description ?? '') : (r.descriptionEn ?? '')}
              label={`${locale === 'zh' ? '共鸣' : 'Resonance'} ${r.awakenReq}`}
              extra={`${locale === 'zh' ? '觉醒' : 'Awaken'} ${r.awakenReq}`} />
          ))}
          {char.skills.awakening?.map((a, i) => (
            <SkillItem key={`a${i}`} name={locale === 'zh' ? (a.name ?? '') : (a.nameEn ?? '')}
              desc={locale === 'zh' ? (a.description ?? '') : (a.descriptionEn ?? '')}
              label={`${locale === 'zh' ? '觉醒' : 'Awakening'} ${a.level}`} />
          ))}
        </div>
      </Section>

      {/* Recommended Build */}
      <Section title={locale === 'zh' ? '推荐配装' : locale === 'ja' ? 'おすすめビルド' : 'Recommended Build'}>
        <div className="space-y-2 text-sm">
          <BuildRow label={locale === 'zh' ? '最佳弧盘' : 'Best Arc'} value={locale === 'zh' ? char.recommendedBuild.bestWeapon : char.recommendedBuild.bestWeaponEn} />
          {char.recommendedBuild.alternativeWeapons.length > 0 && (
            <BuildRow label={locale === 'zh' ? '备选' : 'Alternatives'} value={char.recommendedBuild.alternativeWeapons.join(', ')} />
          )}
          <BuildRow label={locale === 'zh' ? '光盘套装' : 'Disk Set'} value={locale === 'zh' ? char.recommendedBuild.bestDiskSet : char.recommendedBuild.bestDiskSetEn} />
          <BuildRow label={locale === 'zh' ? '主属性' : 'Main Stats'} value={Object.values(locale === 'zh' ? char.recommendedBuild.mainStats : char.recommendedBuild.mainStatsEn).join(' / ')} />
          <BuildRow label={locale === 'zh' ? '副属性优先' : 'Sub Stats'} value={(locale === 'zh' ? char.recommendedBuild.subStatPriority : char.recommendedBuild.subStatPriorityEn).join(' > ')} />
        </div>
      </Section>

      {/* Builds from data */}
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
                {b.notes && <p className="mt-2 text-xs text-game-text-muted">{locale === 'zh' ? b.notes : b.notesEn}</p>}
              </div>
            ))}
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
                    const member = getNteCharacterById(memberId);
                    return member ? (
                      <Link key={memberId} href={`/nte/characters/${memberId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                        {getNteCharacterName(member, locale)}
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
        const charMats = getMaterialsForCharacter(char.id);
        if (!charMats) return null;
        return (
          <Section title={locale === 'zh' ? '养成材料' : locale === 'ja' ? '育成素材' : 'Ascension Materials'}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-game-border text-left text-game-text-muted">
                    <th className="pb-2 pr-4">{locale === 'zh' ? '等级' : 'Level'}</th>
                    <th className="pb-2">{locale === 'zh' ? '材料' : 'Materials'}</th>
                  </tr>
                </thead>
                <tbody>
                  {charMats.levelingMaterials.map((row) => (
                    <tr key={row.levelRange} className="border-b border-game-border/50">
                      <td className="py-2 pr-4 font-medium text-game-text">{row.levelRange}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          {row.materials.map((m) => {
                            const mat = getNteMaterialById(m.id);
                            return (
                              <span key={m.id} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                                {mat ? getNteMaterialName(mat, locale) : m.id} ×{m.quantity}
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
              const rel = getNteCharacterById(relId);
              return rel ? (
                <Link key={relId} href={`/nte/characters/${relId}` as '/'}
                  className="rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-primary hover:text-game-primary">
                  {getNteCharacterName(rel, locale)}
                </Link>
              ) : null;
            })}
          </div>
        </Section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/nte/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
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
      <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
        {desc}
      </div>
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
