import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { buildCharacterJsonLd } from '@/lib/jsonld';

import {
  wuwaCharacters,
  getWuWaCharacterById,
  getWuWaCharacterName,
  getWuWaCharacterDescription,
  getWuWaCharacterImage,
} from '@gachia/data/games/wuwa/characters';

import type { WuWaCharacter } from '@gachia/data/games/wuwa/types';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { CharacterJsonLd, CHARACTER_META_OVERRIDES, GENSHIN_ELEMENT_COLORS, GENSHIN_ELEMENT_NAMES, GENSHIN_REGION_LABELS, GENSHIN_WEAPON_LABELS, STARRAIL_ELEMENT_COLORS, STARRAIL_ELEMENT_NAMES, STARRAIL_PATH_LABELS, NTE_ELEMENT_COLORS, NTE_ELEMENT_NAMES, ZZZ_ELEMENT_COLORS, ZZZ_ELEMENT_NAMES, ZZZ_SPECIALTY_LABELS, GUIHUAN_ELEMENT_COLORS, GUIHUAN_ELEMENT_NAMES, ENDFIELD_ELEMENT_COLORS, ENDFIELD_ELEMENT_NAMES, SEA_ELEMENT_COLORS, SEA_ELEMENT_NAMES, StatCard, Section, SkillItem, BuildRow, BuildRowLink, NextStepSection, localeStr, buildBreadcrumbJsonLd } from './character-detail-shared';


// ============================================================
// Wuthering Waves Character Detail
// ============================================================

const WUWA_ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};

const WUWA_ELEMENT_NAMES: Record<string, Record<string, string>> = {
  glacio: { zh: '冷凝', en: 'Glacio', ja: '氷凝' },
  fusion: { zh: '热熔', en: 'Fusion', ja: '融合' },
  electro: { zh: '导电', en: 'Electro', ja: '導電' },
  aero: { zh: '气动', en: 'Aero', ja: '気動' },
  spectro: { zh: '衍射', en: 'Spectro', ja: '回折' },
  havoc: { zh: '湮灭', en: 'Havoc', ja: '壊滅' },
};

const WUWA_WEAPON_LABELS: Record<string, Record<string, string>> = {
  broadblade: { zh: '大刃', en: 'Broadblade', ja: '大剣' },
  sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
};


function WuWaCharacterDetail({ char, locale }: { char: WuWaCharacter; locale: SupportedLocale }) {
  const gameConfig = GAMES.wuwa;
  const imageUrl = getWuWaCharacterImage(char);
  const elementColor = WUWA_ELEMENT_COLORS[char.element] || '#888';
  const elementName = WUWA_ELEMENT_NAMES[char.element]?.[locale] ?? char.element;
  const weaponLabel = WUWA_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;
  const charName = getWuWaCharacterName(char, locale);
  const skills = char.skills as unknown as Record<string, {
    name?: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    cooldown?: string;
  }> | undefined;
  const skillItems = [
    { key: 'basicAtk', label: locale === 'zh' ? '普攻' : 'Basic Attack', fallbackName: locale === 'zh' ? '普攻' : 'Basic Attack' },
    { key: 'resonanceSkill', label: locale === 'zh' ? '共鸣技能' : 'Resonance Skill', fallbackName: locale === 'zh' ? '共鸣技能' : 'Resonance Skill' },
    { key: 'resonanceLiberation', label: locale === 'zh' ? '共鸣解放' : 'Resonance Liberation', fallbackName: locale === 'zh' ? '共鸣解放' : 'Resonance Liberation' },
    { key: 'forteCircuit', label: locale === 'zh' ? '固有技能' : 'Forte Circuit', fallbackName: locale === 'zh' ? '固有技能' : 'Forte Circuit' },
    { key: 'introSkill', label: locale === 'zh' ? '变奏技能' : 'Intro Skill', fallbackName: locale === 'zh' ? '变奏技能' : 'Intro Skill' },
    { key: 'outroSkill', label: locale === 'zh' ? '延奏技能' : 'Outro Skill', fallbackName: locale === 'zh' ? '延奏技能' : 'Outro Skill' },
  ].map((item) => {
    const skill = skills?.[item.key];
    if (!skill?.description && !skill?.descriptionEn) return null;
    return { ...item, skill };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const rawFaq = (char as WuWaCharacter & {
    faq?: { questionZh?: string; question?: string; answerZh?: string; answer?: string }[];
  }).faq;
  const faq = rawFaq?.length
    ? rawFaq.map((f) => ({
        question: localeStr(f.questionZh ?? '', f.question ?? '', locale),
        answer: localeStr(f.answerZh ?? '', f.answer ?? '', locale),
      }))
    : undefined;

  return (
    <div>
      <CharacterJsonLd
        gameId="wuwa"
        locale={locale}
        name={charName}
        description={getWuWaCharacterDescription(char, locale).slice(0, 300)}
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
            <Link href="/wuwa" className="hover:text-game-primary transition-colors">{GAMES.wuwa.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href="/wuwa/characters" className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
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
            <FavoriteButton gameId="wuwa" characterId={char.id} />
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
            {char.tierRank && (
              <span className="rounded px-2 py-0.5 text-sm font-bold" style={{ color: '#ef4444' }}>
                {char.tierRank}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {getWuWaCharacterDescription(char, locale)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-game-text-muted">
            {char.releaseVersion && <span>{locale === 'zh' ? '版本' : 'Version'}: {char.releaseVersion}</span>}
            {char.voiceActors?.cn && <span>{locale === 'zh' ? '中配' : 'CV(CN)'}: {char.voiceActors.cn}</span>}
            {char.voiceActors?.jp && <span>{locale === 'zh' ? '日配' : 'CV(JP)'}: {char.voiceActors.jp}</span>}
            {char.voiceActors?.en && <span>{locale === 'zh' ? '英配' : 'CV(EN)'}: {char.voiceActors.en}</span>}
          </div>
          <div className="mt-4 rounded-md border border-game-border bg-game-surface px-3 py-2 text-xs leading-relaxed text-game-text-muted">
            <strong className="mr-1 text-game-text">{locale === 'zh' ? '数据状态' : locale === 'ja' ? 'データ状況' : 'Data status'}:</strong>
            {locale === 'zh' ? '页面已按鸣潮 v3.7 观察与 v3.6 复盘周期检查至 2026-09-21。技能、声骸和配队仅在有可核验资料时展示；缺失部分不会用推测补齐。' : locale === 'ja' ? '鳴潮 v3.7観察とv3.6回顧を2026-09-21まで確認。検証可能な資料がある項目のみ掲載し、不明点は推測で補いません。' : 'Checked through the WuWa v3.7 watchlist and v3.6 recap cycle on 2026-09-21. Skills, Echoes, and teams are shown only when verifiable data is available; missing fields are not guessed.'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <Section title={locale === 'zh' ? '基础属性 (Lv.90)' : locale === 'ja' ? '基礎ステータス (Lv.90)' : 'Base Stats (Lv.90)'}>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <StatCard label="HP" value={char.stats.hp} />
          <StatCard label="ATK" value={char.stats.atk} />
          <StatCard label="DEF" value={char.stats.def} />
          <StatCard label={locale === 'zh' ? '能量' : 'Energy'} value={char.stats.energy} />
          <StatCard label="CRIT Rate" value={`${(char.stats.critRate * 100).toFixed(1)}%`} />
          <StatCard label="CRIT DMG" value={`${(char.stats.critDmg * 100).toFixed(1)}%`} />
        </div>
      </Section>

      {/* Skills */}
      {skillItems.length > 0 && (
        <Section title={locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skills'}>
          <div className="space-y-3">
            {skillItems.map(({ key, label, fallbackName, skill }) => (
              <SkillItem
                key={key}
                name={localeStr(skill.name ?? fallbackName, skill.nameEn ?? fallbackName, locale)}
                desc={localeStr(skill.description, skill.descriptionEn, locale)}
                label={label}
                extra={skill.cooldown}
              />
            ))}
          </div>
        </Section>
      )}
      {skillItems.length === 0 && (
        <Section title={locale === 'zh' ? '技能数据状态' : locale === 'ja' ? 'スキルデータ状況' : 'Skill data status'}>
          <p className="text-sm leading-relaxed text-game-text-muted">
            {locale === 'zh' ? '该角色的逐项技能说明尚未完成核验。你可以先查看当前版本刷取路线、配队工具和强度参考，待官方或可核验数据补齐后再更新本页。' : locale === 'ja' ? 'このキャラの詳細スキルは検証中です。現在版本の周回、編成ツール、Tier参考を先に確認し、公式または検証可能なデータで更新します。' : 'Detailed skill text is still being verified for this character. Use the current farming route, team builder, and tier reference first; this page will be updated when official or verifiable data is available.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/wuwa/teams" className="text-game-primary hover:text-game-accent">{locale === 'zh' ? '打开配队工具 →' : locale === 'ja' ? '編成ツール →' : 'Open Team Builder →'}</Link>
            <Link href="/wuwa/tier-list" className="text-game-primary hover:text-game-accent">{locale === 'zh' ? '查看强度参考 →' : locale === 'ja' ? 'Tierリスト →' : 'Check Tier List →'}</Link>
            <Link href="/wuwa/guides/farming-route-guide" className="text-game-primary hover:text-accent">{locale === 'zh' ? '查看养成路线 →' : locale === 'ja' ? '育成ルート →' : 'Open Farming Route →'}</Link>
          </div>
        </Section>
      )}

      {/* Sequences */}
      {char.sequences && char.sequences.length > 0 && (
        <Section title={locale === 'zh' ? '共鸣链' : locale === 'ja' ? '共鳴鎖' : 'Resonance Chain'}>
          <div className="space-y-3">
            {char.sequences.map((seq) => (
              <details key={seq.level} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3">
                  <span className="mr-2 text-xs text-game-primary">[S{seq.level}]</span>
                  <span className="font-medium text-game-text group-hover:text-game-primary">{localeStr(seq.name, seq.nameEn, locale)}</span>
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {localeStr(seq.description, seq.descriptionEn, locale)}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Minor Fortes */}
      {char.minorFortes && char.minorFortes.length > 0 && (
        <Section title={locale === 'zh' ? '固有技能加成' : locale === 'ja' ? '固有スキルボーナス' : 'Minor Fortes'}>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {char.minorFortes.map((forte, i) => (
              <div key={i} className="rounded-lg border border-game-border bg-game-surface p-3">
                <span className="text-sm font-semibold text-game-text">{forte.stat}</span>
                <span className="ml-2 text-sm text-game-primary">{forte.value}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <NextStepSection locale={locale} gameId="wuwa" />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/characters" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回角色列表' : locale === 'ja' ? '← キャラ一覧に戻る' : '← Back to Characters'}
        </Link>
      </div>
    </div>
  );
}

export function WuWaCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getWuWaCharacterById(id);
  if (!char) notFound();
  return <WuWaCharacterDetail char={char} locale={locale} />;
}
