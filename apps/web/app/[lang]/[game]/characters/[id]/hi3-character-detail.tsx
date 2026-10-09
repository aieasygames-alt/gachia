import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { getHi3CharacterById, getHi3CharacterDescription, getHi3CharacterImage, getHi3CharacterName } from '@gachia/data/games/hi3/characters';
import type { Hi3Character } from '@gachia/data/games/hi3/types';
import { CharacterJsonLd, NextStepSection, Section } from './character-detail-shared';

function t(locale: SupportedLocale, zh: string, en: string, ja: string) {
  return locale === 'en' ? en : locale === 'ja' ? ja : zh;
}

function RelatedArchive({ character, locale }: { character: Hi3Character; locale: SupportedLocale }) {
  const isFenghuang = character.id === 'fenghuang-of-vicissitude';
  const entries = isFenghuang
    ? [
      { href: '/hi3/weapons/vermillion-liuli', zh: '朱华', en: 'Vermillion Liuli', ja: '朱華', detailZh: '9.0 公开的新拳套。', detailEn: 'The v9.0 announced fist weapon.', detailJa: 'Ver.9.0で公開された新拳套。' },
      { href: '/hi3/weapons/vermillion-liuli-full-burn', zh: '朱华·全燃', en: 'Vermillion Liuli: Full Burn', ja: '朱華・全燃', detailZh: '朱华对应的 PRI-ARM，条件以客户端为准。', detailEn: 'Vermillion Liuli’s PRI-ARM; verify requirements in the client.', detailJa: '朱華対応のPRI-ARM。条件はクライアントで確認。' },
      { href: '/hi3/version', zh: '忧郁哲人圣痕', en: 'Weeping Philosopher stigmata', ja: '憂鬱な哲人聖痕', detailZh: '进入版本档案核对套装与锻造参考。', detailEn: 'Open the archive for the set and crafting reference.', detailJa: 'セットと鍛造参考はアーカイブで確認。' },
    ]
    : [
      { href: '/hi3/version', zh: '瑟莉姆协同资料', en: 'Senadina synergy archive', ja: 'セナディナ連携資料', detailZh: '命运之轮队伍人偶的已公开定位。', detailEn: 'Published positioning for the Wheel of Destiny AstralOp.', detailJa: '運命の輪向け人偶の公開済み役割。' },
      { href: '/hi3/guides/v9-0-resource-returnee-checklist', zh: '人偶补给核对', en: 'AstralOp supply checks', ja: '人偶補給の確認', detailZh: '先确认当前池子、期限、保底与队伍缺口。', detailEn: 'Confirm the live pool, end time, pity text, and team gap first.', detailJa: '現在の補給、終了時刻、天井、編成不足を先に確認。' },
      { href: '/hi3/items/ether-fuel', zh: '以太燃素与锻造', en: 'Ether Fuel and crafting', ja: 'エーテル燃料と鍛造', detailZh: '查看与圣痕锻造有关的官方公告参考。', detailEn: 'Review the official-announcement reference for stigma crafting.', detailJa: '聖痕鍛造に関する公式告知の参考を確認。' },
    ];

  return (
    <Section title={t(locale, '9.0 关联档案', 'Related v9.0 archive', 'Ver.9.0 関連アーカイブ')}>
      <div className="grid gap-3 md:grid-cols-3">
        {entries.map((entry) => (
          <Link key={entry.href} href={entry.href} className="rounded-lg border border-game-border bg-game-surface p-4 hover:border-game-primary">
            <h2 className="font-semibold text-game-text">{t(locale, entry.zh, entry.en, entry.ja)}</h2>
            <p className="mt-2 text-sm leading-6 text-game-text-muted">{t(locale, entry.detailZh, entry.detailEn, entry.detailJa)}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Hi3CharacterDetail({ character, locale }: { character: Hi3Character; locale: SupportedLocale }) {
  const name = getHi3CharacterName(character, locale);
  const description = getHi3CharacterDescription(character, locale);
  const image = getHi3CharacterImage(character);

  return (
    <div>
      <CharacterJsonLd
        gameId="hi3"
        locale={locale}
        name={name}
        description={description}
        charId={character.id}
        image={image}
        tags={[character.typeEn, character.damageTypeEn, character.weaponTypeEn, `v${character.releaseVersion}`]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-game-text-muted">
        <Link href="/hi3" className="hover:text-game-primary">{GAMES.hi3.name[locale]}</Link>
        <span className="px-1">/</span>
        <Link href="/hi3/characters" className="hover:text-game-primary">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
        <span className="px-1">/</span>
        <span className="text-game-text">{name}</span>
      </nav>

      <div className="mb-8 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar src={image} alt={name} element={character.damageType} className="h-56 w-56 object-cover" />
        </div>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-game-primary">{t(locale, '官方已核验条目', 'Officially verified entry', '公式確認済みエントリー')}</p>
          <h1 className="mt-1 text-3xl font-bold text-game-text">{name}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded bg-game-primary/15 px-2 py-1 text-game-primary">{character.rank}{t(locale, '级', '-Rank', '級')}</span>
            <span className="rounded bg-game-surface-alt px-2 py-1 text-game-text-muted">{character.typeEn}</span>
            <span className="rounded bg-game-surface-alt px-2 py-1 text-game-text-muted">{character.damageTypeEn}</span>
            <span className="rounded bg-game-surface-alt px-2 py-1 text-game-text-muted">{character.weaponTypeEn}</span>
            <span className="rounded bg-game-surface-alt px-2 py-1 text-game-text-muted">v{character.releaseVersion}</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-game-text-muted">{description}</p>
        </div>
      </div>

      <Section title={t(locale, '已公开定位', 'Published role', '公開済みの役割')}>
        <div className="grid gap-3 md:grid-cols-2">
          {character.skills.map((skill) => (
            <article key={skill.nameEn} className="rounded-lg border border-game-border bg-game-surface p-4">
              <h2 className="font-semibold text-game-text">{locale === 'en' ? skill.nameEn : locale === 'ja' ? skill.nameJa : skill.name}</h2>
              <p className="mt-2 text-sm leading-6 text-game-text-muted">{locale === 'en' ? skill.descriptionEn : locale === 'ja' ? skill.descriptionJa : skill.description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title={t(locale, '资料边界', 'Data scope', '情報の範囲')}>
        <div className="rounded-lg border border-game-border bg-game-surface p-4 text-sm leading-6 text-game-text-muted">
          {t(locale, '本页只整理官方公告直接确认的定位。补给期限、完整技能数值、晋升材料和当前配队，请以客户端及最新官方公告为准。', 'This page records only positioning directly confirmed in official notices. Use the client and latest official notices for supply timing, full skill values, upgrade materials, and live teams.', '本ページは公式告知で直接確認できる役割のみを整理します。補給期間、全スキル数値、育成素材、現在の編成はクライアントと最新公式告知を確認してください。')}
        </div>
      </Section>

      <RelatedArchive character={character} locale={locale} />

      <NextStepSection locale={locale} gameId="hi3" />
    </div>
  );
}

export function Hi3CharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const character = getHi3CharacterById(id);
  if (!character) notFound();
  return <Hi3CharacterDetail character={character} locale={locale} />;
}
